import { useState } from 'react';
import { Baby } from 'lucide-react';
import ChartCard from './ChartCard';
import { formatMoney } from '../../utils/formatters';

/** Barras horizontales: cuánto se gastó por hijo/a en el mes (una sola serie). */
export default function ChildBars({ data, total, subtitle = 'Lo que se gastó en cada uno este mes' }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.amount), 0);

  return (
    <ChartCard title="Para quién" subtitle={subtitle}>
      {data.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Baby size={26} className="text-slate-300" />
          <p className="mt-1 text-[14px] text-slate-500">Sin gastos en este mes.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => {
            const pct = total ? Math.round((d.amount / total) * 100) : 0;
            return (
              <li
                key={d.name}
                onPointerEnter={() => setActive(d.name)}
                onPointerLeave={() => setActive(null)}
                title={`${d.name}: ${formatMoney(d.amount)} (${pct}% del mes)`}
              >
                <div className="mb-1 flex items-baseline justify-between text-[14px]">
                  <span className="text-slate-700">{d.name}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-slate-900">{formatMoney(d.amount)}</span>
                    <span className="ml-2 inline-block w-9 text-right text-[13px] text-slate-500">
                      {pct}%
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full">
                  <div
                    className={`h-full rounded-r-[4px] bg-brand-600 transition-opacity ${active && active !== d.name ? 'opacity-40' : ''}`}
                    style={{ width: `${Math.max((d.amount / max) * 100, 1.5)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
