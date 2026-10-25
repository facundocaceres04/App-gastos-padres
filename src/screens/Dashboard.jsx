import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, ChevronRight, CloudOff, Loader2, UserPlus, X } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import Header from '../components/Header';
import HeroCard from '../components/HeroCard';
import ExpenseList from '../components/ExpenseList';
import BottomNav from '../components/BottomNav';
import ExpenseFormModal from '../components/ExpenseFormModal';
import BreakdownModal from '../components/BreakdownModal';
import BankDetailsModal from '../components/BankDetailsModal';
import SplitConfigModal from '../components/SplitConfigModal';
import SettingsView from '../components/SettingsView';
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

const SECTIONS = [
  ['balance', 'Balance'],
  ['gastos', 'Gastos'],
  ['analisis', 'Análisis'],
  ['ajustes', 'Ajustes'],
];
const sectionFromHash = () => {
  const h = window.location.hash.slice(1).split('?')[0];
  return SECTIONS.some(([id]) => id === h) ? h : 'balance';
};

// Los gráficos se bajan recién cuando se abre Análisis.
const PeriodView = lazy(() => import('../components/period/PeriodView'));

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
  // Cada opción del menú es su propia pantalla, con su dirección (#gastos, #analisis, #ajustes):
  // así el botón "atrás" del celular vuelve a la sección anterior.
  const [section, setSection] = useState(sectionFromHash);
  useEffect(() => {
    const onPop = () => setSection(sectionFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
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
  // Gastos que cargó el otro y todavía nadie revisó (para avisarlo desde el Balance).
  const toReview = config.settled
    ? 0
    : monthExpenses.filter((e) => e.createdBy && e.createdBy !== userId && (e.reviewStatus ?? 'pendiente') === 'pendiente').length;
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

  const goTo = (next) => {
    if (next !== section) {
      window.history.pushState(null, '', next === 'balance' ? window.location.pathname : `#${next}`);
      setSection(next);
    }
    window.scrollTo({ top: 0 });
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
      <Header
        onAdd={openNew}
        onActivity={() => setModal('activity')}
        unread={unread}
        showMonth={section !== 'ajustes' && section !== 'analisis'}
      />
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-[13px] text-amber-800">
          <CloudOff size={14} /> Sin conexión: lo que cargues no se guarda hasta que vuelva internet.
        </div>
      )}

      <main className="mx-auto max-w-[440px] px-4 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:max-w-xl lg:max-w-5xl lg:px-8 lg:pt-5 lg:pb-12">
        {/* Pestañas de escritorio (en mobile se usa la barra inferior) */}
        <div className="mb-6 hidden gap-6 border-b border-slate-200 lg:flex" role="tablist" aria-label="Secciones">
          {SECTIONS.map(([id, text]) => (
            <button
              key={id}
              role="tab"
              onClick={() => goTo(id)}
              aria-selected={section === id}
              className={`-mb-px border-b-2 pb-2.5 text-[15px] transition-colors ${
                section === id ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {text}
            </button>
          ))}
        </div>

        {section === 'analisis' ? (
          <Suspense
            fallback={
              // Esqueleto con la forma de la pantalla mientras se baja Análisis (se carga aparte).
              <div className="mx-auto max-w-xl animate-pulse space-y-5" role="status" aria-label="Cargando análisis">
                <div className="h-7 w-32 rounded-md bg-slate-200" />
                <div className="flex gap-2">
                  {[72, 76, 76, 84].map((w) => (
                    <div key={w} className="h-9 rounded-full bg-slate-200" style={{ width: w }} />
                  ))}
                </div>
                <div className="h-64 rounded-[20px] bg-slate-200/70" />
                <div className="h-48 rounded-[20px] bg-slate-200/50" />
              </div>
            }
          >
            <PeriodView onEdit={openEdit} />
          </Suspense>
        ) : (
          <div className="mx-auto max-w-xl">
            {section === 'balance' && (
              <div className="space-y-4">
                {partnerJoined && <InstallHint onInstalled={setToast} />}
                {!partnerJoined && (
                  <button
                    onClick={() => setModal('share')}
                    className="press flex w-full items-center justify-between gap-3 rounded-[16px] bg-brand-600 px-4 py-3.5 text-left text-white"
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">Falta {profiles[otherRole].name}</span>
                      <span className="block text-[13px] opacity-80">Pasale el código para que vean los mismos gastos.</span>
                    </span>
                    <UserPlus size={20} className="shrink-0" />
                  </button>
                )}
                <HeroCard
                  onShowBreakdown={() => setModal('breakdown')}
                  onShowBank={() => setModal('bank')}
                  onAskSettle={askSettle}
                  onChangeSplit={() => setModal('split')}
                  onCopySummary={() => copyText(summary(), 'Resumen copiado. Pegalo en WhatsApp.')}
                  onPreviewSummary={() => setModal('whatsapp')}
                />
                {monthExpenses.length > 0 && (
                  <button
                    onClick={() => goTo('gastos')}
                    className="press flex w-full items-center justify-between gap-3 rounded-[16px] border border-slate-200 px-4 py-3.5 text-left hover:bg-white"
                  >
                    <span className="text-[15px] text-slate-900">
                      Ver los {monthExpenses.length} {monthExpenses.length === 1 ? 'gasto' : 'gastos'} de{' '}
                      {label.split(' ')[0].toLowerCase()}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[14px] text-slate-500">
                      {toReview > 0 && <span className="font-medium text-brand-600">{toReview} para revisar</span>}
                      <ChevronRight size={18} />
                    </span>
                  </button>
                )}
              </div>
            )}
            {section === 'gastos' && <ExpenseList onEdit={openEdit} onDelete={askDelete} onAdd={openNew} onReopen={askSettle} />}
            {section === 'ajustes' && <SettingsView onSaved={setToast} onShare={() => setModal('share')} />}
          </div>
        )}
      </main>

      <BottomNav active={section} onNavigate={goTo} onAdd={openNew} />

      <ExpenseFormModal key={formNonce} open={modal === 'form'} onClose={close} expense={editing} onSaved={setToast} onDelete={askDelete} />
      <BreakdownModal open={modal === 'breakdown'} onClose={close} />
      <BankDetailsModal
        open={modal === 'bank'}
        onClose={close}
        onEditProfiles={() => {
          close();
          goTo('ajustes');
        }}
        onCopy={async (alias) => {
          await copyText(alias, 'CBU / Alias copiado al portapapeles');
          close();
        }}
      />
      <SplitConfigModal open={modal === 'split'} onClose={close} onSaved={setToast} />
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
        title={config.settled ? `¿Reabrir ${label.split(' ')[0].toLowerCase()}?` : `¿${label.split(' ')[0]} ya está saldado?`}
        footer={
          <>
            <button onClick={close} className={btnSecondary}>
              Cancelar
            </button>
            <button onClick={confirmSettle} className={btnPrimary} disabled={settling}>
              {settling && <Loader2 size={15} className="animate-spin" />}
              {config.settled ? 'Reabrir' : 'Sí, está saldado'}
            </button>
          </>
        }
      >
        <div className="space-y-3 pb-1 text-[15px] leading-relaxed text-slate-600">
          {config.settled ? (
            <p>
              Se van a poder volver a editar los gastos y el reparto de {label.split(' ')[0].toLowerCase()}. Queda registrado en la
              actividad.
            </p>
          ) : (
            <>
              {!settlement.isBalanced && settlement.debtor && (
                <p>
                  Confirmá que {profiles[settlement.debtor].name} ya le transfirió{' '}
                  <strong className="text-slate-900">{formatMoney(settlement.amountToTransfer)}</strong> a{' '}
                  {profiles[settlement.creditor].name}.
                </p>
              )}
              {observed.length > 0 && (
                <p className="border-l-2 border-amber-500 pl-3 text-[14px] text-amber-800">
                  Hay {observed.length === 1 ? '1 gasto observado' : `${observed.length} gastos observados`} sin resolver: al saldar, quedan
                  afuera de este mes.
                </p>
              )}
              <p>Los gastos y el reparto del mes quedan bloqueados para los dos. Si hace falta corregir algo, se puede reabrir.</p>
            </>
          )}
          <FormError>{settleError}</FormError>
        </div>
      </Modal>

      {(error || toast) && (
        // Con una hoja abierta (que sube desde abajo), el aviso va arriba para no tapar sus botones.
        <div
          className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${
            modal ? 'top-[calc(env(safe-area-inset-top)+0.75rem)]' : 'bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-8'
          }`}
        >
          <div
            role={error ? 'alert' : 'status'}
            className="animate-toast-in pointer-events-auto flex max-w-md items-start gap-2.5 rounded-[14px] bg-slate-900 py-3 pr-4 pl-3.5 text-[14px] text-white shadow-[0_10px_30px_-10px_rgba(26,23,20,0.5)]"
          >
            {error ? (
              <AlertCircle size={17} className="mt-px shrink-0 text-amber-400 dark:text-amber-700" />
            ) : toast.icon === 'bell' ? (
              <Bell size={17} className="mt-px shrink-0 opacity-70" />
            ) : (
              <CheckCircle2 size={17} className="mt-px shrink-0 opacity-70" />
            )}
            <span>{error ?? toast.text}</span>
            {!error && toast.action && (
              <button
                onClick={() => {
                  toast.action.onClick();
                }}
                className="-my-1 ml-1 shrink-0 rounded-lg px-2 py-1 font-semibold underline underline-offset-[3px] hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            )}
            {error && (
              <button
                onClick={clearError}
                className="-my-1 -mr-2 ml-1 shrink-0 rounded-full p-1.5 text-slate-400 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
