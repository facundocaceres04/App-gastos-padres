import { useRef, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import ChartCard, { Tooltip, TooltipRow } from './ChartCard';
import { formatMoney } from '../../utils/formatters';
import { compactMoney, niceTicks } from '../../utils/analytics';

const PLOT_H = 150; // alto del área de barras en px

/** Columnas apiladas Padre/Madre de los últimos meses, con tooltip y vista de tabla. */
export default function MonthlyBars({ series, profiles, selectedKey }) {
  const [hover, setHover] = useState(null); // { i, x, y }
  const [asTable, setAsTable] = useState(false);
  const boxRef = useRef(null);

  const max = Math.max(...series.map((m) => m.total), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const sumPadre = series.reduce((a, m) => a + m.padre, 0);
  const sumMadre = series.reduce((a, m) => a + m.madre, 0);

  const show = (i, e) => {
    const box = boxRef.current.getBoundingClientRect();
    const col = e.currentTarget.getBoundingClientRect();
    const barTop = PLOT_H - (series[i].total / top) * PLOT_H;
    setHover({ i, x: col.left - box.left + col.width / 2, y: col.top - box.top + Math.min(barTop, PLOT_H - 20) });
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setAsTable((v) => !v)}
      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
    >
      {asTable ? <BarChart3 size={13} /> : <Table2 size={13} />}
      {asTable ? 'Gráfico' : 'Tabla'}
    </button>
  );

  return (
    <ChartCard title="Últimos 6 meses" subtitle="Cuánto pagó cada uno, mes a mes" action={toggle}>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <Legend color="var(--color-padre)" label={profiles.padre.name} value={sumPadre} />
        <Legend color="var(--color-madre)" label={profiles.madre.name} value={sumMadre} />
      </div>

      {asTable ? (
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] text-slate-500">
              <th className="py-1.5 font-medium">Mes</th>
              <th className="py-1.5 text-right font-medium">{profiles.padre.name}</th>
              <th className="py-1.5 text-right font-medium">{profiles.madre.name}</th>
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {series.map((m) => (
              <tr key={m.key} className={m.key === selectedKey ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                <td className="py-1.5">{m.label}</td>
                <td className="py-1.5 text-right">{formatMoney(m.padre)}</td>
                <td className="py-1.5 text-right">{formatMoney(m.madre)}</td>
                <td className="py-1.5 text-right text-slate-900">{formatMoney(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={boxRef} className="relative" onPointerLeave={() => setHover(null)}>
          <div className="flex">
            {/* Eje Y */}
            <div className="relative mr-2 w-9 shrink-0 text-right text-[10px] text-slate-400 tabular-nums" style={{ height: PLOT_H }}>
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: PLOT_H - (t / top) * PLOT_H }}>
                  {compactMoney(t)}
                </span>
              ))}
            </div>

            <div className="relative flex-1">
              {/* Grilla */}
              <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: PLOT_H }}>
                {ticks.map((t) => (
                  <div
                    key={t}
                    className={`absolute inset-x-0 border-t ${t === 0 ? 'border-slate-300' : 'border-dashed border-slate-100'}`}
                    style={{ top: PLOT_H - (t / top) * PLOT_H }}
                  />
                ))}
              </div>

              {/* Columnas */}
              <div className="relative flex items-end justify-around gap-1" style={{ height: PLOT_H }}>
                {series.map((m, i) => {
                  const hP = (m.padre / top) * PLOT_H;
                  const hM = (m.madre / top) * PLOT_H;
                  const dim = hover && hover.i !== i;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      aria-label={`${m.label}: total ${formatMoney(m.total)}`}
                      onPointerEnter={(e) => show(i, e)}
                      onClick={(e) => (hover?.i === i ? setHover(null) : show(i, e))}
                      className="flex h-full flex-1 flex-col items-center justify-end"
                    >
                      {m.total > 0 && (
                        <span className={`mb-1 text-[10px] font-semibold tabular-nums ${m.key === selectedKey ? 'text-slate-900' : 'text-slate-500'}`}>
                          {compactMoney(m.total)}
                        </span>
                      )}
                      <div className={`flex w-full max-w-9 flex-col-reverse gap-[2px] transition-opacity ${dim ? 'opacity-40' : ''}`}>
                        {hP > 0 && (
                          <div className={`w-full bg-padre ${hM > 0 ? '' : 'rounded-t-[4px]'}`} style={{ height: Math.max(hP, 2) }} />
                        )}
                        {hM > 0 && <div className="w-full rounded-t-[4px] bg-madre" style={{ height: Math.max(hM, 2) }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Eje X */}
              <div className="mt-1.5 flex justify-around gap-1">
                {series.map((m) => (
                  <span
                    key={m.key}
                    className={`flex-1 text-center text-[11px] ${m.key === selectedKey ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
                  >
                    {m.short}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Tooltip pos={hover}>
            {hover && (
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{series[hover.i].label}</p>
                <TooltipRow color="var(--color-padre)" label={profiles.padre.name} value={formatMoney(series[hover.i].padre)} />
                <TooltipRow color="var(--color-madre)" label={profiles.madre.name} value={formatMoney(series[hover.i].madre)} />
                <div className="border-t border-slate-100 pt-1">
                  <TooltipRow label="Total" value={formatMoney(series[hover.i].total)} strong />
                </div>
              </div>
            )}
          </Tooltip>
        </div>
      )}
    </ChartCard>
  );
}

function Legend({ color, label, value }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
      <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(value)}</span>
    </span>
  );
}
