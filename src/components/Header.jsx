import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, History, Lock, Moon, Plus, Sun } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { initial } from '../utils/formatters';
import { setThemePref } from '../utils/theme';

/**
 * App bar: familia, selector de mes, actividad y el acuerdo del mes.
 * El acuerdo se muestra de solo lectura: cambiarlo afecta a los dos, así que pasa por un modal con confirmación.
 */
export default function Header({ onAdd, onChangeSplit, onActivity, unread }) {
  const { profiles, childrenList, label, shiftMonth, config } = useExpenses();
  const pct = config.fatherPct;
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const onTheme = (e) => setDark(e.detail.dark);
    window.addEventListener('cc-theme', onTheme);
    return () => window.removeEventListener('cc-theme', onTheme);
  }, []);
  const toggleTheme = () => setThemePref(dark ? 'claro' : 'oscuro');

  const iconBtn =
    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:text-slate-900';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-surface/90 px-4 pt-3 pb-2.5 backdrop-blur-md lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="hidden shrink-0 -space-x-1.5 p-0.5 min-[360px]:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-padre text-[11px] font-semibold text-white ring-2 ring-white">
                {initial(profiles.padre.name)}
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-madre text-[11px] font-semibold text-white ring-2 ring-white">
                {initial(profiles.madre.name)}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-[15px] leading-none font-semibold tracking-tight truncate text-slate-900">Cuentas Claras</h1>
              <p className="mt-0.5 truncate text-[12px] text-slate-500">{childrenList.join(' & ') || 'Coparentalidad'}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white text-[12px] font-medium text-slate-700 shadow-xs">
              <button
                onClick={() => shiftMonth(-1)}
                className="flex h-9 w-8 items-center justify-center rounded-l-full text-slate-500 hover:text-slate-800"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <CalendarDays size={13} className="hidden text-slate-500 min-[440px]:block" />
                {/* En pantallas angostas, mes abreviado para que el título no se parta en dos líneas */}
                <span className="min-[420px]:hidden">{`${label.slice(0, 3)} ${label.split(' ')[1]}`}</span>
                <span className="hidden min-[420px]:inline">{label}</span>
              </span>
              <button
                onClick={() => shiftMonth(1)}
                className="flex h-9 w-8 items-center justify-center rounded-r-full text-slate-500 hover:text-slate-800"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <button onClick={onActivity} className={iconBtn} aria-label={unread ? 'Actividad (hay novedades)' : 'Actividad'} title="Actividad">
              <History size={16} />
              {unread && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />}
            </button>
            <button
              onClick={toggleTheme}
              className={`${iconBtn} hidden lg:flex`}
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={onAdd}
              className="hidden h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] lg:flex"
            >
              <Plus size={15} /> Agregar gasto
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-slate-200/60 py-1 pr-1 pl-3">
          <p className="min-w-0 truncate text-[12px] text-slate-600">
            <span className="font-semibold tracking-wider text-slate-500 uppercase">Acuerdo</span>
            <span className="mx-1.5 text-slate-400">·</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {profiles.padre.name} {pct}% / {profiles.madre.name} {100 - pct}%
            </span>
          </p>
          <button
            onClick={onChangeSplit}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-xs transition hover:text-slate-900 dark:bg-slate-300"
          >
            {config.settled && <Lock size={12} />}
            {config.settled ? 'Ver' : 'Cambiar'}
          </button>
        </div>
      </div>
    </header>
  );
}

export function StatusBadge({ settled, by, at }) {
  return settled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-[11px] font-semibold text-sage-700 ring-1 ring-sage-100">
      <CheckCircle2 size={12} /> Saldado{by ? ` · ${by}` : ''}
      {at ? `, ${at.slice(8, 10)}/${at.slice(5, 7)}` : ''}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-100">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> En curso
    </span>
  );
}
