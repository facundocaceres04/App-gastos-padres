import { afterEach, describe, expect, it, vi } from 'vitest';
import { amountToInput, formatMoney, groupLabel, parseAmount, parseChildren } from '../formatters';

describe('parseAmount (formato argentino)', () => {
  it.each([
    ['1.500', 1500],
    ['1.500,50', 1500.5],
    ['35000', 35000],
    ['0,5', 0.5],
    ['1500.50', 1500.5],
    ['$ 12.345.678', 12345678],
    ['  250  ', 250],
  ])('"%s" → %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['abc', '', '0', '-5', '1,234,5', '1.5.0', '10,123', '2000000000'])('"%s" es inválido', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it('amountToInput usa coma decimal', () => {
    expect(amountToInput(1500.5)).toBe('1500,5');
    expect(parseAmount(amountToInput(1500.5))).toBe(1500.5);
  });
});

describe('formatMoney', () => {
  it('usa separador de miles con punto', () => {
    expect(formatMoney(1234567)).toBe('$1.234.567');
    expect(formatMoney(97500.5)).toBe('$97.500,5');
  });
});

describe('groupLabel', () => {
  afterEach(() => vi.useRealTimers());

  it('usa la fecha local, no UTC (23:30 en Argentina sigue siendo el mismo día)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 25, 23, 30)); // 25/10/2026 23:30 hora local
    expect(groupLabel('2026-10-25')).toBe('Hoy');
    expect(groupLabel('2026-10-24')).toBe('Ayer');
    expect(groupLabel('2026-10-05')).toBe('05 de octubre');
  });

  it('"Ayer" cruza el cambio de mes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1, 9, 0)); // 1/11/2026
    expect(groupLabel('2026-10-31')).toBe('Ayer');
  });
});

describe('parseChildren', () => {
  it('separa por coma y limpia espacios', () => {
    expect(parseChildren(' Mateo, Sofía ,, ')).toEqual({ list: ['Mateo', 'Sofía'] });
  });
  it('respeta los límites de la base', () => {
    expect(parseChildren(Array(11).fill('A').join(',')).error).toMatch(/10/);
    expect(parseChildren('x'.repeat(41)).error).toMatch(/40/);
  });
});
