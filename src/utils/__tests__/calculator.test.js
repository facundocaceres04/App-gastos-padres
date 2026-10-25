import { describe, expect, it } from 'vitest';
import { calculateSettlement, countable, pendingFromPreviousMonths } from '../calculator';

const gasto = (paidBy, amount) => ({ paidBy, amount });

describe('calculateSettlement', () => {
  it('50/50: el que pagó de menos le transfiere la diferencia al otro', () => {
    const s = calculateSettlement([gasto('padre', 150000), gasto('madre', 50000)], 50);
    expect(s).toMatchObject({ total: 200000, quotaFather: 100000, quotaMother: 100000, debtor: 'madre', creditor: 'padre', amountToTransfer: 50000 });
  });

  it('60/40 con aportes iguales: el padre le debe a la madre', () => {
    const s = calculateSettlement([gasto('padre', 100000), gasto('madre', 100000)], 60);
    expect(s).toMatchObject({ quotaFather: 120000, quotaMother: 80000, debtor: 'padre', amountToTransfer: 20000 });
  });

  it('las cuotas siempre suman el total y los balances son opuestos', () => {
    const s = calculateSettlement([gasto('padre', 100.01)], 50);
    expect(s.quotaFather + s.quotaMother).toBeCloseTo(s.total, 10);
    expect(s.balanceMother).toBe(-s.balanceFather);
  });

  it('un centavo de diferencia no se considera "al día"', () => {
    // $0,03 al 50%: cuota del padre $0,02 (redondeo) → la madre le debe $0,01
    const s = calculateSettlement([gasto('padre', 0.03)], 50);
    expect(s).toMatchObject({ isBalanced: false, debtor: 'madre', amountToTransfer: 0.01 });
    expect(s.balanceFather + s.balanceMother).toBe(0);
  });

  it('medio centavo indivisible cuenta como "al día"', () => {
    expect(calculateSettlement([gasto('padre', 0.01)], 50).isBalanced).toBe(true);
  });

  it('reparto 0% padre: la madre cubre todo', () => {
    expect(calculateSettlement([gasto('padre', 1000)], 0)).toMatchObject({ debtor: 'madre', amountToTransfer: 1000 });
  });

  it('reparto 100% padre: el padre cubre todo', () => {
    expect(calculateSettlement([gasto('madre', 1000)], 100)).toMatchObject({ debtor: 'padre', amountToTransfer: 1000 });
  });

  it('reparto 33/67', () => {
    expect(calculateSettlement([gasto('padre', 100)], 33)).toMatchObject({ quotaFather: 33, quotaMother: 67, amountToTransfer: 67 });
  });

  it('sin gastos: cuentas al día', () => {
    expect(calculateSettlement([], 50)).toMatchObject({ total: 0, isBalanced: true, debtor: null, creditor: null });
  });
});

describe('countable', () => {
  it('excluye los gastos observados', () => {
    const xs = [{ reviewStatus: 'pendiente' }, { reviewStatus: 'observado' }, { reviewStatus: 'aceptado' }, {}];
    expect(countable(xs)).toHaveLength(3);
  });
});

describe('pendingFromPreviousMonths', () => {
  const g = (date, paidBy, amount, extra = {}) => ({ date, paidBy, amount, ...extra });
  const cfg = (map) => (key) => ({ fatherPct: 50, settled: false, ...map[key] });

  it('suma los meses anteriores no saldados y compensa entre sí', () => {
    const xs = [
      g('2026-08-10', 'padre', 100000), // agosto: madre debe 50.000
      g('2026-09-10', 'madre', 40000), // septiembre: padre debe 20.000
      g('2026-10-10', 'padre', 999999), // octubre = mes actual, no cuenta
    ];
    const r = pendingFromPreviousMonths(xs, '2026-10', cfg({}));
    expect(r.months.map((m) => m.key)).toEqual(['2026-08', '2026-09']);
    expect(r).toMatchObject({ balanceFather: 30000, debtor: 'madre', creditor: 'padre', amount: 30000 });
  });

  it('ignora meses saldados, al día y gastos observados', () => {
    const xs = [
      g('2026-07-01', 'padre', 100000), // saldado
      g('2026-08-01', 'padre', 50000),
      g('2026-08-02', 'madre', 50000), // agosto al día
      g('2026-09-01', 'padre', 80000, { reviewStatus: 'observado' }), // no cuenta
    ];
    const r = pendingFromPreviousMonths(xs, '2026-10', cfg({ '2026-07': { settled: true } }));
    expect(r).toMatchObject({ months: [], isBalanced: true, debtor: null, amount: 0 });
  });

  it('usa el acuerdo de cada mes', () => {
    const xs = [g('2026-09-01', 'padre', 100000)];
    const r = pendingFromPreviousMonths(xs, '2026-10', cfg({ '2026-09': { fatherPct: 70 } }));
    expect(r).toMatchObject({ debtor: 'madre', amount: 30000 });
  });
});
