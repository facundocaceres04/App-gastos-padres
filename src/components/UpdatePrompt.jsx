import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

/** Registra el service worker y avisa cuando hay una versión nueva publicada. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // La app instalada puede quedar abierta días: busca versiones nuevas cada hora y al volver a ella.
      const check = () => navigator.onLine && registration.update().catch(() => {});
      setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    },
  });

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[70] flex justify-center px-4"
    >
      <div className="animate-slide-up flex w-full max-w-sm items-center gap-3 rounded-2xl bg-slate-900 py-2.5 pr-2.5 pl-4 text-[13px] text-white shadow-xl">
        <RefreshCw size={16} className="shrink-0" />
        <span className="flex-1">Hay una versión nueva de la app.</span>
        <button onClick={() => setNeedRefresh(false)} className="rounded-lg px-2 py-1.5 text-[12px] font-medium opacity-80 hover:opacity-100">
          Después
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
