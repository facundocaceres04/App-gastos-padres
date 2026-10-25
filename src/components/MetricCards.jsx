import { useExpenses } from '../context/ExpensesContext';
import { formatMoney } from '../utils/formatters';

function Card({ title, badge, value, foot, footCls = 'text-slate-400' }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-medium text-slate-600">{title}</span>
        {badge && <span className="text-[10px] font-semibold text-slate-500">{badge}</span>}
      </div>
      <div className="mt-1.5">
        <span className="font-display block text-[14px] leading-tight font-bold tracking-tight text-slate-900 tabular-nums sm:text-[16px]">
          {value}
        </span>
        <span className={`mt-0.5 block truncate text-[10px] font-semibold ${footCls}`} title="Diferencia contra su cuota">
          {foot}
        </span>
      </div>
    </div>
  );
}

const delta = (n) => (n >= 0 ? `+${formatMoney(n)}` : `-${formatMoney(-n)}`);
const deltaCls = (n) => (n >= 0 ? 'text-emerald-600' : 'text-amber-600');

/** Total del mes + aporte real de cada progenitor vs. su cuota. */
export default function MetricCards() {
  const { settlement: s, profiles, monthExpenses } = useExpenses();
  const n = monthExpenses.length;

  return (
    <section className="grid grid-cols-3 gap-2">
      <Card title="Total mes" value={formatMoney(s.total)} foot={`${n} ${n === 1 ? 'gasto' : 'gastos'} reg.`} footCls="font-normal text-slate-400" />
      <Card
        title={profiles.padre.name}
        badge={`${s.pctFather}%`}
        value={formatMoney(s.paidFather)}
        foot={delta(s.balanceFather)}
        footCls={deltaCls(s.balanceFather)}
      />
      <Card
        title={profiles.madre.name}
        badge={`${s.pctMother}%`}
        value={formatMoney(s.paidMother)}
        foot={delta(s.balanceMother)}
        footCls={deltaCls(s.balanceMother)}
      />
    </section>
  );
}
