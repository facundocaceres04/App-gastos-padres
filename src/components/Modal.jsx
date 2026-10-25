import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hoja que sube desde abajo en mobile, diálogo centrado en desktop.
 * `icon` se acepta por compatibilidad pero no se dibuja: el título alcanza.
 * Accesible: el foco queda atrapado adentro, vuelve al botón que lo abrió y Escape cierra.
 */
export default function Modal({ open, onClose, title, children, footer }) {
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
      <div className="animate-fade-in absolute inset-0 bg-[#1a1714]/45 dark:bg-black/65" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet-up relative flex max-h-[92dvh] w-full flex-col rounded-t-[20px] bg-white shadow-[0_-8px_30px_rgba(26,23,20,0.12)] outline-none sm:max-w-[400px] sm:rounded-[16px] sm:shadow-[0_20px_50px_rgba(26,23,20,0.18)]"
      >
        {/* Agarradera: indica que es una hoja (solo mobile) */}
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5">
          <h3 id={titleId} className="font-display pt-1 text-[21px] leading-tight font-medium tracking-[-0.01em] text-slate-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`overflow-y-auto overscroll-contain px-5 pt-3 ${footer ? 'pb-1' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'}`}>
          {children}
        </div>
        {footer && <div className="flex gap-2 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export const btnPrimary =
  'press flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-slate-900 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50';
export const btnSecondary =
  'press flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-slate-100 px-4 text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-50';
export const labelCls = 'mb-1.5 block text-[13px] font-medium text-slate-600';
export const inputCls =
  'w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500';

/** Mensaje de error dentro de un formulario o modal (no desaparece solo). */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="border-l-2 border-amber-500 py-0.5 pl-3 text-[13px] text-amber-800">
      {children}
    </p>
  );
}
