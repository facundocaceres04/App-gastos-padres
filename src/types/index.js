/**
 * Tipos del dominio (JSDoc). Se importan con `import('../types').Expense`.
 *
 * @typedef {'padre' | 'madre'} Payer
 *
 * @typedef {'educacion' | 'salud' | 'indumentaria' | 'recreacion' | 'alimentos' | 'varios'} CategoryId
 *
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} concept
 * @property {number} amount
 * @property {Payer} paidBy
 * @property {string} child      Nombre del hijo/a, "Ambos" o "" si no aplica
 * @property {CategoryId} category
 * @property {string} date       Formato ISO YYYY-MM-DD
 *
 * @typedef {Object} MonthConfig
 * @property {number} fatherPct  Porcentaje asignado al Padre
 * @property {boolean} settled   Mes marcado como saldado
 * @property {string|null} settledAt
 *
 * @typedef {Object} Profile
 * @property {string} name
 * @property {string} alias      CBU o Alias para transferencias
 *
 * @typedef {Object} Settlement
 * @property {number} pctFather
 * @property {number} pctMother
 * @property {number} total
 * @property {number} paidFather
 * @property {number} paidMother
 * @property {number} quotaFather
 * @property {number} quotaMother
 * @property {number} balanceFather
 * @property {number} balanceMother
 * @property {Payer|null} debtor
 * @property {Payer|null} creditor
 * @property {number} amountToTransfer
 * @property {boolean} isBalanced
 */

export {};
