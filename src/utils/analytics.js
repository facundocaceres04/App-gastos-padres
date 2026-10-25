import { sumPaidBy, totalsByCategory } from './calculator';
import { MONTHS, monthKey } from './formatters';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const inMonth = (expenses, key) => expenses.filter((e) => e.date.startsWith(key));

/**
 * Serie de los últimos `n` meses que terminan en (year, month), del más viejo al más nuevo.
 * @returns {{ key: string, short: string, label: string, padre: number, madre: number, total: number }[]}
 */
export function monthlySeries(expenses, year, month, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(year, month - (n - 1 - i), 1);
    const key = monthKey(d.getFullYear(), d.getMonth());
    const xs = inMonth(expenses, key);
    const padre = sumPaidBy(xs, 'padre');
    const madre = sumPaidBy(xs, 'madre');
    return {
      key,
      short: MONTHS[d.getMonth()].slice(0, 3),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      padre,
      madre,
      total: round2(padre + madre),
    };
  });
}

/** Variación porcentual contra el mes anterior (null si el anterior es 0). */
export function changeVsPrevious(series) {
  const cur = series[series.length - 1]?.total ?? 0;
  const prev = series[series.length - 2]?.total ?? 0;
  return prev > 0 ? ((cur - prev) / prev) * 100 : null;
}

/** Promedio mensual de los meses con gastos dentro de la serie. */
export function monthlyAverage(series) {
  const withData = series.filter((m) => m.total > 0);
  return withData.length ? round2(withData.reduce((a, m) => a + m.total, 0) / withData.length) : 0;
}

/** Acumulado del año hasta el mes (inclusive). */
export function yearToDate(expenses, year, month) {
  const upTo = monthKey(year, month);
  return round2(
    expenses
      .filter((e) => e.date.startsWith(`${year}-`) && e.date.slice(0, 7) <= upTo)
      .reduce((a, e) => a + Number(e.amount || 0), 0),
  );
}

/** Totales por categoría como lista ordenada de mayor a menor. */
export function categoryBreakdown(monthExpenses) {
  const total = monthExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  return Object.entries(totalsByCategory(monthExpenses))
    .map(([id, amount]) => ({ id, amount, pct: total ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Totales por hijo/a ("Sin asignar" para los gastos sin hijo). */
export function childBreakdown(monthExpenses, childrenList) {
  const totals = {};
  monthExpenses.forEach((e) => {
    const k = e.child || 'Sin asignar';
    totals[k] = round2((totals[k] ?? 0) + Number(e.amount || 0));
  });
  const order = [...childrenList, 'Ambos', 'Sin asignar'];
  return Object.entries(totals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => {
      const ia = order.indexOf(a.name);
      const ib = order.indexOf(b.name);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

/** Formato compacto para ejes: 1.250.000 → "1,3M", 85.000 → "85K". */
export function compactMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

/** Ticks "redondos" para un eje de 0 a max (3-5 ticks). */
export function niceTicks(max) {
  if (max <= 0) return [0];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}
