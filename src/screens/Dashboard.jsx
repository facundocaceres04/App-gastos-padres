import { useEffect, useState } from 'react';
import { AlertCircle, ChartPie, CheckCircle2, CloudOff, Loader2, Percent, Settings, Trash2, UserPlus, Wallet, X } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import Header from '../components/Header';
import HeroCard from '../components/HeroCard';
import MetricCards from '../components/MetricCards';
import WhatsAppStrip from '../components/WhatsAppStrip';
import ExpenseList from '../components/ExpenseList';
import BottomNav from '../components/BottomNav';
import ExpenseFormModal from '../components/ExpenseFormModal';
import BreakdownModal from '../components/BreakdownModal';
import BankDetailsModal from '../components/BankDetailsModal';
import SplitConfigModal from '../components/SplitConfigModal';
import SettingsModal from '../components/SettingsModal';
import ShareModal from '../components/ShareModal';
import WhatsAppPreviewModal from '../components/WhatsAppPreviewModal';
import AnalysisView from '../components/analysis/AnalysisView';
import Modal, { btnPrimary, btnSecondary } from '../components/Modal';
import RetryScreen from '../components/RetryScreen';
import { useOnline } from '../utils/useOnline';
import { buildWhatsAppSummary, copyToClipboard } from '../utils/whatsapp';
import { formatMoney } from '../utils/formatters';

export default function Dashboard() {
  const { loaded, loadError, reload, error, clearError, label, settlement, monthExpenses, profiles, otherRole, partnerJoined, deleteExpense } =
    useExpenses();
  const online = useOnline();

  // Un solo modal abierto a la vez
  const [modal, setModal] = useState(null); // 'form' | 'breakdown' | 'bank' | 'split' | 'settings' | 'share' | 'whatsapp' | 'delete'
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [nav, setNav] = useState('balance');
  const [toast, setToast] = useState(null);
  const close = () => setModal(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Los errores no desaparecen solos tan rápido: hay que poder leerlos (o cerrarlos).
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 9000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const openNew = () => {
    setEditing(null);
    setModal('form');
  };
  const openEdit = (expense) => {
    setEditing(expense);
    setModal('form');
  };
  const askDelete = (expense) => {
    setToDelete(expense);
    setModal('delete');
  };

  const summary = () => buildWhatsAppSummary({ monthLabel: label, settlement, expenses: monthExpenses, profiles });
  const copyText = async (text, okMsg) => setToast((await copyToClipboard(text)) ? okMsg : 'No se pudo copiar');

  const view = nav === 'analisis' ? 'analisis' : 'balance';
  const goTo = (id, navId) => {
    setNav(navId);
    // Si venimos de Análisis, esperamos a que se pinte el panel antes de scrollear.
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.scrollIntoView({ behavior });
      else window.scrollTo({ top: 0, behavior });
    });
  };

  if (!loaded) {
    if (loadError) return <RetryScreen message={loadError} onRetry={reload} />;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface" role="status" aria-label="Cargando">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      <Header onAdd={openNew} onCustomSplit={() => setModal('split')} />
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
          <CloudOff size={14} /> Sin conexión. Los cambios no se van a guardar hasta que vuelvas a tener internet.
        </div>
      )}

      <main className="mx-auto max-w-[440px] px-4 pt-3 pb-28 sm:max-w-xl lg:max-w-5xl lg:px-8 lg:pt-5 lg:pb-12">
        {/* Pestañas de escritorio (en mobile se usa la barra inferior) */}
        <div className="mb-5 hidden lg:flex">
          <div className="flex rounded-xl bg-slate-200/60 p-0.5">
            {[
              ['balance', 'Balance', Wallet],
              ['analisis', 'Análisis', ChartPie],
            ].map(([id, text, Icon]) => (
              <button
                key={id}
                onClick={() => goTo(null, id)}
                aria-current={view === id ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] transition-all ${
                  view === id ? 'bg-white font-semibold text-slate-900 shadow-xs dark:bg-slate-300' : 'font-medium text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={14} /> {text}
              </button>
            ))}
          </div>
        </div>

        {view === 'analisis' ? (
          <AnalysisView />
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="space-y-3.5 lg:sticky lg:top-32">
              {!partnerJoined && (
                <button
                  onClick={() => setModal('share')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-left transition hover:border-brand-600"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-xs">
                    <UserPlus size={17} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900">Invitá a {profiles[otherRole].name}</p>
                    <p className="text-[11px] text-slate-600">Compartile el código para ver los gastos juntos.</p>
                  </div>
                </button>
              )}
              <HeroCard onShowBreakdown={() => setModal('breakdown')} onShowBank={() => setModal('bank')} />
              <MetricCards />
              <WhatsAppStrip
                onCopy={() => copyText(summary(), 'Copiado para enviar por WhatsApp')}
                onPreview={() => setModal('whatsapp')}
              />
              {/* Accesos que en mobile viven en la barra inferior */}
              <div className="hidden gap-2 lg:flex">
                <button onClick={() => setModal('split')} className={btnSecondary}>
                  <Percent size={14} /> Acuerdo
                </button>
                <button onClick={() => setModal('share')} className={btnSecondary}>
                  <UserPlus size={14} /> Compartir
                </button>
                <button onClick={() => setModal('settings')} className={btnSecondary}>
                  <Settings size={14} /> Ajustes
                </button>
              </div>
            </div>

            <div className="mt-3.5 lg:mt-0">
              <ExpenseList onEdit={openEdit} onDelete={askDelete} onAdd={openNew} />
              <p className="pt-6 text-center text-[12px] text-slate-500">
                {online ? 'Cuentas Claras · Los cambios se ven al instante en los dos teléfonos.' : 'Cuentas Claras · Sin conexión'}
              </p>
            </div>
          </div>
        )}
      </main>

      <BottomNav
        active={nav}
        onBalance={() => goTo(null, 'balance')}
        onAnalysis={() => goTo(null, 'analisis')}
        onAdd={openNew}
        onHistory={() => goTo('historico', 'historico')}
        onSettings={() => setModal('settings')}
      />

      <ExpenseFormModal open={modal === 'form'} onClose={close} expense={editing} onSaved={setToast} onDelete={askDelete} />
      <BreakdownModal open={modal === 'breakdown'} onClose={close} />
      <BankDetailsModal
        open={modal === 'bank'}
        onClose={close}
        onEditProfiles={() => setModal('settings')}
        onCopy={async (alias) => {
          await copyText(alias, 'CBU / Alias copiado al portapapeles');
          close();
        }}
      />
      <SplitConfigModal open={modal === 'split'} onClose={close} onSaved={setToast} />
      <SettingsModal open={modal === 'settings'} onClose={close} onSaved={setToast} onShare={() => setModal('share')} />
      <ShareModal open={modal === 'share'} onClose={close} onCopy={copyText} />
      <WhatsAppPreviewModal
        open={modal === 'whatsapp'}
        onClose={close}
        text={modal === 'whatsapp' ? summary() : ''}
        onCopy={() => copyText(summary(), 'Copiado para enviar por WhatsApp')}
      />

      <Modal
        open={modal === 'delete' && !!toDelete}
        onClose={close}
        title="¿Eliminar este gasto?"
        icon={Trash2}
        footer={
          <>
            <button onClick={close} className={btnSecondary}>Cancelar</button>
            <button
              onClick={async () => {
                close();
                if (!(await deleteExpense(toDelete.id))) setToast('Gasto eliminado');
              }}
              className={btnPrimary}
            >
              Eliminar
            </button>
          </>
        }
      >
        {toDelete && (
          <p className="text-[12px] text-slate-600">
            <strong className="text-slate-900">{toDelete.concept}</strong> · {formatMoney(toDelete.amount)}. Se borra para los dos y el balance
            se actualiza.
          </p>
        )}
      </Modal>

      {(error || toast) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
          <div
            role={error ? 'alert' : 'status'}
            className="animate-toast-in pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
          >
            {error ? (
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            ) : (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            )}
            <span>{error ?? toast}</span>
            {error && (
              <button onClick={clearError} className="-my-1 -mr-2 ml-1 shrink-0 rounded-full p-1.5 text-slate-400 hover:text-white" aria-label="Cerrar">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
