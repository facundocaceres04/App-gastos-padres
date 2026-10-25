export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** 50000 → "$50.000" */
export const formatMoney = (n) => `$${number.format(Number(n) || 0)}`;

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
