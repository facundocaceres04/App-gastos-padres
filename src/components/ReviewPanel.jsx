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
        {expense.reviewNote && <p className="mt-1 text-[12px]">“{expense.reviewNote}”</p>}
        <p className="mt-1 text-[12px] text-slate-600">
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
      className={`space-y-2.5 rounded-xl p-3 text-[13px] ${status === 'observado' ? 'bg-amber-50' : status === 'aceptado' ? 'bg-sage-50' : 'bg-slate-50'}`}
    >
      {summary}

      {canReview && mode !== 'observar' && (
        <div className="flex gap-2">
          {status !== 'aceptado' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => send('aceptado')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aceptar
            </button>
          )}
          {status !== 'observado' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('observar')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-[13px] font-semibold text-slate-700"
            >
              <Eye size={14} /> Observar
            </button>
          )}
          {status !== 'pendiente' && (
            <button type="button" disabled={busy} onClick={() => send('pendiente')} className="rounded-xl px-3 text-[12px] font-medium text-slate-500 hover:text-slate-800">
              Deshacer
            </button>
          )}
        </div>
      )}

      {canReview && mode === 'observar' && (
        <div className="space-y-2">
          <p className="text-[12px] text-slate-600">¿Qué hay que revisar? El gasto deja de contar hasta que se resuelva.</p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNote(r)}
                aria-pressed={note === r}
                className={`rounded-full px-3 py-1.5 text-[12px] ring-1 transition ${
                  note === r ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200'
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] focus:border-brand-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-600">
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => send('observado', note.trim())}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
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
