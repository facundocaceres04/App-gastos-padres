import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Bottom sheet en mobile, diálogo centrado en desktop (estilo Stitch). */
export default function Modal({ open, onClose, title, icon: Icon, children, footer }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="animate-fade-in absolute inset-0 bg-slate-950/40 backdrop-blur-xs dark:bg-black/60" onClick={onClose} />
      <div className="animate-slide-up relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:max-w-sm sm:rounded-2xl">
        <div className="mx-5 flex items-center justify-between border-b border-slate-100 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Icon size={15} />
              </div>
            )}
            <h3 className="font-display text-[14px] font-bold text-slate-900">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-4 pb-1">{children}</div>
        {footer && <div className="flex gap-2 px-5 pt-3 pb-5">{footer}</div>}
      </div>
    </div>
  );
}

export const btnPrimary =
  'flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[12px] font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98]';
export const btnSecondary =
  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50';
export const labelCls = 'mb-1 block text-[11px] font-semibold tracking-wider text-slate-500 uppercase';
export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none';
