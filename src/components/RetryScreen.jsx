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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <WifiOff size={26} strokeWidth={1.6} className="text-slate-400" />
      <p className="font-display max-w-xs text-[22px] leading-snug font-medium text-slate-900">{message}</p>
      <button
        onClick={onRetry}
        className="press flex h-11 items-center gap-1.5 rounded-[12px] bg-slate-900 px-5 text-[15px] font-semibold text-white hover:bg-slate-800"
      >
        <RefreshCw size={15} /> Reintentar
      </button>
      <p className="text-[14px] text-slate-500">Se vuelve a intentar sola en unos segundos.</p>
    </div>
  );
}
