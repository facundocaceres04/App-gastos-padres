import { describe, expect, it } from 'vitest';
import { monthsBetween, periodReport, presetRange, rangeError, rangeLabel } from '../period';

const today = new Date(2026, 9, 25); // 25/10/2026

describe('presetRange', () => {
  it.each([
    ['mes', '2026-10-01'],
    ['3m', '2026-08-01'],
    ['6m', '2026-05-01'],
    ['12m', '2025-11-01'],
    ['anio', '2026-01-01'],
  ])('%s empieza el %s y termina hoy', (id, desde) => {
    expect(presetRange(id, today)).toEqual({ desde, hasta: '2026-10-25' });
  });
});

describe('monthsBetween / rangeError / rangeLabel', () => {
  it('lista los meses del rango, cruzando el año', () => {
    expect(monthsBetween('2025-11-15', '2026-02-03')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('valida el rango personalizado', () => {
    expect(rangeError('', '2026-10-01')).toMatch(/dos fechas/);
    expect(rangeError('2026-10-10', '2026-10-01')).toMatch(/anterior/);
    expect(rangeError('2024-01-01', '2026-10-01')).toMatch(/24 meses/);
    expect(rangeError('2026-01-01', '2026-10-01')).toBeNull();
  });
  it('arma una etiqueta corta', () => {
    expect(rangeLabel('2026-05-01', '2026-10-25', today)).toBe('1 may – 25 oct');
    expect(rangeLabel('2025-11-01', '2026-10-25', today)).toBe('1 nov 2025 – 25 oct 2026');
    expect(rangeLabel('2025-03-01', '2025-04-30', today)).toBe('1 mar – 30 abr 2025');
  });
});

describe('periodReport', () => {
  const e = (date, amount, paidBy, extra = {}) => ({ date, amount, paidBy, category: 'salud', child: '', ...extra });
  const expenses = [
    // septiembre (60/40, saldado): Martín pagó 100.000 → le tocaba 60.000 → puso 40.000 de más
    e('2026-09-05', 100000, 'padre'),
    // octubre (50/50): Laura pagó 30.000, Martín 10.000 → total 40.000, Martín puso 10.000 de menos
    e('2026-10-02', 30000, 'madre', { category: 'educacion', child: 'Mateo' }),
    e('2026-10-03', 10000, 'padre'),
    // observado: no cuenta
    e('2026-10-04', 99999, 'madre', { reviewStatus: 'observado' }),
    // fuera del rango
    e('2026-04-30', 5000, 'padre'),
  ];
  const configFor = (k) => (k === '2026-09' ? { fatherPct: 60, settled: true } : { fatherPct: 50, settled: false });
  const r = periodReport(expenses, { desde: '2026-09-01', hasta: '2026-10-25' }, configFor, ['Mateo']);

  it('suma el total y lo que puso cada uno, sin observados ni gastos de afuera', () => {
    expect(r.total).toBe(140000);
    expect(r.pagado).toEqual({ padre: 110000, madre: 30000 });
    expect(r.observados).toEqual({ count: 1, total: 99999 });
  });
  it('calcula el balance mes por mes con el reparto de cada mes', () => {
    expect(r.balancePadre).toBe(30000); // +40.000 (sep) − 10.000 (oct)
    expect(r.acordadoPadre).toBeCloseTo(((60000 + 20000) / 140000) * 100);
  });
  it('"pendiente" deja afuera los meses saldados', () => {
    expect(r.mesesSaldados).toEqual(['2026-09']);
    expect(r.pendientePadre).toBe(-10000); // solo octubre: Martín le debe 10.000 a Laura
  });
  it('arma la serie mensual, las categorías y los hijos', () => {
    expect(r.porMes.map((m) => [m.key, m.total, m.saldado])).toEqual([
      ['2026-09', 100000, true],
      ['2026-10', 40000, false],
    ]);
    expect(r.porCategoria[0]).toMatchObject({ id: 'salud', amount: 110000 });
    expect(r.porHijo.find((h) => h.name === 'Mateo').amount).toBe(30000);
    expect(r.promedioMensual).toBe(70000);
  });
  it('la lista incluye los observados (marcados) y va del más nuevo al más viejo', () => {
    expect(r.gastos.map((x) => x.date)).toEqual(['2026-10-04', '2026-10-03', '2026-10-02', '2026-09-05']);
  });
  it('rango sin gastos', () => {
    const v = periodReport(expenses, { desde: '2026-01-01', hasta: '2026-02-28' }, configFor);
    expect(v.total).toBe(0);
    expect(v.gastos).toEqual([]);
    expect(v.porMes).toHaveLength(2);
  });
});
