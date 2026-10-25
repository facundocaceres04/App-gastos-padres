import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { calculateSettlement } from '../utils/calculator';
import { monthKey, monthLabel, uid } from '../utils/formatters';

const ExpensesContext = createContext(null);
const DEFAULT_CONFIG = { fatherPct: 50, settled: false, settledAt: null };

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

/**
 * Estado compartido de la familia, sincronizado con Supabase.
 * Las escrituras se aplican al instante en pantalla y se confirman contra la base;
 * los cambios del otro progenitor llegan por Realtime.
 */
export function ExpensesProvider({ householdId, myRole, userId, children: node }) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthConfig, setMonthConfig] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const reload = useCallback(async () => {
    const [h, m, e, c] = await Promise.all([
      supabase.from('households').select('*').eq('id', householdId).single(),
      supabase.from('household_members').select('user_id, role').eq('household_id', householdId),
      supabase.from('expenses').select('*').eq('household_id', householdId).order('date', { ascending: false }),
      supabase.from('month_configs').select('*').eq('household_id', householdId),
    ]);
    const failed = [h, m, e, c].find((r) => r.error);
    if (failed) {
      setError(friendlyError(failed.error));
      return;
    }
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
    const filter = `household_id=eq.${householdId}`;
    const channel = supabase
      .channel(`household-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'month_configs', filter }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter }, schedule)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` }, schedule)
      .subscribe();
    // Al volver a la pestaña, refrescamos por si se perdió algún evento.
    const onFocus = () => document.visibilityState === 'visible' && schedule();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearTimeout(timer.current);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [householdId, reload]);

  /** Ejecuta una escritura; si falla, muestra el error y vuelve al estado del servidor. */
  const commit = useCallback(
    async (request) => {
      const { error: err } = await request;
      if (err) {
        setError(friendlyError(err));
        reload();
      }
    },
    [reload],
  );

  const key = monthKey(current.year, current.month);
  const config = monthConfig[key] ?? DEFAULT_CONFIG;

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

  const saveMonthConfig = (patch) => {
    const next = { ...config, ...patch };
    setMonthConfig((m) => ({ ...m, [key]: next }));
    commit(
      supabase.from('month_configs').upsert({
        household_id: householdId,
        month_key: key,
        father_pct: next.fatherPct,
        settled: next.settled,
        settled_at: next.settledAt,
      }),
    );
  };

  const value = {
    loaded,
    error,
    clearError: () => setError(null),

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
    settlement,
    shiftMonth: (delta) =>
      setCurrent(({ year, month }) => {
        const d = new Date(year, month + delta, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),

    // configuración
    setFatherPct: (pct) => saveMonthConfig({ fatherPct: pct }),
    toggleSettled: () =>
      saveMonthConfig({
        settled: !config.settled,
        settledAt: config.settled ? null : new Date().toISOString().slice(0, 10),
      }),
    setProfiles: (p) => {
      const patch = { padre_name: p.padre.name, padre_alias: p.padre.alias, madre_name: p.madre.name, madre_alias: p.madre.alias };
      setHousehold((h) => ({ ...h, ...patch }));
      commit(supabase.from('households').update(patch).eq('id', householdId));
    },
    setChildrenList: (list) => {
      setHousehold((h) => ({ ...h, children: list }));
      commit(supabase.from('households').update({ children: list }).eq('id', householdId));
    },

    // CRUD de gastos
    addExpense: (expense) => {
      const id = uid();
      setExpenses((xs) => [{ ...expense, id }, ...xs]);
      commit(supabase.from('expenses').insert({ id, household_id: householdId, created_by: userId, ...toExpenseRow(expense) }));
    },
    updateExpense: (id, patch) => {
      setExpenses((xs) => xs.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      commit(supabase.from('expenses').update(toExpenseRow(patch)).eq('id', id));
    },
    deleteExpense: (id) => {
      setExpenses((xs) => xs.filter((e) => e.id !== id));
      commit(supabase.from('expenses').delete().eq('id', id));
    },
  };

  return <ExpensesContext.Provider value={value}>{node}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses debe usarse dentro de <ExpensesProvider>');
  return ctx;
}
