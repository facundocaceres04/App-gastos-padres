/** Datos de prueba para que la app funcione desde el primer segundo. */

export const DEFAULT_PROFILES = {
  padre: { name: 'Martín', alias: 'martin.parent.mp' },
  madre: { name: 'Laura', alias: 'laura.cuentas.mp' },
};

export const DEFAULT_CHILDREN = ['Mateo', 'Sofía'];

/** @type {import('../types').Expense[]} */
export const MOCK_EXPENSES = [
  // Octubre 2026
  { id: 'e1', concept: 'Colegio cuota mensual', amount: 350000, paidBy: 'padre', child: 'Mateo', category: 'educacion', date: '2026-10-24' },
  { id: 'e2', concept: 'Ortodoncia & control', amount: 220000, paidBy: 'madre', child: 'Sofía', category: 'salud', date: '2026-10-23' },
  { id: 'e3', concept: 'Farmacia', amount: 18500, paidBy: 'madre', child: 'Mateo', category: 'salud', date: '2026-10-18' },
  { id: 'e4', concept: 'Cuota club de fútbol', amount: 45000, paidBy: 'padre', child: 'Mateo', category: 'recreacion', date: '2026-10-14' },
  { id: 'e5', concept: 'Zapatillas & abrigo de lluvia', amount: 250000, paidBy: 'padre', child: 'Mateo', category: 'indumentaria', date: '2026-10-10' },
  { id: 'e6', concept: 'Supermercado quincenal', amount: 180000, paidBy: 'madre', child: 'Ambos', category: 'alimentos', date: '2026-10-06' },
  { id: 'e7', concept: 'Materiales escolares & libros', amount: 100000, paidBy: 'madre', child: 'Sofía', category: 'educacion', date: '2026-10-03' },
  { id: 'e8', concept: 'Regalo cumpleaños amiga', amount: 15000, paidBy: 'madre', child: 'Sofía', category: 'varios', date: '2026-10-02' },
  // Septiembre 2026
  { id: 'e9', concept: 'Colegio cuota mensual', amount: 350000, paidBy: 'padre', child: 'Mateo', category: 'educacion', date: '2026-09-02' },
  { id: 'e10', concept: 'Dentista', amount: 80000, paidBy: 'madre', child: 'Sofía', category: 'salud', date: '2026-09-10' },
  { id: 'e11', concept: 'Campera abrigo', amount: 95000, paidBy: 'madre', child: 'Sofía', category: 'indumentaria', date: '2026-09-14' },
  { id: 'e12', concept: 'Cine y salida', amount: 30000, paidBy: 'padre', child: 'Ambos', category: 'recreacion', date: '2026-09-20' },
];

/** Configuración por mes ("YYYY-MM"). */
export const MOCK_MONTH_CONFIG = {
  '2026-09': { fatherPct: 50, settled: true, settledAt: '2026-10-01' },
  '2026-10': { fatherPct: 50, settled: false, settledAt: null },
};
