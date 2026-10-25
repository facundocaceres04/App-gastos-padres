import { Copy, MessageCircle } from 'lucide-react';
import Modal, { btnSecondary } from './Modal';

/** Vista previa del resumen con opción de copiar o abrir WhatsApp directamente. */
export default function WhatsAppPreviewModal({ open, onClose, text, onCopy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumen para WhatsApp"
      icon={MessageCircle}
      footer={
        <>
          <button onClick={onCopy} className={btnSecondary}>
            <Copy size={14} /> Copiar
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[12px] font-semibold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <MessageCircle size={14} /> Abrir WhatsApp
          </a>
        </>
      }
    >
      <pre className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 font-sans text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700">
        {text}
      </pre>
    </Modal>
  );
}
