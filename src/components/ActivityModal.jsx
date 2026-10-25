import Modal from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { describeActivity, relativeTime } from '../utils/activity';

const TONE_DOT = { add: 'bg-sage-500', edit: 'bg-amber-500', delete: 'bg-slate-400', settle: 'bg-brand-600', info: 'bg-slate-300' };

/** Historial de cambios de la familia: quién hizo qué y cuándo (lo escribe la base, nadie lo edita). */
export default function ActivityModal({ open, onClose, lastSeen }) {
  const { activity, nameOf, profiles, userId } = useExpenses();

  return (
    <Modal open={open} onClose={onClose} title="Actividad">
      {activity.length === 0 ? (
        <p className="py-6 text-[15px] text-slate-500">Todavía no pasó nada. Cuando alguno cargue o cambie algo, va a aparecer acá.</p>
      ) : (
        <ol className="relative pb-3">
          {/* Línea de tiempo */}
          <span className="absolute top-3 bottom-6 left-[3px] w-px bg-slate-200" aria-hidden="true" />
          {activity.map((entry) => {
            const { text, detail, tone } = describeActivity(entry, { nameOf, profiles });
            const isNew = entry.actor !== userId && entry.created_at > lastSeen;
            return (
              <li key={entry.id} className="relative flex gap-3.5 py-2.5">
                <span className={`relative mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full ring-4 ring-white ${TONE_DOT[tone] ?? 'bg-slate-300'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] leading-snug ${isNew ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>
                    {text}
                    {isNew && <span className="ml-2 text-[12px] font-semibold text-brand-600">Nuevo</span>}
                  </p>
                  {detail && <p className="mt-0.5 text-[13px] break-words text-slate-500">{detail}</p>}
                  <p className="mt-0.5 text-[12px] text-slate-400">{relativeTime(entry.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="pb-3 text-[13px] text-slate-500">Lo anota la app sola. Nadie lo puede editar ni borrar.</p>
    </Modal>
  );
}
