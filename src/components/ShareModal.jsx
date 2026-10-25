import { Copy, MessageCircle, UserPlus } from 'lucide-react';
import Modal, { btnSecondary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';

/** Código para que el otro progenitor se una a la familia. */
export default function ShareModal({ open, onClose, onCopy }) {
  const { inviteCode, partnerJoined, profiles, otherRole } = useExpenses();
  const link = `${window.location.origin}/?codigo=${inviteCode}`;
  const other = profiles[otherRole].name;
  const message =
    `Hola ${other}! Sumate a *Cuentas Claras* para llevar juntos los gastos de los chicos 🧾\n\n` +
    `1. Entrá a ${link}\n2. Creá tu cuenta\n3. Si te lo pide, usá el código: *${inviteCode}*`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartir con el otro progenitor"
      icon={UserPlus}
      footer={
        <>
          <button onClick={() => onCopy(link, 'Link copiado')} className={btnSecondary}>
            <Copy size={14} /> Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[12px] font-semibold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <MessageCircle size={14} /> Enviar por WhatsApp
          </a>
        </>
      }
    >
      <div className="space-y-3 text-[12px] text-slate-600">
        {partnerJoined ? (
          <p className="rounded-xl border border-sage-100 bg-sage-50 p-3 text-sage-700">
            {other} ya está en la familia. Los dos ven y editan los mismos gastos en tiempo real.
          </p>
        ) : (
          <p className="leading-relaxed">
            Pasale este código a <strong>{other}</strong>. Cuando cree su cuenta e ingrese el código, van a ver los mismos gastos y el mismo
            balance, actualizados al instante.
          </p>
        )}
        <button
          onClick={() => onCopy(inviteCode, 'Código copiado')}
          className="group w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-4 text-center transition hover:border-brand-600"
          title="Copiar código"
        >
          <span className="font-display block text-[30px] font-bold tracking-[0.35em] text-slate-900">{inviteCode}</span>
          <span className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-400 group-hover:text-brand-600">
            <Copy size={11} /> Tocá para copiar
          </span>
        </button>
      </div>
    </Modal>
  );
}
