import { describe, expect, it } from 'vitest';
import { describeActivity, relativeTime } from '../activity';

const profiles = { padre: { name: 'Martín' }, madre: { name: 'Laura' } };
const ctx = { profiles, nameOf: (id) => ({ u1: 'Martín', u2: 'Laura' })[id] ?? 'Alguien' };

describe('describeActivity', () => {
  it('gasto agregado', () => {
    const r = describeActivity({ kind: 'expense_added', actor: 'u2', data: { concept: 'Pediatra', amount: 25000, paid_by: 'madre', date: '2026-10-12' } }, ctx);
    expect(r.text).toBe('Laura agregó Pediatra');
    expect(r.detail).toBe('$25.000 · pagó Laura · 12/10');
  });

  it('gasto editado lista los cambios', () => {
    const r = describeActivity(
      { kind: 'expense_updated', actor: 'u1', data: { concept: 'Colegio', changes: { amount: [300000, 350000], paid_by: ['padre', 'madre'] } } },
      ctx,
    );
    expect(r.text).toBe('Martín editó Colegio');
    expect(r.detail).toBe('monto $300.000 → $350.000 · pagó Martín → Laura');
  });

  it('cambio de acuerdo y mes saldado', () => {
    expect(describeActivity({ kind: 'split_changed', actor: 'u2', data: { month: '2026-10', from: 50, to: 60 } }, ctx)).toMatchObject({
      text: 'Laura cambió el reparto de octubre de 2026',
      detail: '50 / 50 → 60 / 40',
    });
    expect(describeActivity({ kind: 'month_settled', actor: 'u1', data: { month: '2026-09' } }, ctx).text).toBe('Martín marcó septiembre de 2026 como saldado');
  });

  it('revisiones y comprobantes', () => {
    expect(describeActivity({ kind: 'expense_reviewed', actor: 'u1', data: { concept: 'Regalo', amount: 5000, status: 'observado', note: 'No lo acordamos' } }, ctx)).toMatchObject({
      text: 'Martín observó Regalo',
      detail: '“No lo acordamos”',
    });
    expect(describeActivity({ kind: 'expense_reviewed', actor: 'u2', data: { concept: 'Colegio', amount: 300000, status: 'aceptado' } }, ctx).text).toBe('Laura aceptó Colegio');
    expect(describeActivity({ kind: 'expense_updated', actor: 'u2', data: { concept: 'Colegio', changes: { receipt: [false, true] } } }, ctx).detail).toBe('adjuntó comprobante');
  });

  it('actualización de CBU', () => {
    expect(describeActivity({ kind: 'family_updated', actor: 'u2', data: { fields: ['madre_alias'] } }, ctx).text).toBe('Laura actualizó el CBU/Alias');
  });

  it('salidas de la familia', () => {
    expect(describeActivity({ kind: 'member_left', actor: 'u9', data: { role: 'padre' } }, ctx).text).toBe('Martín salió de la familia');
    expect(describeActivity({ kind: 'member_removed', actor: 'u2', data: { role: 'padre' } }, ctx).text).toBe('Laura quitó a Martín de la familia');
  });

  it('actor desconocido (cuenta borrada)', () => {
    expect(describeActivity({ kind: 'month_reopened', actor: null, data: { month: '2026-10' } }, ctx).text).toBe('Alguien reabrió octubre de 2026');
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 9, 25, 15, 0);
  it.each([
    [new Date(2026, 9, 25, 14, 59, 40), 'recién'],
    [new Date(2026, 9, 25, 14, 50), 'hace 10 min'],
    [new Date(2026, 9, 25, 11, 0), 'hace 4 h'],
  ])('%s → %s', (d, expected) => {
    expect(relativeTime(d.toISOString(), now)).toBe(expected);
  });
  it('ayer y fechas anteriores', () => {
    expect(relativeTime(new Date(2026, 9, 24, 9, 5).toISOString(), now)).toMatch(/^ayer 09:05/);
    expect(relativeTime(new Date(2026, 9, 12, 9, 5).toISOString(), now)).toMatch(/^12\/10 09:05/);
  });
});
