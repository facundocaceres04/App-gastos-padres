import Modal, { btnSecondary } from './Modal';

/** Vista previa del resumen tal como se va a ver en el chat, con copiar o abrir WhatsApp. */
export default function WhatsAppPreviewModal({ open, onClose, text, onCopy }) {
  // El resumen usa *negrita* y _cursiva_ de WhatsApp: acá se muestra igual que en el chat.
  const render = (line) =>
    line.split(/(\*[^*]+\*|_[^_]+_)/g).map((part, i) =>
      part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
        <strong key={i}>{part.slice(1, -1)}</strong>
      ) : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resumen para WhatsApp"
      footer={
        <>
          <button onClick={onCopy} className={btnSecondary}>
            Copiar
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
            className="press flex h-12 flex-1 items-center justify-center rounded-[12px] bg-[#1f8a4c] text-[15px] font-semibold text-white hover:bg-[#19753f]"
          >
            Abrir WhatsApp
          </a>
        </>
      }
    >
      <div className="-mx-5 bg-[#efe7dd] px-4 py-4 dark:bg-[#0b141a]">
        <div data-resumen className="ml-auto max-w-[92%] rounded-[10px] rounded-tr-[3px] bg-[#d9fdd3] px-3 py-2 text-[14px] leading-[1.45] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] dark:bg-[#005c4b] dark:text-[#e9edef]">
          {text.split('\n').map((line, i) => (
            <p key={i} className="min-h-[0.9em] break-words">
              {render(line)}
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
}
