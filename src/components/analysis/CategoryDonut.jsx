import { useState } from 'react';
import { PieChart } from 'lucide-react';
import ChartCard from './ChartCard';
import { getCategory } from '../../data/categories';
import { formatMoney } from '../../utils/formatters';

const R = 46;
const STROKE = 16;
const C = 2 * Math.PI * R;
const GAP = 2; // separación de 2px (en unidades del viewBox) entre segmentos

/** Dona de gastos por categoría (≤ 6 segmentos) + leyenda con montos y %. */
export default function CategoryDonut({ data, total }) {
  const [active, setActive] = useState(null);
  const current = data.find((d) => d.id === active);

  let offset = 0;
  const segments = data.map((d) => {
    const len = (d.amount / total) * C;
    const seg = { ...d, dash: Math.max(len - (data.length > 1 ? GAP : 0), 0.5), offset };
    offset += len;
    return seg;
  });

  return (
    <ChartCard title="Por categoría" subtitle="Cómo se reparte el gasto del mes">
      {data.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Gastos por categoría">
              {segments.map((s) => (
                <circle
                  key={s.id}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={getCategory(s.id).color}
                  strokeWidth={active === s.id ? STROKE + 3 : STROKE}
                  strokeDasharray={`${s.dash} ${C - s.dash}`}
                  strokeDashoffset={-s.offset}
                  opacity={active && active !== s.id ? 0.3 : 1}
                  className="cursor-pointer transition-[opacity,stroke-width] duration-150"
                  onPointerEnter={() => setActive(s.id)}
                  onPointerLeave={() => setActive(null)}
                  onClick={() => setActive((a) => (a === s.id ? null : s.id))}
                >
                  <title>{`${getCategory(s.id).label}: ${formatMoney(s.amount)} (${Math.round(s.pct)}%)`}</title>
                </circle>
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-medium text-slate-500">{current ? getCategory(current.id).label : 'Total'}</span>
              <span className="font-display text-[15px] font-bold tracking-tight text-slate-900 tabular-nums">
                {formatMoney(current ? current.amount : total)}
              </span>
              {current && <span className="text-[10px] text-slate-500 tabular-nums">{Math.round(current.pct)}%</span>}
            </div>
          </div>

          <ul className="w-full space-y-0.5">
            {data.map((d) => {
              const c = getCategory(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onPointerEnter={() => setActive(d.id)}
                    onPointerLeave={() => setActive(null)}
                    onClick={() => setActive((a) => (a === d.id ? null : d.id))}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12px] transition ${
                      active === d.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-slate-700">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                      <span className="truncate">{c.label}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="font-semibold text-slate-900">{formatMoney(d.amount)}</span>
                      <span className="w-8 text-right text-[11px] text-slate-500">{Math.round(d.pct)}%</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <PieChart size={26} className="text-slate-300" />
      <p className="mt-1 text-[12px] text-slate-500">Sin gastos en este mes</p>
    </div>
  );
}
