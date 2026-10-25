import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { calculateSettlement } from '../utils/calculator';
import { monthKey, monthLabel, todayISO, uid } from '../utils/formatters';

const ExpensesContext = createContext(null);
const PAGE = 1000; // límite por request de Supabase

// ─── Mapeo entre filas de la base y el modelo de la app ──────────────────────
const fromExpenseRow = (r) => ({
  id: r.id,
  concept: r.concept,
  amount: Number(r.amount),
  paidBy: r.paid_by,
  child: r.child ?? '',
  category: r.category,
  date: r.date,
});
const toExpenseRow = (e) => ({
  concept: e.concept,
  amount: e.amount,
  paid_by: e.paidBy,
  child: e.child ?? '',
  category: e.category,
  date: e.date,
});
const fromConfigRow = (r) => ({ fatherPct: r.father_pct, settled: r.settled, settledAt: r.settled_at });
const CONFIG_COLUMNS = { fatherPct: 'father_pct', settled: 'settled', settledAt: 'settled_at' };

/** Trae todos los gastos de la familia, paginando de a 1000. */
async function fetchAllExpenses(householdId) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) return { error };
    rows.push(...data);
    if (data.length < PAGE) return { data: rows };
  }
}

/**
 * Estado compartido de la familia, sincronizado con Supabase.
 * Las escrituras se aplican al instante en pantalla; si la base las rechaza (o no hay conexión)
 * se revierten y la función devuelve el mensaje de error. Los cambios del otro llegan por Realtime.
 */
export function ExpensesProvider({ householdId, myRole, userId, children: node }) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthConfig, setMonthConfig] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Cada recarga lleva un número; si llega una respuesta vieja después de una nueva, se descarta.
  // Además, una recarga que empezó antes de (o durante) una escritura propia traería datos viejos
  // y "reviviría" por un instante un gasto recién borrado: también se descarta y se reprograma.
  const reqId = useRef(0);
  const writes = useRef({ pending: 0, version: 0 });
  const scheduleRef = useRef(() => {});
  const reload = useCallback(async () => {
    const seq = ++reqId.current;
    const writeVersion = writes.current.version;
    const [h, m, e, c] = await Promise.all([
      supabase.from('households').select('*').eq('id', householdId).single(),
      supabase.from('household_members').select('user_id, role').eq('household_id', householdId),
      fetchAllExpenses(householdId),
      supabase.from('month_configs').select('*').eq('household_id', householdId),
    ]);
    if (seq !== reqId.current) return;
    if (writes.current.pending > 0 || writes.current.version !== writeVersion) {
      scheduleRef.current();
      return;
    }
    const failed = [h, m, e, c].find((r) => r.error);
    if (failed) {
      setLoadError(friendlyError(failed.error));
      return;
    }
    setLoadError(null);
    setHousehold(h.data);
    setMembers(m.data);
    setExpenses(e.data.map(fromExpenseRow));
    setMonthConfig(Object.fromEntries(c.data.map((r) => [r.month_key, fromConfigRow(r)])));
    setLoaded(true);
  }, [householdId]);

  // Carga inicial + suscripción en tiempo real (recarga con debounce ante cualquier cambio).
  const timer = useRef(null);
  useEffect(() => {
    reload();
    const schedule = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(reload, 250);
    };
    scheduleRef.current = schedule;
    const filter = `household_id=eq.${householdId}`;
    // Topic único por montaje: evita reutilizar un canal que se está cerrando (StrictMode).
    const channel = supabase
      .channel(`household-${householdId}-${uid()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'month_configs', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter }, schedule)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` }, schedule)
      .subscribe((status) => {
        // Al (re)conectarse recargamos por si se perdieron eventos mientras no había conexión.
        if (status === 'SUBSCRIBED') schedule();
      });
    const onFocus = () => document.visibilityState === 'visible' && schedule();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', schedule);
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', schedule);
    };
  }, [householdId, reload]);

  /**
   * Ejecuta una escritura. Si falla, deshace el cambio optimista con `rollback`
   * y devuelve el mensaje de error (o null si salió bien).
   */
  const commit = useCallback(
    async (request, rollback) => {
      writes.current.pending++;
      writes.current.version++;
      let err;
      try {
        ({ error: err } = await request);
      } catch (e) {
        err = e;
      } finally {
        writes.current.pending--;
        writes.current.version++;
      }
      if (!err) {
        scheduleRef.current(); // confirma contra el servidor (por si Realtime se demora)
        return null;
      }
      rollback?.();
      const msg = friendlyError(err);
      setError(msg);
      reload();
      return msg;
    },
    [reload],
  );

  const key = monthKey(current.year, current.month);

  /**
   * Configuración de un mes. Si el mes todavía no tiene una propia, hereda el porcentaje
   * del último mes anterior configurado (un acuerdo 60/40 no vuelve solo a 50/50).
   */
  const configFor = useCallback(
    (k) => {
      if (monthConfig[k]) return { ...monthConfig[k], inheritedFrom: null };
      const prev = Object.keys(monthConfig)
        .filter((m) => m < k)
        .sort()
        .pop();
      return { fatherPct: prev ? monthConfig[prev].fatherPct : 50, settled: false, settledAt: null, inheritedFrom: prev ?? null };
    },
    [monthConfig],
  );
  const config = configFor(key);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(key)).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, key],
  );
  const settlement = useMemo(() => calculateSettlement(monthExpenses, config.fatherPct), [monthExpenses, config.fatherPct]);

  const profiles = useMemo(
    () => ({
      padre: { name: household?.padre_name ?? 'Padre', alias: household?.padre_alias ?? '' },
      madre: { name: household?.madre_name ?? 'Madre', alias: household?.madre_alias ?? '' },
    }),
    [household],
  );

  /** Guarda solo las columnas que cambiaron, para no pisar un cambio simultáneo del otro. */
  const saveMonthConfig = (patch) => {
    const prevConfigs = monthConfig;
    const exists = Boolean(monthConfig[key]);
    const next = { ...config, ...patch };
    setMonthConfig((m) => ({ ...m, [key]: { fatherPct: next.fatherPct, settled: next.settled, settledAt: next.settledAt } }));
    const cols = Object.fromEntries(Object.entries(patch).map(([k, v]) => [CONFIG_COLUMNS[k], v]));
    const request = exists
      ? supabase.from('month_configs').update(cols).eq('household_id', householdId).eq('month_key', key)
      : supabase.from('month_configs').upsert({
          household_id: householdId,
          month_key: key,
          father_pct: next.fatherPct,
          settled: next.settled,
          settled_at: next.settledAt,
        });
    return commit(request, () => setMonthConfig(prevConfigs));
  };

  const clearError = useCallback(() => setError(null), []);

  const value = {
    loaded,
    loadError,
    reload,
    error,
    clearError,

    // familia
    householdId,
    inviteCode: household?.invite_code ?? '',
    myRole,
    otherRole: myRole === 'padre' ? 'madre' : 'padre',
    partnerJoined: members.length >= 2,
    profiles,
    childrenList: household?.children ?? [],

    // mes
    expenses,
    monthExpenses,
    current,
    key,
    label: monthLabel(current.year, current.month),
    config,
    configFor,
    settlement,
    shiftMonth: (delta) =>
      setCurrent(({ year, month }) => {
        const d = new Date(year, month + delta, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),

    // configuración (cada función devuelve null si se guardó, o el mensaje de error)
    setFatherPct: (pct) => saveMonthConfig({ fatherPct: pct }),
    toggleSettled: () => saveMonthConfig({ settled: !config.settled, settledAt: config.settled ? null : todayISO() }),
    setProfiles: (p) => {
      const prev = household;
      const patch = { padre_name: p.padre.name, padre_alias: p.padre.alias, madre_name: p.madre.name, madre_alias: p.madre.alias };
      setHousehold((h) => ({ ...h, ...patch }));
      return commit(supabase.from('households').update(patch).eq('id', householdId), () => setHousehold(prev));
    },
    setChildrenList: (list) => {
      const prev = household;
      setHousehold((h) => ({ ...h, children: list }));
      return commit(supabase.from('households').update({ children: list }).eq('id', householdId), () => setHousehold(prev));
    },

    // CRUD de gastos
    addExpense: (expense) => {
      const id = uid();
      setExpenses((xs) => [{ ...expense, id }, ...xs]);
      return commit(
        supabase.from('expenses').insert({ id, household_id: householdId, created_by: userId, ...toExpenseRow(expense) }),
        () => setExpenses((xs) => xs.filter((e) => e.id !== id)),
      );
    },
    updateExpense: (id, patch) => {
      const before = expenses.find((e) => e.id === id);
      setExpenses((xs) => xs.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      return commit(supabase.from('expenses').update(toExpenseRow(patch)).eq('id', id), () =>
        setExpenses((xs) => xs.map((e) => (e.id === id ? before : e))),
      );
    },
    deleteExpense: (id) => {
      const before = expenses.find((e) => e.id === id);
      setExpenses((xs) => xs.filter((e) => e.id !== id));
      return commit(supabase.from('expenses').delete().eq('id', id), () => setExpenses((xs) => [before, ...xs]));
    },
  };

  return <ExpensesContext.Provider value={value}>{node}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses debe usarse dentro de <ExpensesProvider>');
  return ctx;
}
