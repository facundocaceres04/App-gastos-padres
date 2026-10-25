import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal, { btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { CATEGORIES, CONCEPT_SUGGESTIONS } from '../data/categories';
import { todayISO } from '../utils/formatters';

function emptyForm(monthKeyStr) {
  const today = todayISO();
  return {
    concept: '',
    amount: '',
    paidBy: 'padre',
    child: '',
    category: 'educacion',
    date: today.startsWith(monthKeyStr) ? today : `${monthKeyStr}-01`,
  };
}

/** Alta y edición de gastos. `expense` presente = modo edición. */
export default function ExpenseFormModal({ open, onClose, expense, onSaved, onDelete }) {
  const { addExpense, updateExpense, profiles, childrenList, key } = useExpenses();
  const [form, setForm] = useState(() => emptyForm(key));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(expense ? { ...expense, amount: String(expense.amount) } : emptyForm(key));
    setErrors({});
  }, [open, expense, key]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(String(form.amount).replace(',', '.'));
    const errs = {};
    if (!form.concept.trim()) errs.concept = 'Ingresá un concepto';
    if (!amount || amount <= 0) errs.amount = 'Ingresá un monto mayor a 0';
    if (!form.date) errs.date = 'Elegí una fecha';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const data = {
      concept: form.concept.trim(),
      amount,
      paidBy: form.paidBy,
      child: form.child,
      category: form.category,
      date: form.date,
    };
    if (expense) updateExpense(expense.id, data);
    else addExpense(data);
    onSaved?.(expense ? 'Gasto actualizado' : 'Gasto añadido con éxito');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Nuevo gasto común'}
      footer={
        <>
          {expense ? (
            <button type="button" onClick={() => onDelete(expense)} className={`${btnSecondary} flex-none px-3`} aria-label="Eliminar gasto">
              <Trash2 size={15} />
            </button>
          ) : null}
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="submit" form="expense-form" className={btnPrimary}>
            {expense ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-3.5" noValidate>
        <div>
          <label className={labelCls} htmlFor="concept">Concepto</label>
          <input
            id="concept"
            autoFocus={!expense}
            value={form.concept}
            onChange={(e) => set('concept', e.target.value)}
            placeholder="Ej. Colegio, Pediatra, Zapatillas"
            className={inputCls}
          />
          <div className="no-scrollbar mt-1.5 flex gap-1 overflow-x-auto">
            {CONCEPT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('concept', s)}
                className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>
          {errors.concept && <p className="mt-1 text-[11px] text-amber-600">{errors.concept}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="amount">Monto ($)</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-slate-500">$</span>
              <input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="35000"
                className={`${inputCls} pl-6 text-[14px] font-bold tabular-nums`}
              />
            </div>
            {errors.amount && <p className="mt-1 text-[11px] text-amber-600">{errors.amount}</p>}
          </div>
          <div>
            <label className={labelCls} htmlFor="date">Fecha</label>
            <input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            {errors.date && <p className="mt-1 text-[11px] text-amber-600">{errors.date}</p>}
          </div>
        </div>

        <div>
          <span className={labelCls}>¿Quién pagó?</span>
          <div className="grid grid-cols-2 gap-2">
            {['padre', 'madre'].map((who) => (
              <button
                key={who}
                type="button"
                onClick={() => set('paidBy', who)}
                aria-pressed={form.paidBy === who}
                className={`rounded-xl border py-2 text-[12px] font-semibold transition-all ${
                  form.paidBy === who ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {profiles[who].name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="child">Hijo/a</label>
            <select id="child" value={form.child} onChange={(e) => set('child', e.target.value)} className={`${inputCls} px-2 text-[12px]`}>
              <option value="">Sin asignar</option>
              {childrenList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Ambos">Ambos</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="category">Categoría</label>
            <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)} className={`${inputCls} px-2 text-[12px]`}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
