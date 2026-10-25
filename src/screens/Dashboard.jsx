import { useEffect, useState } from 'react';
import { AlertCircle, ChartPie, CheckCircle2, Loader2, Percent, Settings, Trash2, UserPlus, Wallet } from 'lucide-react';
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
import { buildWhatsAppSummary, copyToClipboard } from '../utils/whatsapp';
import { formatMoney } from '../utils/formatters';

export default function Dashboard() {
  const { loaded, error, clearError, label, settlement, monthExpenses, profiles, otherRole, partnerJoined, deleteExpense } = useExpenses();

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

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 4000);
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
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  if (!loaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        {error ? (
          <p className="max-w-xs text-center text-[13px] text-slate-600">{error}</p>
        ) : (
          <Loader2 size={24} className="animate-spin text-slate-400" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      <Header onAdd={openNew} onCustomSplit={() => setModal('split')} />

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
                  view === id ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'font-medium text-slate-600 hover:text-slate-900'
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
              <p className="pt-6 text-center text-[11px] text-slate-400">Cuentas Claras · Sincronizado en tiempo real entre los dos.</p>
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
              onClick={() => {
                deleteExpense(toDelete.id);
                close();
                setToast('Gasto eliminado');
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
            <strong className="text-slate-900">{toDelete.concept}</strong> · {formatMoney(toDelete.amount)}. El cierre del mes se recalculará
            automáticamente.
          </p>
        )}
      </Modal>

      {(error || toast) && (
        <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 lg:bottom-8">
          <div role="status" className="animate-toast-in flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-[11px] font-medium whitespace-nowrap text-white shadow-lg">
            {error ? <AlertCircle size={14} className="text-amber-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
            {error ?? toast}
          </div>
        </div>
      )}
    </div>
  );
}
