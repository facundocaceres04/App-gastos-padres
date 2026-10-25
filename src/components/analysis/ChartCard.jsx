/** Contenedor común de los gráficos de Análisis. */
export default function ChartCard({ title, subtitle, action, children }) {
  return (
    <section className="border-t border-slate-200 pt-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-[21px] leading-tight font-medium tracking-[-0.01em] text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-[14px] text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Tooltip flotante; `pos` en px relativos al contenedor (que debe ser `relative`). */
export function Tooltip({ pos, children }) {
  if (!pos) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 shadow-[0_8px_24px_-8px_rgba(26,23,20,0.25)]"
      style={{ left: pos.x, top: pos.y - 8 }}
    >
      {children}
    </div>
  );
}

export function TooltipRow({ color, label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5">
        {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}
        {label}
      </span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{value}</span>
    </div>
  );
}
