import { ChartPie, List, Plus, Settings, Wallet } from 'lucide-react';

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`press flex min-h-12 flex-1 flex-col items-center justify-center gap-1 ${active ? 'text-slate-900' : 'text-slate-500'}`}
    >
      <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
      <span className={`text-[11px] ${active ? 'font-semibold' : ''}`}>{label}</span>
    </button>
  );
}

/** Barra inferior (mobile y tablet). En escritorio, estas opciones viven en el encabezado. */
export default function BottomNav({ active, onBalance, onAnalysis, onAdd, onHistory, onSettings }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-[480px] items-center px-2 pt-1.5 pb-1">
        <NavItem icon={Wallet} label="Balance" active={active === 'balance'} onClick={onBalance} />
        <NavItem icon={List} label="Gastos" active={active === 'historico'} onClick={onHistory} />
        <div className="flex flex-1 justify-center">
          <button
            onClick={onAdd}
            className="press flex h-11 w-14 items-center justify-center rounded-[14px] bg-slate-900 text-white hover:bg-slate-800"
            aria-label="Agregar gasto"
          >
            <Plus size={22} strokeWidth={2.2} />
          </button>
        </div>
        <NavItem icon={ChartPie} label="Análisis" active={active === 'analisis'} onClick={onAnalysis} />
        <NavItem icon={Settings} label="Ajustes" onClick={onSettings} />
      </div>
    </nav>
  );
}
