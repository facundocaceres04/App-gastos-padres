import { Copy, Landmark } from 'lucide-react';
import Modal, { btnPrimary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { formatMoney } from '../utils/formatters';

/** Datos para transferir al acreedor del mes. */
export default function BankDetailsModal({ open, onClose, onCopy, onEditProfiles }) {
  const { settlement: s, profiles } = useExpenses();
  if (!s.creditor) return null;
  const creditor = profiles[s.creditor];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Datos para transferir"
      icon={Landmark}
      footer={
        <button
          onClick={() => onCopy(creditor.alias)}
          disabled={!creditor.alias}
          className={`${btnPrimary} disabled:opacity-40`}
        >
          <Copy size={15} /> Copiar CBU / Alias
        </button>
      }
    >
      <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Destinatario</span>
          <span className="font-semibold text-slate-800">{creditor.name}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="text-slate-600">CBU / Alias:</span>
          {creditor.alias ? (
            <span className="truncate font-mono font-bold text-slate-900">{creditor.alias}</span>
          ) : (
            <button onClick={onEditProfiles} className="text-[12px] font-semibold text-brand-600 hover:underline">
              Cargar en Ajustes
            </button>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-[12px]">
          <span className="text-slate-600">Monto exacto:</span>
          <span className="font-display text-[14px] font-bold text-emerald-600 tabular-nums">{formatMoney(s.amountToTransfer)}</span>
        </div>
      </div>
    </Modal>
  );
}
