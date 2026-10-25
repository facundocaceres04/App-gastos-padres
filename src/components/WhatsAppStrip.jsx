import { Copy, Send } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { formatMoney } from '../utils/formatters';

/** Franja discreta para copiar el resumen del mes para WhatsApp. */
export default function WhatsAppStrip({ onCopy, onPreview }) {
  const { settlement: s, profiles, monthExpenses } = useExpenses();
  if (!monthExpenses.length) return null;

  const text = s.isBalanced
    ? 'Resumen con balance cerrado listo'
    : `Resumen listo: ${profiles[s.debtor].name} transfiere ${formatMoney(s.amountToTransfer)}`;

  return (
    <section className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-xs">
      <button onClick={onPreview} className="flex min-w-0 items-center gap-2 text-left" title="Ver vista previa">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Send size={13} />
        </div>
        <p className="truncate text-[12px] font-medium text-slate-600">{text}</p>
      </button>
      <button
        onClick={onCopy}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
      >
        <Copy size={13} /> Copiar
      </button>
    </section>
  );
}
