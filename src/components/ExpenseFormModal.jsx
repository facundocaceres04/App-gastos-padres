import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import Modal, { FormError, btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { CATEGORIES, CONCEPT_SUGGESTIONS } from '../data/categories';
import { amountToInput, parseAmount, todayISO } from '../utils/formatters';

const MAX_CONCEPT = 120;

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(expense ? { ...expense, amount: amountToInput(expense.amount) } : emptyForm(key));
    setErrors({});
    setSaveError(null);
    setSaving(false);
  }, [open, expense, key]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const amount = parseAmount(form.amount);
    const errs = {};
    if (!form.concept.trim()) errs.concept = 'Ingresá un concepto';
    if (amount === null) errs.amount = 'Ingresá un monto válido, por ejemplo 15.000 o 1.500,50';
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
    setSaving(true);
    setSaveError(null);
    // Se espera la confirmación de la base: si falla, el error queda visible acá y no se cierra.
    const err = expense ? await updateExpense(expense.id, data) : await addExpense(data);
    setSaving(false);
    if (err) {
      setSaveError(`No se pudo guardar: ${err}`);
      return;
    }
    const otherMonth = !data.date.startsWith(key);
    onSaved?.(otherMonth ? 'Gasto guardado en otro mes' : expense ? 'Gasto actualizado' : 'Gasto guardado');
    onClose();
  };

  // Si el hijo/a fue renombrado, el gasto viejo conserva su nombre como opción.
  const childOptions = [...childrenList, 'Ambos'];
  if (form.child && !childOptions.includes(form.child)) childOptions.push(form.child);

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
          <button type="submit" form="expense-form" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Guardando…' : expense ? 'Guardar cambios' : 'Guardar gasto'}
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
            maxLength={MAX_CONCEPT}
            onChange={(e) => set('concept', e.target.value)}
            placeholder="Ej. Colegio, Pediatra, Zapatillas"
            aria-invalid={Boolean(errors.concept)}
            className={inputCls}
          />
          <div className="no-scrollbar mt-1.5 flex gap-1 overflow-x-auto">
            {CONCEPT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('concept', s)}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>
          {errors.concept && <p className="mt-1 text-[12px] text-amber-700">{errors.concept}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="amount">Monto ($)</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-slate-500">$</span>
              {/* Texto (no number): así se puede escribir "1.500,50" como en Argentina. */}
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder="15.000"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
                className={`${inputCls} pl-6 text-[15px] font-bold tabular-nums`}
              />
            </div>
            {errors.amount && (
              <p id="amount-error" className="mt-1 text-[12px] text-amber-700">
                {errors.amount}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="date">Fecha</label>
            <input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
            {errors.date && <p className="mt-1 text-[12px] text-amber-700">{errors.date}</p>}
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
                className={`rounded-xl border py-2.5 text-[13px] font-semibold transition-all ${
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
            <select id="child" value={form.child} onChange={(e) => set('child', e.target.value)} className={`${inputCls} px-2 text-[13px]`}>
              <option value="">Sin asignar</option>
              {childOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="category">Categoría</label>
            <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)} className={`${inputCls} px-2 text-[13px]`}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <FormError>{saveError}</FormError>
      </form>
    </Modal>
  );
}
