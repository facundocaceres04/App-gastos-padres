import { useState } from 'react';
import { CheckCircle2, Clock, Eye, Loader2 } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { FormError } from './Modal';

const REASONS = ['Falta el comprobante', 'No lo habíamos acordado', 'El monto no coincide', 'Ya estaba cargado'];

/** Estado de revisión de un gasto. El progenitor que NO lo cargó puede aceptarlo u observarlo. */
export default function ReviewPanel({ expense, locked, onDone }) {
  const { userId, nameOf, reviewExpense, partnerJoined } = useExpenses();
  const [mode, setMode] = useState(null); // null | 'observar'
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const canReview = expense.createdBy && expense.createdBy !== userId && !locked;
  const reviewer = expense.reviewedBy ? nameOf(expense.reviewedBy) : null;
  const other = expense.createdBy === userId ? null : nameOf(expense.createdBy);

  const send = async (status, text) => {
    setBusy(true);
    setError(null);
    const err = await reviewExpense(expense.id, status, text);
    setBusy(false);
    if (err) return setError(err);
    onDone?.(status === 'aceptado' ? 'Gasto aceptado' : status === 'observado' ? 'Gasto observado' : 'Revisión deshecha');
  };

  const status = expense.reviewStatus ?? 'pendiente';
  let summary;
  if (status === 'aceptado') {
    summary = (
      <p className="flex items-center gap-1.5 text-sage-700">
        <CheckCircle2 size={15} /> {reviewer ?? 'El otro progenitor'} lo aceptó
      </p>
    );
  } else if (status === 'observado') {
    summary = (
      <div className="text-amber-800">
        <p className="flex items-center gap-1.5 font-medium">
          <Eye size={15} /> {reviewer ?? 'El otro progenitor'} lo observó
        </p>
        {expense.reviewNote && <p className="mt-1 text-slate-900">“{expense.reviewNote}”</p>}
        <p className="mt-1 text-[13px] text-slate-600">
          No cuenta en el balance hasta que se resuelva{canReview ? '' : ': podés corregirlo y vuelve a quedar pendiente'}.
        </p>
      </div>
    );
  } else {
    summary = (
      <p className="flex items-center gap-1.5 text-slate-600">
        <Clock size={15} />
        {canReview ? `Cargado por ${other}: ¿está bien?` : partnerJoined ? 'Pendiente de revisión del otro progenitor' : 'Pendiente de revisión'}
      </p>
    );
  }

  return (
    <section
      className={`space-y-3 border-l-2 py-0.5 pl-3.5 text-[14px] leading-relaxed ${
        status === 'observado' ? 'border-amber-500' : status === 'aceptado' ? 'border-sage-500' : 'border-brand-600'
      }`}
    >
      {summary}

      {canReview && mode !== 'observar' && (
        <div className="flex gap-2">
          {status !== 'aceptado' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => send('aceptado')}
              className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-slate-900 text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aceptar
            </button>
          )}
          {status !== 'observado' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('observar')}
              className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-slate-100 text-[14px] font-semibold text-slate-800 hover:bg-slate-200"
            >
              <Eye size={14} /> Observar
            </button>
          )}
          {status !== 'pendiente' && (
            <button type="button" disabled={busy} onClick={() => send('pendiente')} className="rounded-[10px] px-3 text-[13px] font-medium text-slate-500 underline underline-offset-[3px] hover:text-slate-800">
              Deshacer
            </button>
          )}
        </div>
      )}

      {canReview && mode === 'observar' && (
        <div className="space-y-2">
          <p className="text-[13px] text-slate-600">¿Qué hay que revisar? El gasto deja de contar hasta que se resuelva.</p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNote(r)}
                aria-pressed={note === r}
                className={`press rounded-full border px-3 py-1.5 text-[13px] ${
                  note === r ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder="U otro motivo, breve"
            aria-label="Motivo de la observación"
            className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-[15px] focus:border-slate-900 focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode(null)} className="press h-11 flex-1 rounded-[10px] bg-slate-100 text-[14px] font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => send('observado', note.trim())}
              className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-slate-900 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Enviar observación
            </button>
          </div>
        </div>
      )}
      <FormError>{error}</FormError>
    </section>
  );
}
