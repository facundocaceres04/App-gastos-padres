import { Copy } from 'lucide-react';
import Modal, { btnPrimary } from './Modal';
import { Amount } from './HeroCard';
import { useExpenses } from '../context/ExpensesContext';

/** Lo necesario para transferir: a quién, cuánto y a qué alias. */
export default function BankDetailsModal({ open, onClose, onCopy, onEditProfiles }) {
  const { settlement: s, profiles } = useExpenses();
  if (!s.creditor) return null;
  const creditor = profiles[s.creditor];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pasarle a ${creditor.name}`}
      footer={
        <button onClick={() => onCopy(creditor.alias)} disabled={!creditor.alias} className={btnPrimary}>
          <Copy size={16} /> Copiar alias
        </button>
      }
    >
      <div className="pb-2">
        <Amount value={s.amountToTransfer} className="block text-[40px] leading-none font-medium tracking-[-0.025em] text-slate-900" />
        <p className="mt-1.5 text-[14px] text-slate-500">el monto exacto de este mes</p>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-[13px] text-slate-500">CBU o alias de {creditor.name}</p>
          {creditor.alias ? (
            <p className="mt-1 text-[20px] font-semibold tracking-[0.01em] break-all text-slate-900 select-all">{creditor.alias}</p>
          ) : (
            <p className="mt-1 text-[15px] text-slate-600">
              Todavía no lo cargó.{' '}
              <button onClick={onEditProfiles} className="font-medium text-slate-900 underline underline-offset-[3px]">
                Ir a Ajustes
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
