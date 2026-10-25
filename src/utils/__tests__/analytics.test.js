import { describe, expect, it } from 'vitest';
import { changeVsPrevious, childBreakdown, compactMoney, monthlyAverage, monthlySeries, yearToDate } from '../analytics';

const g = (date, amount, paidBy = 'padre', extra = {}) => ({ date, amount, paidBy, category: 'varios', child: '', ...extra });

describe('monthlySeries', () => {
  it('cruza el cambio de año', () => {
    expect(monthlySeries([], 2026, 1, 3).map((m) => m.key)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('suma por progenitor y total', () => {
    const [m] = monthlySeries([g('2026-10-02', 100), g('2026-10-03', 50, 'madre'), g('2026-09-30', 999)], 2026, 9, 1);
    expect(m).toMatchObject({ key: '2026-10', padre: 100, madre: 50, total: 150 });
  });
});

describe('yearToDate', () => {
  it('cuenta solo desde enero hasta el mes indicado', () => {
    const xs = [g('2025-12-31', 100), g('2026-01-15', 50), g('2026-03-01', 30)];
    expect(yearToDate(xs, 2026, 1)).toBe(50); // hasta febrero
  });
});

describe('changeVsPrevious / monthlyAverage', () => {
  it('variación y promedio de meses con datos', () => {
    const series = [0, 100, 150].map((total) => ({ total }));
    expect(changeVsPrevious(series)).toBe(50);
    expect(monthlyAverage(series)).toBe(125);
    expect(changeVsPrevious([{ total: 100 }, { total: 0 }])).toBe(-100);
    expect(changeVsPrevious([{ total: 0 }, { total: 100 }])).toBeNull();
  });
});

describe('childBreakdown', () => {
  it('agrupa por hijo y respeta el orden hijos → Ambos → Sin asignar', () => {
    const xs = [g('2026-10-01', 10, 'padre', { child: 'Ambos' }), g('2026-10-01', 5), g('2026-10-01', 20, 'padre', { child: 'Sofía' })];
    expect(childBreakdown(xs, ['Mateo', 'Sofía']).map((d) => d.name)).toEqual(['Sofía', 'Ambos', 'Sin asignar']);
  });
});

describe('compactMoney', () => {
  it('no muestra "$1000K"', () => {
    expect(compactMoney(999999)).toBe('$1M');
    expect(compactMoney(85000)).toBe('$85K');
    expect(compactMoney(1250000)).toBe('$1,3M');
  });
});
