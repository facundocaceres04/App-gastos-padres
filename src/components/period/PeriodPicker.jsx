import { useState } from 'react';
import { PRESETS, rangeError, rangeLabel } from '../../utils/period';
import { inputCls, labelCls } from '../Modal';

/**
 * Presets de acceso rápido y, con "Personalizado", dos fechas (los selectores nativos del celular).
 * `value` = { preset, desde, hasta }. El rango personalizado se aplica apenas es válido.
 */
export default function PeriodPicker({ value, onChange, onPreset }) {
  const [draft, setDraft] = useState({ desde: value.desde, hasta: value.hasta });
  const error = value.preset === 'custom' ? rangeError(draft.desde, draft.hasta) : null;

  const setDate = (field, v) => {
    const next = { ...draft, [field]: v };
    setDraft(next);
    if (!rangeError(next.desde, next.hasta)) onChange({ preset: 'custom', ...next });
  };

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Período">
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (p.id === 'custom') {
                  setDraft({ desde: value.desde, hasta: value.hasta });
                  onChange({ ...value, preset: 'custom' });
                } else onPreset(p.id);
              }}
              className={`press h-9 shrink-0 rounded-full border px-3.5 text-[14px] transition-colors ${
                active
                  ? 'border-slate-900 bg-slate-900 font-medium text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {value.preset === 'custom' ? (
        <div className="animate-fade-in mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} htmlFor="desde">
                Desde
              </label>
              <input
                id="desde"
                type="date"
                value={draft.desde}
                max={draft.hasta || undefined}
                onChange={(e) => setDate('desde', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="hasta">
                Hasta
              </label>
              <input
                id="hasta"
                type="date"
                value={draft.hasta}
                min={draft.desde || undefined}
                onChange={(e) => setDate('hasta', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-[13px] text-amber-700">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 px-1 text-[14px] text-slate-500">{rangeLabel(value.desde, value.hasta)}</p>
      )}
    </div>
  );
}
