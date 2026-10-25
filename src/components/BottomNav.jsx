import { ChartPie, List, Plus, Settings, Wallet } from 'lucide-react';

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 w-16 flex-col items-center justify-center gap-0.5 ${active ? 'text-slate-900' : 'text-slate-500'}`}
    >
      <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

/** Barra de navegación inferior (solo mobile/tablet). El acuerdo % vive en el encabezado. */
export default function BottomNav({ active, onBalance, onAnalysis, onAdd, onHistory, onSettings }) {
  return (
    <nav className="fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-[440px] items-center justify-between px-4 py-1.5">
        <NavItem icon={Wallet} label="Balance" active={active === 'balance'} onClick={onBalance} />
        <NavItem icon={ChartPie} label="Análisis" active={active === 'analisis'} onClick={onAnalysis} />
        <button
          onClick={onAdd}
          className="-mt-5 flex h-13 w-13 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform active:scale-95"
          aria-label="Agregar gasto"
        >
          <Plus size={24} />
        </button>
        <NavItem icon={List} label="Histórico" active={active === 'historico'} onClick={onHistory} />
        <NavItem icon={Settings} label="Ajustes" onClick={onSettings} />
      </div>
    </nav>
  );
}
