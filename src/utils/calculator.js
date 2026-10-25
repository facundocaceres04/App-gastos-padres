/**
 * Lógica de cierre de mes de Cuentas Claras.
 *
 * 1. Total = gastos pagados por Padre + gastos pagados por Madre
 * 2. Cuota teórica Padre = Total * (% Padre / 100)
 * 3. Cuota teórica Madre = Total * (% Madre / 100)
 * 4. Balance Padre = Pagado por Padre - Cuota teórica Padre
 * 5. Balance Madre = Pagado por Madre - Cuota teórica Madre
 * 6. Balance Padre > 0 → Madre transfiere a Padre; < 0 → Padre transfiere a Madre.
 */

/** Redondea a centavos para evitar errores de coma flotante. */
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Suma de montos pagados por un progenitor. */
export function sumPaidBy(expenses, payer) {
  return round2(
    expenses
      .filter((e) => e.paidBy === payer)
      .reduce((acc, e) => acc + Number(e.amount || 0), 0),
  );
}

/**
 * @param {import('../types').Expense[]} expenses gastos del mes
 * @param {number} fatherPct porcentaje asignado al Padre (0-100)
 * @returns {import('../types').Settlement}
 */
export function calculateSettlement(expenses, fatherPct = 50) {
  const pctFather = Math.min(100, Math.max(0, Number(fatherPct)));
  const pctMother = 100 - pctFather;

  const paidFather = sumPaidBy(expenses, 'padre');
  const paidMother = sumPaidBy(expenses, 'madre');
  const total = round2(paidFather + paidMother);

  // La cuota de la madre se calcula por diferencia para que las dos siempre sumen el total
  // (con redondeo independiente, $100,01 al 50% daba $50,01 + $50,01).
  const quotaFather = round2(total * (pctFather / 100));
  const quotaMother = round2(total - quotaFather);

  // Los balances son opuestos por definición: lo que uno puso de más, al otro le falta.
  const balanceFather = round2(paidFather - quotaFather);
  const balanceMother = round2(-balanceFather);

  let debtor = null;
  let creditor = null;
  if (balanceFather > 0) {
    debtor = 'madre';
    creditor = 'padre';
  } else if (balanceFather < 0) {
    debtor = 'padre';
    creditor = 'madre';
  }

  return {
    pctFather,
    pctMother,
    total,
    paidFather,
    paidMother,
    quotaFather,
    quotaMother,
    balanceFather,
    balanceMother,
    debtor,
    creditor,
    amountToTransfer: Math.abs(balanceFather),
    isBalanced: Math.abs(balanceFather) < 0.005,
  };
}

/** Totales agrupados por categoría (para el desglose). */
export function totalsByCategory(expenses) {
  return expenses.reduce((acc, e) => {
    acc[e.category] = round2((acc[e.category] || 0) + Number(e.amount || 0));
    return acc;
  }, {});
}

/** Gastos que cuentan para el balance: los observados quedan afuera hasta resolverse. */
export const countable = (expenses) => expenses.filter((e) => e.reviewStatus !== 'observado');

/**
 * Saldo pendiente de meses anteriores que no se marcaron como saldados.
 * @param {import('../types').Expense[]} expenses todos los gastos
 * @param {string} currentKey mes actual ("YYYY-MM"); se consideran solo los anteriores
 * @param {(key: string) => { fatherPct: number, settled: boolean }} configFor configuración de cada mes
 */
export function pendingFromPreviousMonths(expenses, currentKey, configFor) {
  const byMonth = {};
  countable(expenses).forEach((e) => {
    const k = e.date.slice(0, 7);
    if (k < currentKey) (byMonth[k] ??= []).push(e);
  });

  const months = Object.keys(byMonth)
    .sort()
    .map((key) => {
      const cfg = configFor(key);
      if (cfg.settled) return null;
      const s = calculateSettlement(byMonth[key], cfg.fatherPct);
      return s.isBalanced ? null : { key, balanceFather: s.balanceFather, debtor: s.debtor, amount: s.amountToTransfer };
    })
    .filter(Boolean);

  const balanceFather = round2(months.reduce((acc, m) => acc + m.balanceFather, 0));
  const isBalanced = Math.abs(balanceFather) < 0.005;
  return {
    months,
    balanceFather,
    debtor: isBalanced ? null : balanceFather > 0 ? 'madre' : 'padre',
    creditor: isBalanced ? null : balanceFather > 0 ? 'padre' : 'madre',
    amount: Math.abs(balanceFather),
    isBalanced,
  };
}
