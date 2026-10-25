import { calculateSettlement, countable, round2 } from './calculator';
import { categoryBreakdown, childBreakdown } from './analytics';
import { MONTHS, monthKey } from './formatters';

/** Presets de acceso rápido. `months` = cuántos meses calendario incluye (contando el actual). */
export const PRESETS = [
  { id: 'mes', label: 'Este mes', months: 1 },
  { id: '3m', label: '3 meses', months: 3 },
  { id: '6m', label: '6 meses', months: 6 },
  { id: '12m', label: '12 meses', months: 12 },
  { id: 'anio', label: 'Este año' },
  { id: 'custom', label: 'Personalizado' },
];
export const DEFAULT_PRESET = '6m';
export const MAX_MONTHS = 24;

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Rango { desde, hasta } (fechas "AAAA-MM-DD", ambas inclusive) de un preset, terminando hoy. */
export function presetRange(id, today = new Date()) {
  const hasta = iso(today);
  if (id === 'anio') return { desde: `${today.getFullYear()}-01-01`, hasta };
  const months = PRESETS.find((p) => p.id === id)?.months ?? 6;
  return { desde: iso(new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)), hasta };
}

/** Meses ("AAAA-MM") que toca el rango, del más viejo al más nuevo. */
export function monthsBetween(desde, hasta) {
  const out = [];
  let y = Number(desde.slice(0, 4));
  let m = Number(desde.slice(5, 7)) - 1;
  const end = hasta.slice(0, 7);
  for (let k = monthKey(y, m); k <= end; k = monthKey(y, m)) {
    out.push(k);
    m += 1;
    if (m === 12) [y, m] = [y + 1, 0];
  }
  return out;
}

/** Valida un rango personalizado. Devuelve un mensaje de error o null. */
export function rangeError(desde, hasta) {
  if (!desde || !hasta) return 'Elegí las dos fechas';
  if (desde > hasta) return 'La fecha de inicio tiene que ser anterior a la de fin';
  if (monthsBetween(desde, hasta).length > MAX_MONTHS) return `Elegí un rango de hasta ${MAX_MONTHS} meses`;
  return null;
}

const SHORT = MONTHS.map((m) => m.slice(0, 3).toLowerCase());
/** "2026-05-01" + "2026-10-25" → "1 may – 25 oct"; agrega el año si no es el actual o si cambia. */
export function rangeLabel(desde, hasta, today = new Date()) {
  const part = (d, withYear) => `${Number(d.slice(8, 10))} ${SHORT[Number(d.slice(5, 7)) - 1]}${withYear ? ` ${d.slice(0, 4)}` : ''}`;
  const sameYear = desde.slice(0, 4) === hasta.slice(0, 4);
  const thisYear = sameYear && hasta.slice(0, 4) === String(today.getFullYear());
  if (desde === hasta) return part(desde, !thisYear);
  return `${part(desde, !sameYear)} – ${part(hasta, !thisYear)}`;
}

/**
 * Todo lo que muestra la pantalla de Análisis para un rango de fechas.
 * El balance se calcula mes por mes, con el reparto de cada mes (igual que la pantalla Balance),
 * y los gastos observados no cuentan. "Pendiente" deja afuera los meses ya saldados.
 *
 * @param {object[]} expenses todos los gastos de la familia
 * @param {{ desde: string, hasta: string }} range
 * @param {(key: string) => { fatherPct: number, settled: boolean }} configFor
 * @param {string[]} childrenList
 */
export function periodReport(expenses, { desde, hasta }, configFor, childrenList = []) {
  const inRange = expenses.filter((e) => e.date >= desde && e.date <= hasta);
  const valid = countable(inRange);
  const observed = inRange.filter((e) => e.reviewStatus === 'observado');

  const byMonth = {};
  valid.forEach((e) => (byMonth[e.date.slice(0, 7)] ??= []).push(e));

  let balancePadre = 0;
  let pendientePadre = 0;
  let quotaPadre = 0;
  const mesesSaldados = [];
  const porMes = monthsBetween(desde, hasta).map((key) => {
    const xs = byMonth[key] ?? [];
    const cfg = configFor(key);
    const s = calculateSettlement(xs, cfg.fatherPct);
    if (xs.length) {
      balancePadre += s.balanceFather;
      quotaPadre += s.quotaFather;
      if (cfg.settled) mesesSaldados.push(key);
      else pendientePadre += s.balanceFather;
    }
    const m = Number(key.slice(5, 7)) - 1;
    return {
      key,
      short: SHORT[m],
      label: `${MONTHS[m]} ${key.slice(0, 4)}`,
      padre: s.paidFather,
      madre: s.paidMother,
      total: s.total,
      saldado: Boolean(cfg.settled && xs.length),
    };
  });

  const total = round2(porMes.reduce((a, m) => a + m.total, 0));
  const padre = round2(porMes.reduce((a, m) => a + m.padre, 0));
  const madre = round2(total - padre);
  balancePadre = round2(balancePadre);
  pendientePadre = round2(pendientePadre);
  const monthsWithData = porMes.filter((m) => m.total > 0).length;

  return {
    desde,
    hasta,
    total,
    pagado: { padre, madre },
    // Parte acordada del padre en el período (promedio ponderado de los repartos de cada mes).
    acordadoPadre: total > 0 ? (quotaPadre / total) * 100 : configFor(hasta.slice(0, 7)).fatherPct,
    balancePadre, // > 0: el padre puso de más; < 0: la madre
    pendientePadre, // lo mismo, sin contar los meses ya saldados
    mesesSaldados,
    promedioMensual: monthsWithData ? round2(total / monthsWithData) : 0,
    observados: { count: observed.length, total: round2(observed.reduce((a, e) => a + Number(e.amount || 0), 0)) },
    porMes,
    porCategoria: categoryBreakdown(valid),
    porHijo: childBreakdown(valid, childrenList),
    // Para la lista: todos los del rango (los observados también, marcados), del más nuevo al más viejo.
    gastos: [...inRange].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
  };
}
