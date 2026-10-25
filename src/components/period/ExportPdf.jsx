import { useEffect, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import Modal, { FormError, btnPrimary, btnSecondary } from '../Modal';

const kb = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`;

/**
 * "Exportar PDF": arma el archivo en el celular (la librería se baja recién al tocar) y después ofrece
 * compartirlo o descargarlo. Compartir y descargar son toques aparte porque el celular solo deja
 * abrir el menú de compartir como respuesta directa a un toque.
 */
export default function ExportPdf({ getInput }) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null); // File listo
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const [note, setNote] = useState(null); // filtro de la lista aplicado, si hay

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { buildPeriodPdf, pdfFileName } = await import('../../utils/pdf');
      const input = getInput();
      const blob = await buildPeriodPdf(input);
      const f = new File([blob], pdfFileName(input), { type: 'application/pdf' });
      setNote(input.filterNote ?? null);
      setUrl(URL.createObjectURL(f));
      setFile(f);
    } catch (e) {
      setError(navigator.onLine ? `No se pudo armar el PDF: ${e.message}` : 'Para armar el PDF por primera vez hace falta internet.');
    } finally {
      setBusy(false);
    }
  };

  const canShare = file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const share = async () => {
    try {
      await navigator.share({ files: [file], title: file.name });
    } catch (e) {
      if (e.name !== 'AbortError') setError('No se pudo compartir. Probá con "Descargar".');
    }
  };
  const close = () => {
    setFile(null);
    setError(null);
  };

  return (
    <>
      <button
        onClick={generate}
        disabled={busy}
        className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[14px] font-medium text-slate-800 hover:border-slate-400 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
        {busy ? 'Armando…' : 'Exportar PDF'}
      </button>
      {error && !file && (
        <p role="alert" className="mt-2 text-[13px] text-amber-700">
          {error}
        </p>
      )}

      <Modal
        open={Boolean(file)}
        onClose={close}
        title="PDF listo"
        footer={
          <>
            <a
              href={url ?? undefined}
              download={file?.name}
              onClick={() => setTimeout(close, 300)}
              className={canShare ? btnSecondary : btnPrimary}
            >
              Descargar
            </a>
            {canShare && (
              <button onClick={share} className={btnPrimary}>
                Compartir
              </button>
            )}
          </>
        }
      >
        {file && (
          <div className="pb-1">
            <p className="text-[15px] font-medium break-all text-slate-900">{file.name}</p>
            <p className="mt-1 text-[14px] text-slate-500">
              {kb(file.size)} · resumen, mes a mes, categorías y {note ? `los gastos filtrados (${note})` : 'todos los gastos del período'}.{' '}
              <a href={url} target="_blank" rel="noreferrer" className="text-slate-900 underline underline-offset-[3px]">
                Verlo
              </a>
            </p>
            <FormError>{error}</FormError>
          </div>
        )}
      </Modal>
    </>
  );
}
