import { MONTHS, formatMoney } from './formatters';
import { getCategory } from '../data/categories';

const monthName = (key) => (key ? `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}` : '');
const shortDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

const FIELD_LABELS = {
  concept: 'concepto',
  amount: 'monto',
  paid_by: 'quién pagó',
  date: 'fecha',
  child: 'hijo/a',
  category: 'categoría',
};

/**
 * Convierte una fila de `activity` en un texto legible.
 * @param {{ kind: string, actor: string|null, data: object }} entry
 * @param {{ nameOf: (userId: string|null) => string, profiles: object }} ctx
 * @returns {{ text: string, detail?: string, tone: 'add'|'edit'|'delete'|'settle'|'info' }}
 */
export function describeActivity(entry, { nameOf, profiles }) {
  const who = nameOf(entry.actor);
  const d = entry.data ?? {};
  const payer = (role) => profiles[role]?.name ?? role;

  switch (entry.kind) {
    case 'expense_added':
      return {
        tone: 'add',
        text: `${who} agregó ${d.concept}`,
        detail: `${formatMoney(d.amount)} · pagó ${payer(d.paid_by)} · ${shortDate(d.date)}${d.receipt ? ' · con comprobante' : ''}`,
      };
    case 'expense_deleted':
      return { tone: 'delete', text: `${who} borró ${d.concept}`, detail: `${formatMoney(d.amount)} · ${shortDate(d.date)}` };
    case 'expense_updated': {
      const changes = d.changes ?? {};
      const parts = Object.entries(changes).map(([field, [from, to]]) => {
        if (field === 'amount') return `monto ${formatMoney(from)} → ${formatMoney(to)}`;
        if (field === 'paid_by') return `pagó ${payer(from)} → ${payer(to)}`;
        if (field === 'date') return `fecha ${shortDate(from)} → ${shortDate(to)}`;
        if (field === 'category') return `categoría ${getCategory(from).label} → ${getCategory(to).label}`;
        if (field === 'child') return `hijo/a ${from || 'sin asignar'} → ${to || 'sin asignar'}`;
        if (field === 'receipt') return to ? (from ? 'reemplazó el comprobante' : 'adjuntó comprobante') : 'quitó el comprobante';
        return `${FIELD_LABELS[field] ?? field}: "${from}" → "${to}"`;
      });
      return { tone: 'edit', text: `${who} editó ${d.concept}`, detail: parts.join(' · ') };
    }
    case 'expense_reviewed':
      if (d.status === 'aceptado') return { tone: 'settle', text: `${who} aceptó ${d.concept}`, detail: formatMoney(d.amount) };
      if (d.status === 'observado') return { tone: 'edit', text: `${who} observó ${d.concept}`, detail: d.note ? `“${d.note}”` : undefined };
      return { tone: 'info', text: `${who} deshizo la revisión de ${d.concept}` };
    case 'split_changed':
      return {
        tone: 'info',
        text: `${who} cambió el acuerdo de ${monthName(d.month)}`,
        detail: d.from == null ? `${d.to} / ${100 - d.to}` : `${d.from} / ${100 - d.from} → ${d.to} / ${100 - d.to}`,
      };
    case 'month_settled':
      return { tone: 'settle', text: `${who} marcó ${monthName(d.month)} como saldado` };
    case 'month_reopened':
      return { tone: 'info', text: `${who} reabrió ${monthName(d.month)}` };
    case 'family_updated': {
      const f = d.fields ?? [];
      const what = [];
      if (f.some((x) => x.endsWith('_alias'))) what.push('el CBU/Alias');
      if (f.some((x) => x.endsWith('_name'))) what.push('un nombre');
      if (f.includes('children')) what.push('los hijos');
      return { tone: 'info', text: `${who} actualizó ${what.join(' y ') || 'los datos de la familia'}` };
    }
    case 'member_joined':
      return { tone: 'info', text: `${who} se sumó a la familia` };
    // Quien salió o fue quitado ya no es integrante: se lo nombra por su rol.
    case 'member_left':
      return { tone: 'delete', text: `${payer(d.role)} salió de la familia` };
    case 'member_removed':
      return { tone: 'delete', text: `${who} quitó a ${payer(d.role)} de la familia`, detail: 'Se generó un código de invitación nuevo' };
    default:
      return { tone: 'info', text: `${who} hizo un cambio` };
  }
}

/** "recién", "hace 5 min", "hace 3 h", "ayer 14:20", "12/10 09:05". */
export function relativeTime(iso, now = new Date()) {
  const t = new Date(iso);
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hhmm = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = t.toDateString() === now.toDateString();
  if (sameDay) return `hace ${Math.floor(mins / 60)} h`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (t.toDateString() === yesterday.toDateString()) return `ayer ${hhmm}`;
  return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')} ${hhmm}`;
}
