import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Moon, Plus, Settings, Sun } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { setThemePref } from '../utils/theme';

/** Une nombres como se dice: "Mateo", "Mateo y Sofía", "Mateo, Sofía y Juan". */
const joinNames = (names) => (names.length < 2 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`);

/** Encabezado: el mes que se está mirando es el título; a la derecha, la actividad. */
export default function Header({ onAdd, onActivity, onSettings, unread }) {
  const { childrenList, current, shiftMonth, label } = useExpenses();
  const [month, year] = label.split(' ');
  const isThisYear = current.year === new Date().getFullYear();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const onTheme = (e) => setDark(e.detail.dark);
    window.addEventListener('cc-theme', onTheme);
    return () => window.removeEventListener('cc-theme', onTheme);
  }, []);

  const ghost = 'press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  return (
    <header className="sticky top-0 z-30 bg-surface/92 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 backdrop-blur-md lg:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-slate-500">{joinNames(childrenList) || 'Cuentas Claras'}</p>
          <div className="-ml-2 flex items-center">
            <button onClick={() => shiftMonth(-1)} className={`${ghost} h-9 w-8`} aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <h1 className="font-display min-w-0 truncate px-0.5 text-[26px] leading-none font-medium tracking-[-0.02em] text-slate-900">
              {month}
              {!isThisYear && <span className="ml-1.5 text-slate-400">{year}</span>}
            </h1>
            <button onClick={() => shiftMonth(1)} className={`${ghost} h-9 w-8`} aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onActivity} className={ghost} aria-label={unread ? 'Actividad (hay novedades)' : 'Actividad'} title="Actividad">
            <History size={19} />
            {unread && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-surface" />}
          </button>
          <button
            onClick={() => setThemePref(dark ? 'claro' : 'oscuro')}
            className={`${ghost} hidden lg:flex`}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onSettings} className={`${ghost} hidden lg:flex`} aria-label="Ajustes" title="Ajustes">
            <Settings size={18} />
          </button>
          <button
            onClick={onAdd}
            className="press ml-2 hidden h-10 items-center gap-1.5 rounded-[12px] bg-slate-900 pr-4 pl-3 text-[14px] font-semibold text-white hover:bg-slate-800 lg:flex"
          >
            <Plus size={17} /> Agregar gasto
          </button>
        </div>
      </div>
    </header>
  );
}
