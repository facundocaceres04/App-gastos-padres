import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Plus, SlidersHorizontal } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { SPLIT_PRESETS } from '../data/categories';
import { initial } from '../utils/formatters';

/** App bar: familia, selector de mes, estado y barra de acuerdo (% de reparto). */
export default function Header({ onAdd, onCustomSplit }) {
  const { profiles, childrenList, label, shiftMonth, config, setFatherPct } = useExpenses();
  const pct = config.fatherPct;
  const isPreset = SPLIT_PRESETS.includes(pct);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-surface/90 px-4 pt-3 pb-2.5 backdrop-blur-md lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex -space-x-1.5 p-0.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white ring-2 ring-white">
                {initial(profiles.padre.name)}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-500 text-[11px] font-semibold text-white ring-2 ring-white">
                {initial(profiles.madre.name)}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-[15px] leading-none font-semibold tracking-tight text-slate-900">
                Cuentas Claras
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                {childrenList.join(' & ')} · Coparentalidad
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white text-[12px] font-medium text-slate-700 shadow-xs">
              <button onClick={() => shiftMonth(-1)} className="rounded-l-full py-1 pr-0.5 pl-1.5 text-slate-400 hover:text-slate-700" aria-label="Mes anterior">
                <ChevronLeft size={14} />
              </button>
              <span className="flex items-center gap-1 px-1 py-1">
                <CalendarDays size={13} className="text-slate-400" />
                {label}
              </span>
              <button onClick={() => shiftMonth(1)} className="rounded-r-full py-1 pr-1.5 pl-0.5 text-slate-400 hover:text-slate-700" aria-label="Mes siguiente">
                <ChevronRight size={14} />
              </button>
            </div>
            <button
              onClick={onAdd}
              className="hidden items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] lg:flex"
            >
              <Plus size={15} /> Añadir gasto
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-200/60 p-1">
          <span className="shrink-0 pl-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Acuerdo:</span>
          <div className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto">
            <div className="ml-auto flex items-center gap-1">
            {SPLIT_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setFatherPct(p)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] tabular-nums transition-all ${
                  pct === p ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'font-medium text-slate-600 hover:text-slate-900'
                }`}
              >
                {p} / {100 - p}
              </button>
            ))}
            <button
              onClick={onCustomSplit}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition-all ${
                !isPreset ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'font-medium text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Porcentaje personalizado"
            >
              <SlidersHorizontal size={12} />
              {isPreset ? <span className="hidden sm:inline">Personalizado</span> : `${pct} / ${100 - pct}`}
            </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function StatusBadge({ settled }) {
  return settled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-semibold text-sage-700 ring-1 ring-sage-100">
      <CheckCircle2 size={11} /> Saldado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 ring-1 ring-brand-100">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> En curso
    </span>
  );
}
