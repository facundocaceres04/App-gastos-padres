import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet en mobile, diálogo centrado en desktop (estilo Stitch).
 * Accesible: el foco queda atrapado adentro, vuelve al botón que lo abrió y Escape cierra.
 */
export default function Modal({ open, onClose, title, icon: Icon, children, footer }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const panel = panelRef.current;
    // Foco inicial: el elemento con autoFocus si lo hay; si no, el panel.
    requestAnimationFrame(() => {
      if (!panel.contains(document.activeElement)) panel.focus();
    });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-fade-in absolute inset-0 bg-slate-950/40 backdrop-blur-xs dark:bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-slide-up relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-slate-200 bg-white shadow-xl outline-none sm:max-w-sm sm:rounded-2xl"
      >
        <div className="mx-5 flex items-center justify-between border-b border-slate-100 pt-4 pb-1.5">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Icon size={15} />
              </div>
            )}
            <h3 id={titleId} className="font-display text-[15px] font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`overflow-y-auto overscroll-contain px-5 pt-4 ${footer ? 'pb-1' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>
        {footer && <div className="flex gap-2 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export const btnPrimary =
  'flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60';
export const btnSecondary =
  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60';
export const labelCls = 'mb-1 block text-[11px] font-semibold tracking-wider text-slate-500 uppercase';
export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500';

/** Mensaje de error dentro de un formulario o modal (no desaparece solo). */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
      {children}
    </p>
  );
}
