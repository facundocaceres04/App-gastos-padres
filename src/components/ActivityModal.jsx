import { CheckCircle2, History, Pencil, Plus, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { describeActivity, relativeTime } from '../utils/activity';

const TONE_ICON = { add: Plus, edit: Pencil, delete: Trash2, settle: CheckCircle2, info: Info };

/** Historial de cambios de la familia: quién hizo qué y cuándo (lo escribe la base, nadie lo edita). */
export default function ActivityModal({ open, onClose, lastSeen }) {
  const { activity, nameOf, profiles, userId } = useExpenses();

  return (
    <Modal open={open} onClose={onClose} title="Actividad" icon={History}>
      {activity.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-slate-500">Todavía no hay movimientos.</p>
      ) : (
        <ol className="-mx-1 space-y-0.5 pb-3">
          {activity.map((entry) => {
            const { text, detail, tone } = describeActivity(entry, { nameOf, profiles });
            const Icon = TONE_ICON[tone] ?? Info;
            const isNew = entry.actor !== userId && entry.created_at > lastSeen;
            return (
              <li key={entry.id} className={`flex gap-3 rounded-xl px-2 py-2.5 ${isNew ? 'bg-brand-50' : ''}`}>
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-slate-800">
                    {text}
                    {isNew && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-px text-[10px] font-semibold text-white dark:text-slate-900">Nuevo</span>}
                  </p>
                  {detail && <p className="mt-0.5 text-[12px] break-words text-slate-500">{detail}</p>}
                  <p className="mt-0.5 text-[11px] text-slate-500">{relativeTime(entry.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="pb-3 text-[11px] text-slate-500">El historial lo registra la app automáticamente y nadie lo puede editar ni borrar.</p>
    </Modal>
  );
}
