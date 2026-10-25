import { describe, expect, it } from 'vitest';
import { calculateSettlement } from '../calculator';

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
