import { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Lock, Paperclip, Pencil, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import { useExpenses } from '../context/ExpensesContext';
import { getCategory } from '../data/categories';
import { formatMoney, groupLabel } from '../utils/formatters';

/** Feed de gastos agrupado por fecha, con filtro por pagador y búsqueda. */
export default function ExpenseList({ onEdit, onDelete, onAdd, onReopen }) {
  const { monthExpenses, profiles, userId, nameOf, config, label } = useExpenses();
  const locked = config.settled;
  // Gastos que cargó el otro y todavía nadie revisó: los revisa quien está mirando.
  const isToReview = (e) => e.createdBy && e.createdBy !== userId && (e.reviewStatus ?? 'pendiente') === 'pendiente' && !locked;
  const [payer, setPayer] = useState('todos');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = [];
    monthExpenses
      .filter((e) => {
        const byTab = payer === 'todos' || (payer === 'revisar' ? isToReview(e) : e.paidBy === payer);
        return byTab && (!q || e.concept.toLowerCase().includes(q));
      })
      .forEach((e) => {
        const label = groupLabel(e.date);
        const last = out[out.length - 1];
        if (last?.label === label) last.items.push(e);
        else out.push({ label, items: [e] });
      });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthExpenses, payer, query, userId]);

  const toReview = monthExpenses.filter(isToReview).length;
  const tabs = [
    { id: 'todos', label: 'Todos' },
    { id: 'padre', label: profiles.padre.name },
    { id: 'madre', label: profiles.madre.name },
    ...(toReview || payer === 'revisar' ? [{ id: 'revisar', label: `Revisar · ${toReview}` }] : []),
  ];

  return (
    <section id="historico" className="scroll-mt-32 space-y-3 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center rounded-xl bg-slate-200/60 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setPayer(t.id)}
              className={`truncate rounded-lg px-3 py-1.5 text-[12px] transition-all ${
                payer === t.id ? 'bg-white font-semibold text-slate-900 shadow-xs dark:bg-slate-300' : 'font-medium text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setQuery('');
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${searchOpen ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-200/60'}`}
            aria-label="Buscar concepto"
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            <Plus size={15} /> Agregar gasto
          </button>
        </div>
      </div>

      {locked && monthExpenses.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2 text-[12px] text-sage-700">
          <span className="flex items-center gap-1.5">
            <Lock size={13} /> {label} está saldado: sus gastos son de solo lectura.
          </span>
          <button onClick={onReopen} className="shrink-0 rounded-lg px-2 py-1 font-semibold hover:bg-sage-100">
            Reabrir
          </button>
        </div>
      )}

      {searchOpen && (
        <div className="animate-fade-in relative">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por concepto…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-8 text-[13px] focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none"
          />
        </div>
      )}

      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center">
            <Receipt size={30} className="mx-auto text-slate-300" />
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              {monthExpenses.length ? 'No hay gastos para este filtro' : 'Todavía no hay gastos este mes'}
            </p>
            {monthExpenses.length ? (
              <button
                onClick={() => {
                  setPayer('todos');
                  setQuery('');
                  setSearchOpen(false);
                }}
                className="mt-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
              >
                Ver todos
              </button>
            ) : (
              <button onClick={onAdd} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white">
                <Plus size={15} /> Agregar el primero
              </button>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="space-y-1.5">
              <div className="px-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{g.label}</div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                {g.items.map((e) => {
                  const cat = getCategory(e.category);
                  return (
                    <div key={e.id} className="group flex items-center gap-3 transition-colors hover:bg-slate-50/70">
                      <button onClick={() => onEdit(e)} className="flex min-w-0 flex-1 items-center justify-between gap-3 p-3 text-left">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <cat.icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-[14px] leading-tight font-semibold text-slate-900">{e.concept}</h4>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-500">
                              {e.child && (
                                <>
                                  <span className="rounded bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">{e.child}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span className="truncate">{cat.label}</span>
                              {e.createdBy && e.createdBy !== userId && (
                                <>
                                  <span>•</span>
                                  <span className="shrink-0">cargó {nameOf(e.createdBy)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`font-display flex items-center justify-end gap-1 text-[14px] font-bold tracking-tight tabular-nums ${
                              e.reviewStatus === 'observado' ? 'text-slate-400 line-through decoration-1' : 'text-slate-900'
                            }`}
                          >
                            {e.receiptPath && <Paperclip size={12} className="text-slate-500" aria-label="Con comprobante" />}
                            {formatMoney(e.amount)}
                          </span>
                          {e.reviewStatus === 'observado' ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 text-[11px] font-medium text-amber-800">
                              <Eye size={11} /> Observado
                            </span>
                          ) : isToReview(e) ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-1.5 text-[11px] font-semibold text-brand-600">
                              Para revisar
                            </span>
                          ) : (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-700">
                            <span className={`h-1.5 w-1.5 rounded-full ${e.paidBy === 'padre' ? 'bg-padre' : 'bg-madre'}`} />
                            Pagó {profiles[e.paidBy].name}
                            {e.reviewStatus === 'aceptado' && <CheckCircle2 size={11} className="text-sage-500" aria-label="Aceptado" />}
                          </span>
                          )}
                        </div>
                      </button>
                      {/* Acciones visibles al pasar el mouse en desktop; en mobile se edita tocando la fila */}
                      <div className="hidden shrink-0 gap-0.5 pr-2 lg:flex lg:opacity-0 lg:transition lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                        <button onClick={() => onEdit(e)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Editar ${e.concept}`}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onDelete(e)} disabled={locked} className="rounded-lg p-1.5 disabled:opacity-30 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Eliminar ${e.concept}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
