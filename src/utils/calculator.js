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
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

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

  const quotaFather = round2(total * (pctFather / 100));
  const quotaMother = round2(total * (pctMother / 100));

  const balanceFather = round2(paidFather - quotaFather);
  const balanceMother = round2(paidMother - quotaMother);

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
    isBalanced: balanceFather === 0,
  };
}

/** Totales agrupados por categoría (para el desglose). */
export function totalsByCategory(expenses) {
  return expenses.reduce((acc, e) => {
    acc[e.category] = round2((acc[e.category] || 0) + Number(e.amount || 0));
    return acc;
  }, {});
}
