import Modal, { btnPrimary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { formatMoney } from '../utils/formatters';
import { totalsByCategory } from '../utils/calculator';
import { getCategory } from '../data/categories';

const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatMoney(Math.abs(n))}`;

function ParentBlock({ name, pct, quota, paid, balance }) {
  return (
    <div className="space-y-1 border-t border-slate-200/70 pt-2">
      <div className="flex justify-between text-slate-700">
        <span>Cuota objetivo {name} ({pct}%):</span>
        <span className="font-medium tabular-nums">{formatMoney(quota)}</span>
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Abonado por {name}:</span>
        <span className="tabular-nums">{formatMoney(paid)}</span>
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Balance:</span>
        <span className={`font-semibold tabular-nums ${balance >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{signed(balance)}</span>
      </div>
    </div>
  );
}

/** "Cómo se calcula": desglose paso a paso del cálculo. */
export default function BreakdownModal({ open, onClose }) {
  const { settlement: s, profiles, monthExpenses } = useExpenses();
  const byCat = Object.entries(totalsByCategory(monthExpenses)).sort((a, b) => b[1] - a[1]);

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
      <div className="space-y-2.5 text-[12px] text-slate-600">
        <p className="leading-relaxed">
          Basado en el acuerdo de{' '}
          <strong>
            {s.pctFather}% {profiles.padre.name} / {s.pctMother}% {profiles.madre.name}
          </strong>{' '}
          sobre los gastos registrados de este período:
        </p>
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-[13px] font-semibold text-slate-900">
            <span>Gasto total común:</span>
            <span className="tabular-nums">{formatMoney(s.total)}</span>
          </div>
          <ParentBlock name={profiles.padre.name} pct={s.pctFather} quota={s.quotaFather} paid={s.paidFather} balance={s.balanceFather} />
          <ParentBlock name={profiles.madre.name} pct={s.pctMother} quota={s.quotaMother} paid={s.paidMother} balance={s.balanceMother} />
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-medium text-emerald-900">
          {s.isBalanced ? (
            <>No hay saldo a compensar: cada uno aportó exactamente lo acordado.</>
          ) : (
            <>
              Si {profiles[s.debtor].name} le transfiere <strong>{formatMoney(s.amountToTransfer)}</strong> a {profiles[s.creditor].name}, cada uno queda aportando lo acordado.
            </>
          )}
        </div>

        {byCat.length > 0 && (
          <div className="pt-1">
            <p className={'mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase'}>Por categoría</p>
            <ul className="space-y-2">
              {byCat.map(([cat, amount]) => {
                const c = getCategory(cat);
                return (
                  <li key={cat}>
                    <div className="mb-1 flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <c.icon size={13} className="text-slate-400" /> {c.label}
                      </span>
                      <span className="font-medium text-slate-800 tabular-nums">{formatMoney(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-600/70" style={{ width: `${(amount / s.total) * 100}%` }} />
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
