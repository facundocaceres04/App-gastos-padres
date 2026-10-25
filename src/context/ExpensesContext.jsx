import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { calculateSettlement, countable, pendingFromPreviousMonths } from '../utils/calculator';
import { prepareReceipt } from '../utils/image';
import { monthKey, monthLabel, todayISO, uid } from '../utils/formatters';

const ExpensesContext = createContext(null);
const PAGE = 1000; // límite por request de Supabase
const RECEIPTS = 'comprobantes'; // bucket privado de Supabase Storage
const UNDO_MS = 6000; // tiempo para deshacer un borrado antes de enviarlo a la base
const ACTIVITY_LIMIT = 80;

// ─── Mapeo entre filas de la base y el modelo de la app ──────────────────────
const fromExpenseRow = (r) => ({
  id: r.id,
  concept: r.concept,
  amount: Number(r.amount),
  paidBy: r.paid_by,
  child: r.child ?? '',
  category: r.category,
  date: r.date,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedBy: r.updated_by,
  updatedAt: r.updated_at,
  receiptPath: r.receipt_path,
  reviewStatus: r.review_status,
  reviewNote: r.review_note,
  reviewedBy: r.reviewed_by,
  reviewedAt: r.reviewed_at,
});
const toExpenseRow = (e) => ({
  concept: e.concept,
  amount: e.amount,
  paid_by: e.paidBy,
  child: e.child ?? '',
  category: e.category,
  date: e.date,
  ...(e.receiptPath !== undefined && { receipt_path: e.receiptPath }),
});
const fromConfigRow = (r) => ({
  fatherPct: r.father_pct,
  settled: r.settled,
  settledAt: r.settled_at,
  settledBy: r.settled_by,
  updatedBy: r.updated_by,
  updatedAt: r.updated_at,
});
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
export function ExpensesProvider({ householdId, myRole, userId, onMembershipLost, children: node }) {
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthConfig, setMonthConfig] = useState({});
  const [activity, setActivity] = useState([]);
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
  // Borrados en espera (para poder deshacer): id → { timer, expense }
  const pendingDeletes = useRef(new Map());
  // Quienes quieren enterarse de la actividad del otro (toasts)
  const activityListeners = useRef(new Set());
  const lostRef = useRef(onMembershipLost);
  lostRef.current = onMembershipLost;
  const reload = useCallback(async () => {
    const seq = ++reqId.current;
    const writeVersion = writes.current.version;
    const [h, m, e, c, a] = await Promise.all([
      supabase.from('households').select('*').eq('id', householdId).single(),
      supabase.from('household_members').select('user_id, role').eq('household_id', householdId),
      fetchAllExpenses(householdId),
      supabase.from('month_configs').select('*').eq('household_id', householdId),
      supabase.from('activity').select('*').eq('household_id', householdId).order('id', { ascending: false }).limit(ACTIVITY_LIMIT),
    ]);
    if (seq !== reqId.current) return;
    // Ya no sos parte de la familia (saliste desde otro dispositivo o el otro te quitó).
    if (h.error?.code === 'PGRST116' || (m.data && !m.data.some((x) => x.user_id === userId))) {
      lostRef.current?.();
      return;
    }
    if (writes.current.pending > 0 || writes.current.version !== writeVersion) {
      scheduleRef.current();
      return;
    }
    const failed = [h, m, e, c, a].find((r) => r.error);
    if (failed) {
      setLoadError(friendlyError(failed.error));
      return;
    }
    setLoadError(null);
    setHousehold(h.data);
    setMembers(m.data);
    setExpenses(e.data.filter((x) => !pendingDeletes.current.has(x.id)).map(fromExpenseRow));
    setMonthConfig(Object.fromEntries(c.data.map((r) => [r.month_key, fromConfigRow(r)])));
    setActivity(a.data);
    setLoaded(true);
  }, [householdId, userId]);

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity', filter }, ({ new: entry }) => {
        setActivity((xs) => (xs.some((x) => x.id === entry.id) ? xs : [entry, ...xs].slice(0, ACTIVITY_LIMIT)));
        if (entry.actor !== userId) activityListeners.current.forEach((fn) => fn(entry));
      })
      .subscribe((status) => {
        // Al (re)conectarse recargamos por si se perdieron eventos mientras no había conexión.
        if (status === 'SUBSCRIBED') schedule();
      });
    const onFocus = () => document.visibilityState === 'visible' && schedule();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', schedule);
    // Si se cierra la pestaña con un borrado pendiente, se envía en ese momento.
    const flushDeletes = () => pendingDeletes.current.forEach((_, id) => flushDeleteRef.current(id));
    window.addEventListener('pagehide', flushDeletes);
    return () => {
      clearTimeout(timer.current);
      flushDeletes(); // p. ej. al cerrar sesión con un borrado pendiente
      window.removeEventListener('pagehide', flushDeletes);
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', schedule);
    };
  }, [householdId, reload, userId]);

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
  // Los gastos observados no cuentan para el balance hasta que se resuelvan.
  const settlement = useMemo(() => calculateSettlement(countable(monthExpenses), config.fatherPct), [monthExpenses, config.fatherPct]);
  const observed = useMemo(() => monthExpenses.filter((e) => e.reviewStatus === 'observado'), [monthExpenses]);
  const previousPending = useMemo(() => pendingFromPreviousMonths(expenses, key, configFor), [expenses, key, configFor]);

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
    setMonthConfig((m) => ({
      ...m,
      [key]: { ...m[key], fatherPct: next.fatherPct, settled: next.settled, settledAt: next.settledAt, settledBy: next.settled ? userId : null },
    }));
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

  /** Nombre de un usuario de la familia (por su rol), o "Alguien" si ya no está. */
  const nameOf = useCallback(
    (uidOrNull) => {
      const member = members.find((m) => m.user_id === uidOrNull);
      return member ? profiles[member.role].name : 'Alguien';
    },
    [members, profiles],
  );

  /** Envía a la base un borrado que estaba esperando el "Deshacer". */
  const flushDeleteRef = useRef(() => {});
  flushDeleteRef.current = (id) => {
    const pending = pendingDeletes.current.get(id);
    if (!pending) return Promise.resolve(null);
    clearTimeout(pending.timer);
    pendingDeletes.current.delete(id);
    return commit(supabase.from('expenses').delete().eq('id', id), () => setExpenses((xs) => [pending.expense, ...xs])).then((err) => {
      if (!err && pending.expense.receiptPath) supabase.storage.from(RECEIPTS).remove([pending.expense.receiptPath]);
      return err;
    });
  };

  /** Sube un comprobante a <familia>/<gasto>/… y devuelve { path } o { error }. */
  const uploadReceipt = async (expenseId, file) => {
    try {
      const { blob, type, ext } = await prepareReceipt(file);
      const path = `${householdId}/${expenseId}/${uid()}.${ext}`;
      const { error: err } = await supabase.storage.from(RECEIPTS).upload(path, blob, { contentType: type });
      return err ? { error: friendlyError(err) } : { path };
    } catch (e) {
      return { error: e.message };
    }
  };

  const value = {
    loaded,
    loadError,
    reload,
    error,
    clearError,

    // familia
    householdId,
    userId,
    nameOf,
    activity,
    /** Suscribe a la actividad del otro progenitor (llega por Realtime). Devuelve cómo desuscribirse. */
    subscribeActivity: (fn) => {
      activityListeners.current.add(fn);
      return () => activityListeners.current.delete(fn);
    },
    inviteCode: household?.invite_code ?? '',
    /** Código nuevo: el anterior deja de servir. Devuelve un mensaje de error o null. */
    rotateInviteCode: async () => {
      const { data, error: err } = await supabase.rpc('rotate_invite_code');
      if (err) return friendlyError(err);
      setHousehold(data);
      return null;
    },
    /** Quita al otro integrante de la familia (los gastos quedan). */
    removePartner: async () => {
      const { error: err } = await supabase.rpc('remove_partner');
      if (err) return friendlyError(err);
      reload();
      return null;
    },
    /** Salir de la familia. Si sos el último integrante, se borra todo, comprobantes incluidos. */
    leaveHousehold: async () => {
      if (members.length <= 1) {
        const paths = expenses.map((e) => e.receiptPath).filter(Boolean);
        for (let i = 0; i < paths.length; i += 100) {
          const { error: err } = await supabase.storage.from(RECEIPTS).remove(paths.slice(i, i + 100));
          if (err) return `No se pudieron borrar los comprobantes: ${friendlyError(err)}`;
        }
      }
      const { error: err } = await supabase.rpc('leave_household');
      if (err) return friendlyError(err);
      lostRef.current?.();
      return null;
    },
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
    observed,
    previousPending,
    goToMonth: (k) => setCurrent({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)) - 1 }),
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

    // CRUD de gastos. `receipt`: { file } para adjuntar/reemplazar, { remove: true } para quitarlo.
    addExpense: async (expense, receipt) => {
      const id = uid();
      let receiptPath = null;
      if (receipt?.file) {
        const up = await uploadReceipt(id, receipt.file);
        if (up.error) return `No se pudo subir el comprobante: ${up.error}`;
        receiptPath = up.path;
      }
      const row = { ...expense, id, receiptPath, createdBy: userId, createdAt: new Date().toISOString(), reviewStatus: 'pendiente' };
      setExpenses((xs) => [row, ...xs]);
      const err = await commit(
        supabase.from('expenses').insert({ id, household_id: householdId, ...toExpenseRow({ ...expense, receiptPath }) }),
        () => setExpenses((xs) => xs.filter((e) => e.id !== id)),
      );
      if (err && receiptPath) supabase.storage.from(RECEIPTS).remove([receiptPath]);
      return err;
    },
    updateExpense: async (id, patch, receipt) => {
      const before = expenses.find((e) => e.id === id);
      let receiptPath = before?.receiptPath ?? null;
      if (receipt?.file) {
        const up = await uploadReceipt(id, receipt.file);
        if (up.error) return `No se pudo subir el comprobante: ${up.error}`;
        receiptPath = up.path;
      } else if (receipt?.remove) {
        receiptPath = null;
      }
      const full = { ...patch, receiptPath };
      setExpenses((xs) => xs.map((e) => (e.id === id ? { ...e, ...full, reviewStatus: 'pendiente', reviewNote: null } : e)));
      const err = await commit(supabase.from('expenses').update(toExpenseRow(full)).eq('id', id), () =>
        setExpenses((xs) => xs.map((e) => (e.id === id ? before : e))),
      );
      // Se borra el archivo que ya no se usa (el nuevo si falló; el viejo si se reemplazó o quitó).
      const orphan = err ? (receiptPath !== before?.receiptPath ? receiptPath : null) : receiptPath !== before?.receiptPath ? before?.receiptPath : null;
      if (orphan) supabase.storage.from(RECEIPTS).remove([orphan]);
      return err;
    },
    /** URL temporal (1 h) para ver un comprobante privado. */
    receiptUrl: async (path) => {
      const { data } = await supabase.storage.from(RECEIPTS).createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
    /** Aceptar u observar un gasto del otro progenitor. */
    reviewExpense: (id, status, note) => {
      const before = expenses.find((e) => e.id === id);
      setExpenses((xs) =>
        xs.map((e) =>
          e.id === id ? { ...e, reviewStatus: status, reviewNote: status === 'observado' ? note : null, reviewedBy: userId } : e,
        ),
      );
      return commit(supabase.rpc('review_expense', { p_id: id, p_status: status, p_note: note ?? null }), () =>
        setExpenses((xs) => xs.map((e) => (e.id === id ? before : e))),
      );
    },
    /**
     * Borra con posibilidad de deshacer: se oculta al instante y recién se envía a la base
     * después de unos segundos (o al cerrar la pestaña).
     */
    deleteExpense: (id) => {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return;
      setExpenses((xs) => xs.filter((e) => e.id !== id));
      const timer = setTimeout(() => flushDeleteRef.current(id), UNDO_MS);
      pendingDeletes.current.set(id, { timer, expense });
    },
    undoDelete: (id) => {
      const pending = pendingDeletes.current.get(id);
      if (!pending) return false;
      clearTimeout(pending.timer);
      pendingDeletes.current.delete(id);
      setExpenses((xs) => [pending.expense, ...xs]);
      return true;
    },
  };

  return <ExpensesContext.Provider value={value}>{node}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses debe usarse dentro de <ExpensesProvider>');
  return ctx;
}
