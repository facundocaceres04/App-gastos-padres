export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const whole = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 50000 → "$50.000"; con centavos siempre dos decimales: 112850.5 → "$112.850,50". */
export const formatMoney = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `$${(Number.isInteger(v) ? whole : cents).format(v)}`;
};

/** "2026-10" a partir de año y mes (0-11). */
export const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

export const monthLabel = (year, month) => `${MONTHS[month]} ${year}`;

/** "2026-10-05" → "05/10" */
export const formatShortDate = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

/** "2026-10-05" → "dom 5 oct" */
export const formatLongDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => toISO(new Date());

/** Encabezado de grupo del feed: "Hoy", "Ayer" o "10 de octubre". */
export const groupLabel = (iso) => {
  const now = new Date();
  if (iso === toISO(now)) return 'Hoy';
  if (iso === toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Ayer';
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} de ${MONTHS[m - 1].toLowerCase()}`;
};

export const initial = (name) => (name?.trim()[0] ?? '?').toUpperCase();

/** UUID v4 (la base de datos espera ids uuid). */
export const uid = () =>
  crypto.randomUUID?.() ??
  '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
  );

export const MAX_AMOUNT = 1_000_000_000;

/**
 * Interpreta montos escritos como en Argentina: "1.500" → 1500, "1.500,50" → 1500.5,
 * "35000" → 35000, "0,5" → 0.5. También acepta "1500.50". Devuelve null si no es válido.
 */
export function parseAmount(input) {
  let s = String(input ?? '').trim().replace(/[$\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.'); // coma decimal: los puntos son de miles
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // solo puntos de miles
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= MAX_AMOUNT ? n : null;
}

/** 1500.5 → "1500,5" (para mostrar un monto en un campo editable). */
/** Monto guardado → texto del campo, como se escribe en Argentina: 27800 → "27.800", 1500.5 → "1.500,50". */
export const amountToInput = (n) => (n == null ? '' : formatMoney(n).slice(1));

/** "Mateo, Sofía" → { list: ['Mateo', 'Sofía'] } o { error } si no respeta los límites de la base. */
export function parseChildren(text) {
  const list = text.split(',').map((k) => k.trim()).filter(Boolean);
  if (list.length > 10) return { error: 'Se pueden cargar hasta 10 hijos/as' };
  if (list.some((k) => k.length > 40)) return { error: 'Cada nombre puede tener hasta 40 letras' };
  return { list };
}

/** Montos grandes en palabras cortas, para datos secundarios: 3342602 → "$3,3 M", 835650 → "$836 mil". */
export function compactMoneyLong(n) {
  const v = Math.round(Number(n) || 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 10_000) return `$${Math.round(v / 1000).toLocaleString('es-AR')} mil`;
  return formatMoney(v);
}
