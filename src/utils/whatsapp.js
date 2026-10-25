import { MONTHS, formatMoney } from './formatters';
import { getCategory } from '../data/categories';
import { countable, totalsByCategory } from './calculator';

/**
 * Arma el resumen de liquidación en formato WhatsApp (*negrita*, _cursiva_).
 * @param {object} p
 * @param {string} p.monthLabel
 * @param {import('../types').Settlement} p.settlement
 * @param {import('../types').Expense[]} p.expenses
 * @param {{padre: import('../types').Profile, madre: import('../types').Profile}} p.profiles
 * @param {object} [p.previousPending] saldo de meses anteriores sin saldar (pendingFromPreviousMonths)
 */
export function buildWhatsAppSummary({ monthLabel, settlement: s, expenses, profiles, previousPending }) {
  const nameF = profiles.padre.name;
  const nameM = profiles.madre.name;
  const lines = [];
  const observed = expenses.filter((e) => e.reviewStatus === 'observado');

  lines.push(`🧾 *Cuentas Claras – ${monthLabel}*`);
  lines.push('');
  lines.push(`📊 *Reparto acordado:* ${nameF} ${s.pctFather}% / ${nameM} ${s.pctMother}%`);
  lines.push(`💰 *Total gastado:* ${formatMoney(s.total)} (${expenses.length - observed.length} gastos)`);
  if (observed.length) {
    lines.push(`👀 _${observed.length} gasto(s) observado(s) por ${formatMoney(observed.reduce((a, e) => a + e.amount, 0))} no cuentan hasta resolverse._`);
  }
  lines.push('');

  const byCat = totalsByCategory(countable(expenses));
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (catEntries.length) {
    lines.push('*Por categoría:*');
    catEntries.forEach(([cat, amount]) => lines.push(`• ${getCategory(cat).label}: ${formatMoney(amount)}`));
    lines.push('');
  }

  lines.push('*Aportes reales vs. cuota:*');
  lines.push(`👨 ${nameF}: pagó ${formatMoney(s.paidFather)} – le corresponde ${formatMoney(s.quotaFather)}`);
  lines.push(`👩 ${nameM}: pagó ${formatMoney(s.paidMother)} – le corresponde ${formatMoney(s.quotaMother)}`);
  lines.push('');

  if (s.isBalanced) {
    lines.push('✅ *Cuentas al día.* No hay saldo a transferir este mes.');
  } else {
    const debtorName = profiles[s.debtor].name;
    const creditor = profiles[s.creditor];
    lines.push(`➡️ *${debtorName} transfiere ${formatMoney(s.amountToTransfer)} a ${creditor.name}*`);
    if (creditor.alias) lines.push(`🏦 CBU/Alias: *${creditor.alias}*`);
  }

  if (previousPending && !previousPending.isBalanced) {
    const meses = previousPending.months.map((m) => MONTHS[Number(m.key.slice(5, 7)) - 1].toLowerCase()).join(', ');
    lines.push('');
    lines.push(`🗓️ *Pendiente de meses anteriores (${meses}):* ${profiles[previousPending.debtor].name} debe ${formatMoney(previousPending.amount)} a ${profiles[previousPending.creditor].name}`);
    const total = Math.round((previousPending.balanceFather + s.balanceFather) * 100) / 100;
    if (Math.abs(total) >= 0.005) {
      const [deb, cred] = total > 0 ? ['madre', 'padre'] : ['padre', 'madre'];
      lines.push(`➡️ *Para quedar al día:* ${profiles[deb].name} transfiere ${formatMoney(Math.abs(total))} a ${profiles[cred].name}`);
    }
  }
  lines.push('');
  lines.push('_Detalle de gastos:_');
  [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => {
      const [, m, d] = e.date.split('-');
      const who = e.paidBy === 'padre' ? nameF : nameM;
      const child = e.child ? ` (${e.child})` : '';
      const clip = e.receiptPath ? ' 📎' : '';
      const obs = e.reviewStatus === 'observado' ? ' _(observado, no cuenta)_' : '';
      lines.push(`${d}/${m} · ${e.concept}${child} – ${formatMoney(e.amount)} · pagó ${who}${clip}${obs}`);
    });

  lines.push('');
  lines.push('Gracias 🙌');
  return lines.join('\n');
}

/** Copia texto al portapapeles con fallback para navegadores sin Clipboard API. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
