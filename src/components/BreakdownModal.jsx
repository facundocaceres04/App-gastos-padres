import Modal, { btnPrimary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { formatMoney } from '../utils/formatters';
import { countable, totalsByCategory } from '../utils/calculator';
import { getCategory } from '../data/categories';

function Row({ label, value, strong = false, muted = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span className={`shrink-0 tabular-nums ${strong ? 'font-semibold text-slate-900' : ''}`}>{value}</span>
    </div>
  );
}

/** "Cómo se calcula": la cuenta escrita renglón por renglón, como en un papel. */
export default function BreakdownModal({ open, onClose }) {
  const { settlement: s, profiles, monthExpenses } = useExpenses();
  const byCat = Object.entries(totalsByCategory(countable(monthExpenses))).sort((a, b) => b[1] - a[1]);
  const people = [
    { role: 'padre', pct: s.pctFather, quota: s.quotaFather, paid: s.paidFather, diff: s.balanceFather },
    { role: 'madre', pct: s.pctMother, quota: s.quotaMother, paid: s.paidMother, diff: s.balanceMother },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cómo se calcula"
      footer={
        <button onClick={onClose} className={btnPrimary}>
          Entendido
        </button>
      }
    >
      <div className="space-y-5 text-[15px]">
        <p className="leading-relaxed text-slate-600">
          Se suman los gastos del mes y se reparten {s.pctFather}/{s.pctMother}. Quien puso menos de lo que le toca le pasa la diferencia al otro.
        </p>

        <div className="border-y border-slate-200 py-2">
          <Row label="Gastos del mes" value={formatMoney(s.total)} strong />
          {people.map((p) => (
            <div key={p.role} className="border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
              <Row label={`A ${profiles[p.role].name} le toca el ${p.pct}%`} value={formatMoney(p.quota)} />
              <Row label="y puso" value={formatMoney(p.paid)} muted />
              <Row
                label={p.diff > 0 ? 'puso de más' : p.diff < 0 ? 'puso de menos' : 'puso justo'}
                value={p.diff === 0 ? '—' : formatMoney(Math.abs(p.diff))}
                muted
              />
            </div>
          ))}
        </div>

        <p className="leading-relaxed text-slate-700">
          {s.isBalanced ? (
            'No hay nada para compensar: cada uno puso lo que le tocaba.'
          ) : (
            <>
              Por eso <strong className="font-semibold text-slate-900">{profiles[s.debtor].name}</strong> le pasa{' '}
              <strong className="font-semibold text-slate-900 tabular-nums">{formatMoney(s.amountToTransfer)}</strong> a {profiles[s.creditor].name}{' '}
              y quedan parejos.
            </>
          )}
        </p>

        {byCat.length > 0 && (
          <div>
            <p className="mb-2 text-[15px] font-semibold text-slate-900">En qué se fue</p>
            <ul className="space-y-2.5">
              {byCat.map(([cat, amount]) => {
                const c = getCategory(cat);
                return (
                  <li key={cat}>
                    <div className="mb-1 flex justify-between text-[14px]">
                      <span className="text-slate-700">{c.label}</span>
                      <span className="text-slate-900 tabular-nums">{formatMoney(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${(amount / s.total) * 100}%`, background: c.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
