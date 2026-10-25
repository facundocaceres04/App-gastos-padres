import { useEffect } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

const AUTO_RETRY_MS = 8000;

/** Error de carga con opción de reintentar (sin conexión, servidor caído, etc.). */
export default function RetryScreen({ message, onRetry }) {
  // Reintenta sola mientras la app está a la vista: vuelve apenas hay internet, sin tocar nada.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && onRetry(), AUTO_RETRY_MS);
    return () => clearInterval(t);
  }, [onRetry]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
      <WifiOff size={28} className="text-slate-400" />
      <p className="max-w-xs text-[14px] text-slate-700">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800"
      >
        <RefreshCw size={15} /> Reintentar
      </button>
      <p className="text-[12px] text-slate-500">Se vuelve a intentar sola en unos segundos.</p>
    </div>
  );
}
