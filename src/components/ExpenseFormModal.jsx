import { useState } from 'react';
import { Loader2, Lock, Trash2 } from 'lucide-react';
import Modal, { FormError, btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import ReceiptField from './ReceiptField';
import ReviewPanel from './ReviewPanel';
import { useExpenses } from '../context/ExpensesContext';
import { CATEGORIES, CONCEPT_SUGGESTIONS } from '../data/categories';
import { MONTHS, amountToInput, parseAmount, todayISO } from '../utils/formatters';
import { relativeTime } from '../utils/activity';

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
  const { addExpense, updateExpense, profiles, childrenList, key, configFor, nameOf, expenses } = useExpenses();
  // Versión "en vivo" del gasto (por si el otro lo revisa mientras está abierto).
  const live = expense ? (expenses.find((e) => e.id === expense.id) ?? expense) : null;
  // Un gasto de un mes saldado se puede ver, pero no modificar (la base también lo impide).
  // Se mira el mes del gasto (no el del encabezado): desde Análisis se pueden abrir gastos de otros meses.
  const expenseMonth = expense?.date.slice(0, 7);
  const locked = Boolean(expense) && configFor(expenseMonth).settled;
  // El componente se monta de nuevo cada vez que se abre (ver `key` en Dashboard),
  // así que el estado inicial ya es el correcto: nunca se ve, ni por un instante, el gasto anterior.
  const [form, setForm] = useState(() => (expense ? { ...expense, amount: amountToInput(expense.amount) } : emptyForm(key)));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [receipt, setReceipt] = useState(null); // { file } | { remove: true } | null

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
    const err = expense ? await updateExpense(expense.id, data, receipt) : await addExpense(data, receipt);
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
      title={locked ? 'Gasto' : expense ? 'Editar gasto' : 'Nuevo gasto'}
      footer={
        locked ? (
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cerrar
          </button>
        ) : (
        <>
          {expense ? (
            <button type="button" onClick={() => onDelete(expense)} className={`${btnSecondary} w-12 flex-none px-0`} aria-label="Eliminar gasto">
              <Trash2 size={18} />
            </button>
          ) : null}
          <button type="submit" form="expense-form" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Guardando…' : expense ? 'Guardar cambios' : 'Guardar gasto'}
          </button>
        </>
        )
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-3.5" noValidate>
        {locked && (
          <p className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-600">
            <Lock size={15} className="mt-[3px] shrink-0" /> {expense && MONTHS[Number(expenseMonth.slice(5, 7)) - 1]} está saldado. Para modificar este gasto, primero reabrí el mes.
          </p>
        )}
        <fieldset disabled={locked} className="min-w-0 space-y-3.5">
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
          <div className="no-scrollbar -mx-5 mt-2 flex gap-1.5 overflow-x-auto px-5">
            {CONCEPT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('concept', s)}
                className="press shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:border-slate-400 hover:text-slate-900"
              >
                {s}
              </button>
            ))}
          </div>
          {errors.concept && <p className="mt-1 text-[12px] text-amber-700">{errors.concept}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="amount">Monto</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-slate-500">$</span>
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
                className={`${inputCls} pl-6 font-semibold tabular-nums`}
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
                className={`press flex h-11 items-center justify-center gap-2 rounded-[10px] border text-[15px] font-medium ${
                  form.paidBy === who ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${who === 'padre' ? 'bg-padre' : 'bg-madre'}`} />
                {profiles[who].name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} htmlFor="child">Hijo/a</label>
            <select id="child" value={form.child} onChange={(e) => set('child', e.target.value)} className={inputCls}>
              <option value="">Sin asignar</option>
              {childOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="category">Categoría</label>
            <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
          <ReceiptField existingPath={live?.receiptPath} value={receipt} onChange={setReceipt} disabled={locked} />
        </fieldset>
        {live?.createdBy && <ReviewPanel expense={live} locked={locked} onDone={onSaved} />}
        {expense?.createdBy && (
          <p className="text-[13px] text-slate-500">
            Cargado por {nameOf(expense.createdBy)} · {relativeTime(expense.createdAt)}
            {expense.updatedBy && <> · editado por {nameOf(expense.updatedBy)} {relativeTime(expense.updatedAt)}</>}
          </p>
        )}
        <FormError>{saveError}</FormError>
      </form>
    </Modal>
  );
}
