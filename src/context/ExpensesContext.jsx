import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MOCK_EXPENSES, MOCK_MONTH_CONFIG, DEFAULT_PROFILES, DEFAULT_CHILDREN } from '../data/mockData';
import { calculateSettlement } from '../utils/calculator';
import { monthKey, monthLabel, uid } from '../utils/formatters';

const STORAGE_KEY = 'cuentas-claras:v2';
const ExpensesContext = createContext(null);

const DEFAULT_STATE = {
  expenses: MOCK_EXPENSES,
  monthConfig: MOCK_MONTH_CONFIG,
  profiles: DEFAULT_PROFILES,
  children: DEFAULT_CHILDREN,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    /* sin storage disponible: usamos los datos de prueba */
  }
  return DEFAULT_STATE;
}

export function ExpensesProvider({ children: node }) {
  const [state, setState] = useState(loadState);
  // Arranca en el mes actual (Octubre 2026 en los datos de prueba).
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignorar */
    }
  }, [state]);

  const key = monthKey(current.year, current.month);
  const config = state.monthConfig[key] ?? { fatherPct: 50, settled: false, settledAt: null };

  const monthExpenses = useMemo(
    () =>
      state.expenses
        .filter((e) => e.date.startsWith(key))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses, key],
  );

  const settlement = useMemo(
    () => calculateSettlement(monthExpenses, config.fatherPct),
    [monthExpenses, config.fatherPct],
  );

  const updateMonthConfig = useCallback(
    (patch) =>
      setState((s) => ({
        ...s,
        monthConfig: {
          ...s.monthConfig,
          [key]: { fatherPct: 50, settled: false, settledAt: null, ...s.monthConfig[key], ...patch },
        },
      })),
    [key],
  );

  const value = {
    // estado
    expenses: state.expenses,
    monthExpenses,
    profiles: state.profiles,
    childrenList: state.children,
    current,
    key,
    label: monthLabel(current.year, current.month),
    config,
    settlement,

    // navegación de mes
    shiftMonth: (delta) =>
      setCurrent(({ year, month }) => {
        const d = new Date(year, month + delta, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),
    setMonth: (year, month) => setCurrent({ year, month }),

    // configuración
    setFatherPct: (pct) => updateMonthConfig({ fatherPct: pct }),
    toggleSettled: () =>
      updateMonthConfig({
        settled: !config.settled,
        settledAt: config.settled ? null : new Date().toISOString().slice(0, 10),
      }),
    setProfiles: (profiles) => setState((s) => ({ ...s, profiles })),
    setChildrenList: (list) => setState((s) => ({ ...s, children: list })),

    // CRUD de gastos
    addExpense: (expense) =>
      setState((s) => ({ ...s, expenses: [...s.expenses, { ...expense, id: uid() }] })),
    updateExpense: (id, patch) =>
      setState((s) => ({ ...s, expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    deleteExpense: (id) =>
      setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) })),

    resetDemo: () => setState(DEFAULT_STATE),
  };

  return <ExpensesContext.Provider value={value}>{node}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses debe usarse dentro de <ExpensesProvider>');
  return ctx;
}
