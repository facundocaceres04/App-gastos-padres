import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { labelCls } from './Modal';

/**
 * Comprobante del gasto (foto o PDF). `value` es el estado del formulario:
 * { file } si se eligió uno nuevo, { remove: true } si se quitó, o null si no cambió.
 */
export default function ReceiptField({ existingPath, value, onChange, disabled }) {
  const { receiptUrl } = useExpenses();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { url, isPdf }
  const [loading, setLoading] = useState(false);

  const file = value?.file ?? null;
  const showExisting = existingPath && !value;

  // Vista previa: archivo nuevo (URL local) o existente (URL firmada temporal).
  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setPreview({ url: objectUrl, isPdf: file.type === 'application/pdf' });
    } else if (showExisting) {
      setLoading(true);
      receiptUrl(existingPath).then((url) => {
        if (cancelled) return;
        setLoading(false);
        setPreview(url ? { url, isPdf: existingPath.endsWith('.pdf') } : null);
      });
    } else {
      setPreview(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, existingPath, showExisting]);

  const hasReceipt = Boolean(file || showExisting);

  return (
    <div>
      <span className={labelCls}>Comprobante</span>
      {hasReceipt ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <a
            href={preview?.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"
            aria-label="Ver comprobante"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-slate-400" />
            ) : preview && !preview.isPdf ? (
              <img src={preview.url} alt="Comprobante" className="h-full w-full object-cover" />
            ) : (
              <FileText size={22} className="text-slate-500" />
            )}
          </a>
          <div className="min-w-0 flex-1 text-[12px]">
            <p className="truncate font-medium text-slate-800">{file ? file.name : 'Comprobante adjunto'}</p>
            {preview?.url && (
              <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                Ver <ExternalLink size={11} />
              </a>
            )}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(existingPath ? { remove: true } : null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200"
              aria-label="Quitar comprobante"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-[13px] font-medium text-slate-600 transition hover:border-brand-600 hover:text-brand-600 disabled:opacity-50"
        >
          <Paperclip size={15} /> Adjuntar foto o PDF
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange({ file: f });
          e.target.value = '';
        }}
      />
    </div>
  );
}
