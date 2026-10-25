import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, ChartPie, CheckCircle2, CloudOff, Loader2, Lock, LockOpen, Percent, Settings, UserPlus, Wallet, X } from 'lucide-react';
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
import ActivityModal from '../components/ActivityModal';
import Modal, { FormError, btnPrimary, btnSecondary } from '../components/Modal';
import RetryScreen from '../components/RetryScreen';
import InstallHint from '../components/InstallHint';
import { useOnline } from '../utils/useOnline';
import { buildWhatsAppSummary, copyToClipboard } from '../utils/whatsapp';
import { formatMoney } from '../utils/formatters';
import { describeActivity } from '../utils/activity';

// Los gráficos se bajan recién cuando se abre Análisis.
const AnalysisView = lazy(() => import('../components/analysis/AnalysisView'));

const seenKey = (householdId) => `cuentas-claras:actividad-vista:${householdId}`;
/** Última vez que se abrió el historial. La primera visita cuenta como punto de partida. */
const readSeen = (householdId) => {
  const now = new Date().toISOString();
  try {
    const v = localStorage.getItem(seenKey(householdId));
    if (v) return v;
    localStorage.setItem(seenKey(householdId), now);
  } catch {
    /* sin storage: se toma la hora actual */
  }
  return now;
};

export default function Dashboard() {
  const {
    loaded,
    loadError,
    reload,
    error,
    clearError,
    label,
    settlement,
    monthExpenses,
    profiles,
    otherRole,
    partnerJoined,
    deleteExpense,
    undoDelete,
    config,
    toggleSettled,
    householdId,
    userId,
    activity,
    nameOf,
    subscribeActivity,
    previousPending,
    observed,
  } = useExpenses();
  const online = useOnline();

  // Un solo modal abierto a la vez
  const [modal, setModal] = useState(null); // 'form' | 'breakdown' | 'bank' | 'split' | 'settings' | 'share' | 'whatsapp' | 'settle' | 'activity'
  const [editing, setEditing] = useState(null);
  const [formNonce, setFormNonce] = useState(0); // remonta el formulario en cada apertura
  const [nav, setNav] = useState('balance');
  // Toast: texto simple o { text, action: { label, onClick }, icon, ms }
  const [toast, setToastRaw] = useState(null);
  const setToast = (t) => setToastRaw(typeof t === 'string' ? { text: t } : t);
  const close = () => setModal(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToastRaw(null), toast.ms ?? 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Avisos en vivo de lo que hace el otro progenitor.
  const describeRef = useRef(null);
  describeRef.current = (entry) => describeActivity(entry, { nameOf, profiles }).text;
  useEffect(
    () => subscribeActivity((entry) => setToastRaw({ text: describeRef.current(entry), icon: 'bell', ms: 4500 })),
    [subscribeActivity],
  );

  // Novedades del otro desde la última vez que se abrió el historial.
  const [lastSeen, setLastSeen] = useState(() => readSeen(householdId));
  const unread = activity.some((a) => a.actor !== userId && a.created_at > lastSeen);
  const closeActivity = () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(seenKey(householdId), now);
    } catch {
      /* sin storage: el punto vuelve a aparecer al recargar */
    }
    setLastSeen(now);
    close();
  };

  // Saldar / reabrir el mes, con confirmación explícita.
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState(null);
  const askSettle = () => {
    setSettleError(null);
    setModal('settle');
  };
  const confirmSettle = async () => {
    setSettling(true);
    const err = await toggleSettled();
    setSettling(false);
    if (err) return setSettleError(err);
    close();
    setToast(config.settled ? `${label} reabierto` : `${label} marcado como saldado`);
  };

  // Los errores no desaparecen solos tan rápido: hay que poder leerlos (o cerrarlos).
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 9000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const openNew = () => {
    setEditing(null);
    setFormNonce((n) => n + 1);
    setModal('form');
  };
  // Atajo del ícono de la app instalada ("Agregar gasto"): /?accion=gasto
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('accion') !== 'gasto') return;
    window.history.replaceState(null, '', window.location.pathname);
    openNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (expense) => {
    setEditing(expense);
    setFormNonce((n) => n + 1);
    setModal('form');
  };
  // Borrar no pide confirmación: se puede deshacer durante unos segundos (y queda en la actividad).
  const askDelete = (expense) => {
    close();
    deleteExpense(expense.id);
    setToast({
      text: `Borraste ${expense.concept}`,
      ms: 6000,
      action: { label: 'Deshacer', onClick: () => undoDelete(expense.id) && setToast('Listo, no se borró') },
    });
  };

  const summary = () => buildWhatsAppSummary({ monthLabel: label, settlement, expenses: monthExpenses, profiles, previousPending });
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
      <Header onAdd={openNew} onChangeSplit={() => setModal('split')} onActivity={() => setModal('activity')} unread={unread} />
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
          <CloudOff size={14} /> Sin conexión. Los cambios no se van a guardar hasta que vuelvas a tener internet.
        </div>
      )}

      <main className="mx-auto max-w-[440px] px-4 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:max-w-xl lg:max-w-5xl lg:px-8 lg:pt-5 lg:pb-12">
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
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Loader2 size={22} className="animate-spin text-slate-400" />
              </div>
            }
          >
            <AnalysisView />
          </Suspense>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="space-y-3.5 lg:sticky lg:top-32">
              {partnerJoined && <InstallHint onInstalled={setToast} />}
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
              <HeroCard onShowBreakdown={() => setModal('breakdown')} onShowBank={() => setModal('bank')} onAskSettle={askSettle} />
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
              <ExpenseList onEdit={openEdit} onDelete={askDelete} onAdd={openNew} onReopen={askSettle} />
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

      <ExpenseFormModal key={formNonce} open={modal === 'form'} onClose={close} expense={editing} onSaved={setToast} onDelete={askDelete} />
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

      <ActivityModal open={modal === 'activity'} onClose={closeActivity} lastSeen={lastSeen} />

      <Modal
        open={modal === 'settle'}
        onClose={close}
        title={config.settled ? `¿Reabrir ${label}?` : `¿Marcar ${label} como saldado?`}
        icon={config.settled ? LockOpen : Lock}
        footer={
          <>
            <button onClick={close} className={btnSecondary}>Cancelar</button>
            <button onClick={confirmSettle} className={btnPrimary} disabled={settling}>
              {settling && <Loader2 size={15} className="animate-spin" />}
              {config.settled ? 'Reabrir' : 'Sí, está saldado'}
            </button>
          </>
        }
      >
        <div className="space-y-2 pb-1 text-[13px] leading-relaxed text-slate-600">
          {config.settled ? (
            <p>Se van a poder volver a editar los gastos y el acuerdo de {label.split(' ')[0].toLowerCase()}. Queda registrado en la actividad.</p>
          ) : (
            <>
              {!settlement.isBalanced && settlement.debtor && (
                <p>
                  Confirmá que {profiles[settlement.debtor].name} ya le transfirió{' '}
                  <strong className="text-slate-900">{formatMoney(settlement.amountToTransfer)}</strong> a {profiles[settlement.creditor].name}.
                </p>
              )}
              {observed.length > 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                  Hay {observed.length === 1 ? '1 gasto observado' : `${observed.length} gastos observados`} sin resolver: al saldar, quedan afuera de
                  este mes.
                </p>
              )}
              <p>Los gastos y el acuerdo del mes quedan bloqueados para los dos. Si hace falta corregir algo, se puede reabrir.</p>
            </>
          )}
          <FormError>{settleError}</FormError>
        </div>
      </Modal>

      {(error || toast) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-8">
          <div
            role={error ? 'alert' : 'status'}
            className="animate-toast-in pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
          >
            {error ? (
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            ) : toast.icon === 'bell' ? (
              <Bell size={16} className="mt-0.5 shrink-0 text-sky-300 dark:text-sky-700" />
            ) : (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            )}
            <span>{error ?? toast.text}</span>
            {!error && toast.action && (
              <button
                onClick={() => {
                  toast.action.onClick();
                }}
                className="-my-1 ml-1 shrink-0 rounded-lg px-2 py-1 font-semibold text-emerald-300 hover:bg-white/10 dark:text-emerald-700"
              >
                {toast.action.label}
              </button>
            )}
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
