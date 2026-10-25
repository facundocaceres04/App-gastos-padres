import { useMemo, useState } from 'react';
import { Check, Lock, Paperclip, Pencil, Search, Trash2, X } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { getCategory } from '../data/categories';
import SwipeToDelete from './SwipeToDelete';
import { formatMoney, todayISO } from '../utils/formatters';

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dayInfo = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const isToday = iso === todayISO();
  return { day: d, weekday: isToday ? 'hoy' : WEEKDAYS[new Date(y, m - 1, d).getDay()] };
};

/** Gastos del mes como un registro: día a la izquierda, concepto y monto, con filtros y búsqueda. */
export default function ExpenseList({ onEdit, onDelete, onAdd, onReopen }) {
  const { monthExpenses, profiles, userId, nameOf, config, label } = useExpenses();
  const locked = config.settled;
  // Gastos que cargó el otro y todavía nadie revisó: los revisa quien está mirando.
  const isToReview = (e) => e.createdBy && e.createdBy !== userId && (e.reviewStatus ?? 'pendiente') === 'pendiente' && !locked;
  const [payer, setPayer] = useState('todos');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const monthLower = label.split(' ')[0].toLowerCase();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = [];
    monthExpenses
      .filter((e) => {
        const byTab = payer === 'todos' || (payer === 'revisar' ? isToReview(e) : e.paidBy === payer);
        return byTab && (!q || e.concept.toLowerCase().includes(q));
      })
      .forEach((e) => {
        const last = out[out.length - 1];
        if (last?.date === e.date) last.items.push(e);
        else out.push({ date: e.date, items: [e] });
      });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthExpenses, payer, query, userId]);

  const toReview = monthExpenses.filter(isToReview).length;
  const tabs = [
    { id: 'todos', label: 'Todos' },
    { id: 'padre', label: profiles.padre.name },
    { id: 'madre', label: profiles.madre.name },
    ...(toReview || payer === 'revisar' ? [{ id: 'revisar', label: 'Revisar', count: toReview }] : []),
  ];

  return (
    <section id="historico" className="scroll-mt-24" aria-labelledby="gastos-title">
      <div className="flex items-end justify-between gap-2 px-1">
        <h2 id="gastos-title" className="font-display text-[24px] leading-none font-medium tracking-[-0.015em] text-slate-900">
          Gastos
          {monthExpenses.length > 0 && <span className="ml-2 text-[15px] text-slate-400 tabular-nums">{monthExpenses.length}</span>}
        </h2>
        <button
          onClick={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setQuery('');
          }}
          className="press -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          aria-label="Buscar concepto"
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </div>

      {searchOpen && (
        <div className="animate-fade-in mt-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por concepto"
            aria-label="Buscar por concepto"
            className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-[15px] focus:border-slate-900 focus:outline-none"
          />
        </div>
      )}

      {monthExpenses.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-5 overflow-x-auto border-b border-slate-200 px-5" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={payer === t.id}
              onClick={() => setPayer(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pt-1 pb-2.5 text-[14px] transition-colors ${
                payer === t.id ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className="rounded-full bg-brand-600 px-1.5 text-[11px] leading-[18px] font-semibold text-white tabular-nums">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {locked && monthExpenses.length > 0 && (
        <p className="mt-3 flex items-center gap-2 px-1 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0" />
          <span>
            {label.split(' ')[0]} está saldado y no se puede editar.{' '}
            <button onClick={onReopen} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-[3px]">
              Reabrir
            </button>
          </span>
        </p>
      )}

      {groups.length === 0 ? (
        <div className="px-1 py-10">
          {monthExpenses.length ? (
            <>
              <p className="text-[15px] text-slate-600">No hay gastos para este filtro.</p>
              <button
                onClick={() => {
                  setPayer('todos');
                  setQuery('');
                  setSearchOpen(false);
                }}
                className="mt-1 text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-[3px]"
              >
                Ver todos
              </button>
            </>
          ) : (
            <>
              <p className="text-[15px] text-slate-600">Ningún gasto cargado en {monthLower}.</p>
              <button
                onClick={onAdd}
                className="mt-1 text-[15px] font-medium text-slate-900 underline decoration-slate-300 underline-offset-[3px]"
              >
                Cargar el primero
              </button>
            </>
          )}
        </div>
      ) : (
        <ol className="mt-1">
          {groups.map((g) => {
            const { day, weekday } = dayInfo(g.date);
            return (
              <li key={g.date} className="grid grid-cols-[2.75rem_1fr] border-b border-slate-200/70 last:border-b-0">
                <time dateTime={g.date} className="block pt-3.5 pl-1 leading-none">
                  <span className="font-display block text-[22px] font-medium text-slate-900 tabular-nums">{day}</span>
                  <span className="mt-1 block text-[12px] text-slate-500">{weekday}</span>
                </time>
                <ul>
                  {g.items.map((e) => {
                    const cat = getCategory(e.category);
                    const observed = e.reviewStatus === 'observado';
                    const meta = [e.child, cat.label, e.createdBy && e.createdBy !== userId ? `cargó ${nameOf(e.createdBy)}` : null].filter(
                      Boolean,
                    );
                    return (
                      <li key={e.id}>
                        <SwipeToDelete onDelete={() => onDelete(e)} disabled={locked} label="Borrar">
                          <div className="group flex items-start transition-colors hover:bg-white">
                            <button
                              onClick={() => onEdit(e)}
                              className="flex min-w-0 flex-1 items-start justify-between gap-3 py-3 pr-1 pl-2 text-left"
                            >
                              <div className="min-w-0">
                                <h4
                                  className={`truncate text-[15px] leading-snug font-medium ${observed ? 'text-slate-500' : 'text-slate-900'}`}
                                >
                                  {e.concept}
                                </h4>
                                <p className="mt-0.5 truncate text-[13px] text-slate-500">{meta.join(' · ')}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <span
                                  className={`flex items-center justify-end gap-1 text-[15px] leading-snug font-semibold tabular-nums ${
                                    observed ? 'text-slate-400 line-through decoration-1' : 'text-slate-900'
                                  }`}
                                >
                                  {e.receiptPath && <Paperclip size={13} className="text-slate-400" aria-label="Con comprobante" />}
                                  {formatMoney(e.amount)}
                                </span>
                                {observed ? (
                                  <span className="mt-0.5 block text-[13px] text-amber-700">Observado</span>
                                ) : isToReview(e) ? (
                                  <span className="mt-0.5 block text-[13px] font-medium text-brand-600">Para revisar</span>
                                ) : (
                                  <span className="mt-0.5 flex items-center justify-end gap-1.5 text-[13px] text-slate-500">
                                    <span className={`h-1.5 w-1.5 rounded-full ${e.paidBy === 'padre' ? 'bg-padre' : 'bg-madre'}`} />
                                    {profiles[e.paidBy].name}
                                    {e.reviewStatus === 'aceptado' && (
                                      <Check size={13} strokeWidth={2.5} className="text-sage-500" aria-label="Aceptado" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </button>
                            {/* En escritorio, editar y borrar aparecen al pasar el mouse; en mobile se toca la fila */}
                            <div className="hidden shrink-0 gap-0.5 self-center pr-1 lg:flex lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                              <button
                                onClick={() => onEdit(e)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={`Editar ${e.concept}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => onDelete(e)}
                                disabled={locked}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                                aria-label={`Eliminar ${e.concept}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </SwipeToDelete>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
