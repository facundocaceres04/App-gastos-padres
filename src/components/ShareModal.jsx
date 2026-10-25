import { useState } from 'react';
import { Copy, Loader2, MessageCircle, RefreshCw, UserPlus } from 'lucide-react';
import Modal, { FormError, btnSecondary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';

const shortDate = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

/** Código para que el otro progenitor se una a la familia. Vence a los 7 días y se puede renovar. */
export default function ShareModal({ open, onClose, onCopy }) {
  const { inviteCode, inviteExpiresAt, rotateInviteCode, partnerJoined, profiles, otherRole } = useExpenses();
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState(null);
  const link = `${window.location.origin}/?codigo=${inviteCode}`;
  const other = profiles[otherRole].name;
  const expired = inviteExpiresAt && new Date(inviteExpiresAt) <= new Date();
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
      <Modal open={open} onClose={onClose} title="Compartir con el otro progenitor" icon={UserPlus}>
        <p className="rounded-xl border border-sage-100 bg-sage-50 p-3 text-[12px] text-sage-700">
          {other} ya está en la familia. Los dos ven y editan los mismos gastos en tiempo real.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartir con el otro progenitor"
      icon={UserPlus}
      footer={
        expired ? null : (
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
        )
      }
    >
      <div className="space-y-3 text-[12px] text-slate-600">
        <p className="leading-relaxed">
          Pasale este código a <strong>{other}</strong>. Cuando cree su cuenta e ingrese el código, van a ver los mismos gastos y el mismo
          balance, actualizados al instante.
        </p>
        {expired ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
            <p className="font-semibold">El código {inviteCode} venció</p>
            <p className="mt-0.5">Por seguridad, los códigos duran 7 días. Generá uno nuevo para compartir.</p>
          </div>
        ) : (
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
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">{inviteExpiresAt && !expired && `Vence el ${shortDate(inviteExpiresAt)}`}</span>
          <button
            onClick={rotate}
            disabled={rotating}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-60"
          >
            {rotating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Generar código nuevo
          </button>
        </div>
        <FormError>{error}</FormError>
      </div>
    </Modal>
  );
}
