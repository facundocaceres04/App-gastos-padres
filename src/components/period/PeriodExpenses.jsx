import { useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { CATEGORIES, getCategory } from '../../data/categories';
import { MONTHS, formatMoney, initial } from '../../utils/formatters';
import { countable } from '../../utils/calculator';

const PAGE = 40;
const SHORT = MONTHS.map((m) => m.slice(0, 3).toLowerCase());

/** Gastos del rango, del más nuevo al más viejo, agrupados por mes; filtros por quién pagó y categoría. */
export default function PeriodExpenses({ expenses, profiles, onEdit }) {
  const [payer, setPayer] = useState('todos');
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(
    () => expenses.filter((e) => (payer === 'todos' || e.paidBy === payer) && (!category || e.category === category)),
    [expenses, payer, category],
  );
  const filteredTotal = countable(filtered).reduce((a, e) => a + Number(e.amount || 0), 0);
  const shown = filtered.slice(0, limit);
  const groups = [];
  shown.forEach((e) => {
    const key = e.date.slice(0, 7);
    if (groups.at(-1)?.key === key) groups.at(-1).items.push(e);
    else groups.push({ key, items: [e] });
  });
  const usedCategories = CATEGORIES.filter((c) => expenses.some((e) => e.category === c.id));

  return (
    <section aria-labelledby="periodo-gastos" className="border-t border-slate-200 pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="periodo-gastos" className="font-display text-[21px] leading-tight font-medium tracking-[-0.01em] text-slate-900">
          Gastos del período
        </h3>
        <span className="shrink-0 text-[14px] text-slate-500 tabular-nums">
          {filtered.length} · {formatMoney(filteredTotal)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-4" role="tablist" aria-label="Quién pagó">
          {[
            ['todos', 'Todos'],
            ['padre', profiles.padre.name],
            ['madre', profiles.madre.name],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={payer === id}
              onClick={() => {
                setPayer(id);
                setLimit(PAGE);
              }}
              className={`border-b-2 pb-1 text-[14px] transition-colors ${
                payer === id ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Filtrar por categoría"
          className="min-w-0 rounded-[10px] border border-slate-200 bg-white py-1.5 pr-7 pl-2.5 text-[14px] text-slate-700 focus:border-slate-900 focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {usedCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-[15px] text-slate-500">No hay gastos con este filtro.</p>
      ) : (
        <div className="mt-2">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mt-4 mb-1 text-[13px] font-medium text-slate-500">
                {MONTHS[Number(g.key.slice(5, 7)) - 1]} {g.key.slice(0, 4)}
              </p>
              <ul className="divide-y divide-slate-200/70">
                {g.items.map((e) => {
                  const observed = e.reviewStatus === 'observado';
                  const meta = [getCategory(e.category).label, e.child].filter(Boolean).join(' · ');
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => onEdit(e)}
                        className="flex w-full items-center gap-3 rounded-[10px] py-2.5 text-left transition-colors hover:bg-white"
                      >
                        <span className="w-11 shrink-0 text-[13px] leading-tight text-slate-500 tabular-nums">
                          {Number(e.date.slice(8, 10))} {SHORT[Number(e.date.slice(5, 7)) - 1]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] font-medium ${observed ? 'text-slate-500' : 'text-slate-900'}`}>
                            {e.concept}
                          </span>
                          <span className="block truncate text-[13px] text-slate-500">{observed ? `Observado · ${meta}` : meta}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2.5">
                          <span
                            className={`flex items-center gap-1 text-[15px] font-semibold tabular-nums ${
                              observed ? 'text-slate-400 line-through decoration-1' : 'text-slate-900'
                            }`}
                          >
                            {e.receiptPath && <Paperclip size={13} className="text-slate-400" aria-label="Con comprobante" />}
                            {formatMoney(e.amount)}
                          </span>
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
                              e.paidBy === 'padre' ? 'bg-padre' : 'bg-madre'
                            }`}
                            title={`Pagó ${profiles[e.paidBy].name}`}
                            aria-label={`Pagó ${profiles[e.paidBy].name}`}
                          >
                            {initial(profiles[e.paidBy].name)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {filtered.length > limit && (
            <button
              onClick={() => setLimit((n) => n + PAGE)}
              className="press mt-4 h-11 w-full rounded-[12px] bg-slate-100 text-[14px] font-semibold text-slate-800 hover:bg-slate-200"
            >
              Ver {Math.min(PAGE, filtered.length - limit)} más
            </button>
          )}
        </div>
      )}
    </section>
  );
}
