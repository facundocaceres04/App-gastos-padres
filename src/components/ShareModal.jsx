import { useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import Modal, { FormError, btnSecondary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';

/** Código para que el otro progenitor se una a la familia. No vence; se puede renovar para invalidar el anterior. */
export default function ShareModal({ open, onClose, onCopy }) {
  const { inviteCode, rotateInviteCode, partnerJoined, profiles, otherRole } = useExpenses();
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState(null);
  const link = `${window.location.origin}/?codigo=${inviteCode}`;
  const other = profiles[otherRole].name;
  const message =
    `Hola ${other}! Sumate a *Cuentas Claras* para llevar juntos los gastos de los chicos 🧾\n\n` +
    `1. Entrá a ${link}\n2. Creá tu cuenta\n3. Si te lo pide, usá el código: *${inviteCode}*`;

  const rotate = async () => {
    setRotating(true);
    setError(null);
    const err = await rotateInviteCode();
    setRotating(false);
    if (err) setError(err);
  };

  if (partnerJoined) {
    return (
      <Modal open={open} onClose={onClose} title="Compartir">
        <p className="pb-2 text-[15px] leading-relaxed text-slate-600">
          {other} ya está en la familia. Los dos ven los mismos gastos y cada cambio le llega al otro al instante.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invitar a ${other}`}
      footer={
        <>
          <button onClick={() => onCopy(link, 'Link copiado')} className={btnSecondary}>
            Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="press flex h-12 flex-1 items-center justify-center rounded-[12px] bg-[#1f8a4c] text-[15px] font-semibold text-white hover:bg-[#19753f]"
          >
            Mandar por WhatsApp
          </a>
        </>
      }
    >
      <div className="space-y-5 pb-1">
        <p className="text-[15px] leading-relaxed text-slate-600">
          Cuando {other} cree su cuenta y ponga este código, van a ver los mismos gastos y el mismo balance.
        </p>
        <button
          onClick={() => onCopy(inviteCode, 'Código copiado')}
          className="press group flex w-full items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-left"
          title="Copiar código"
        >
          <span className="font-display text-[34px] leading-none font-medium tracking-[0.25em] text-slate-900">{inviteCode}</span>
          <span className="flex items-center gap-1.5 text-[14px] text-slate-500 group-hover:text-slate-900">
            <Copy size={15} /> Copiar
          </span>
        </button>
        <p className="text-[14px] leading-relaxed text-slate-500">
          ¿Lo mandaste a quien no era?{' '}
          <button
            onClick={rotate}
            disabled={rotating}
            className="inline-flex items-center gap-1 font-medium text-slate-900 underline underline-offset-[3px] disabled:opacity-60"
          >
            {rotating && <Loader2 size={13} className="animate-spin" />} Generar código nuevo
          </button>{' '}
          y el anterior deja de servir.
        </p>
        <FormError>{error}</FormError>
      </div>
    </Modal>
  );
}
