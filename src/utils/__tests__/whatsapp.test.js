import { describe, expect, it } from 'vitest';
import { buildWhatsAppSummary } from '../whatsapp';
import { calculateSettlement, countable, pendingFromPreviousMonths } from '../calculator';

const profiles = { padre: { name: 'Martín', alias: 'martin.mp' }, madre: { name: 'Laura', alias: 'laura.mp' } };
const g = (date, concept, amount, paidBy, extra = {}) => ({ date, concept, amount, paidBy, category: 'salud', child: '', ...extra });

describe('buildWhatsAppSummary', () => {
  const expenses = [
    g('2026-10-02', 'Colegio', 300000, 'padre', { receiptPath: 'x/y/z.jpg' }),
    g('2026-10-05', 'Farmacia', 100000, 'madre'),
    g('2026-10-07', 'Regalo', 50000, 'madre', { reviewStatus: 'observado' }),
  ];
  const settlement = calculateSettlement(countable(expenses), 50);

  it('indica quién transfiere a quién, con el alias de quien cobra', () => {
    const text = buildWhatsAppSummary({ monthLabel: 'Octubre 2026', settlement, expenses, profiles });
    expect(text).toContain('*Laura transfiere $100.000 a Martín*');
    expect(text).toContain('CBU/Alias: *martin.mp*');
  });

  it('excluye los observados del total y los marca en el detalle', () => {
    const text = buildWhatsAppSummary({ monthLabel: 'Octubre 2026', settlement, expenses, profiles });
    expect(text).toContain('*Total gastado:* $400.000 (2 gastos)');
    expect(text).toContain('1 gasto(s) observado(s) por $50.000');
    expect(text).toContain('Regalo – $50.000 · pagó Laura _(observado, no cuenta)_');
    expect(text).toContain('Colegio – $300.000 · pagó Martín 📎');
  });

  it('suma lo pendiente de meses anteriores', () => {
    const all = [...expenses, g('2026-09-10', 'Dentista', 40000, 'madre')]; // septiembre: Martín debe 20.000
    const previousPending = pendingFromPreviousMonths(all, '2026-10', () => ({ fatherPct: 50, settled: false }));
    const text = buildWhatsAppSummary({ monthLabel: 'Octubre 2026', settlement, expenses, profiles, previousPending });
    expect(text).toContain('Pendiente de meses anteriores (septiembre):* Martín debe $20.000 a Laura');
    expect(text).toContain('*Para quedar al día:* Laura transfiere $80.000 a Martín');
  });
});
