import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import Modal, { FormError, btnPrimary, btnSecondary } from './Modal';
import { MONTHS } from '../utils/formatters';
import { relativeTime } from '../utils/activity';
import { useExpenses } from '../context/ExpensesContext';
import { SPLIT_PRESETS } from '../data/categories';

/**
 * Acuerdo del mes. Cambiarlo afecta el balance de los dos, así que se explica qué pasa,
 * se muestra quién lo cambió por última vez y no se puede tocar con el mes saldado.
 */
export default function SplitConfigModal({ open, onClose, onSaved }) {
  const { config, setFatherPct, profiles, label, nameOf, settlement } = useExpenses();
  const [pct, setPct] = useState(config.fatherPct);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPct(config.fatherPct);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
  const locked = config.settled;
  const changed = clamp(pct) !== config.fatherPct;
  const monthName = label.split(' ')[0].toLowerCase();

  const save = async () => {
    setSaving(true);
    const err = await setFatherPct(clamp(pct));
    setSaving(false);
    if (err) return setSaveError(`No se pudo guardar: ${err}`);
    onSaved?.(`Acuerdo de ${monthName}: ${clamp(pct)} / ${100 - clamp(pct)}`);
    onClose();
  };

  const inherited = config.inheritedFrom ? MONTHS[Number(config.inheritedFrom.slice(5)) - 1].toLowerCase() : null;
  const chip = (active) =>
    `h-9 flex-1 rounded-[9px] text-[14px] tabular-nums transition-colors ${
      active ? 'bg-white font-semibold text-slate-900 shadow-[0_1px_2px_rgba(26,23,20,0.12)]' : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reparto de ${monthName}`}
      footer={
        locked ? (
          <button onClick={onClose} className={btnSecondary}>Cerrar</button>
        ) : (
          <>
            <button onClick={save} className={btnPrimary} disabled={saving || !changed}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Guardando…' : changed ? `Cambiar a ${clamp(pct)} / ${100 - clamp(pct)}` : 'Sin cambios'}
            </button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {locked ? (
          <p className="flex gap-2 text-[15px] leading-relaxed text-slate-600">
            <Lock size={16} className="mt-1 shrink-0" />
            {label.split(' ')[0]} está saldado, así que el reparto quedó fijo. Para cambiarlo, primero hay que reabrir el mes.
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-slate-600">
            Qué parte del total le toca a cada uno en {monthName}.
            {inherited && <> Por ahora sigue el de {inherited}.</>}
          </p>
        )}

        <div className={locked ? 'opacity-70' : ''}>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[14px] text-slate-600">
                <span className="h-2 w-2 rounded-full bg-padre" /> {profiles.padre.name}
              </p>
              <p className="font-display mt-1 text-[40px] leading-none font-medium tracking-[-0.02em] text-slate-900 tabular-nums">{pct}%</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-[14px] text-slate-600">
                {profiles.madre.name} <span className="h-2 w-2 rounded-full bg-madre" />
              </p>
              <p className="font-display mt-1 text-[40px] leading-none font-medium tracking-[-0.02em] text-slate-900 tabular-nums">{100 - pct}%</p>
            </div>
          </div>
          <div className="mb-4 flex gap-1 rounded-[12px] bg-slate-100 p-1" role="group" aria-label="Repartos frecuentes">
            {SPLIT_PRESETS.map((p) => (
              <button key={p} type="button" disabled={locked} onClick={() => setPct(p)} aria-pressed={pct === p} className={chip(pct === p)}>
                {p}/{100 - p}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            disabled={locked}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full"
            aria-label={`Porcentaje asignado a ${profiles.padre.name}`}
          />
          <div className="mt-1 flex h-2 gap-[2px] overflow-hidden rounded-full">
            <div className="rounded-l-full bg-padre transition-all" style={{ width: `${pct}%` }} />
            <div className="flex-1 rounded-r-full bg-madre transition-all" />
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px] text-slate-600">
            Valor exacto:
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              disabled={locked}
              onChange={(e) => setPct(clamp(e.target.value))}
              className="w-16 rounded-[8px] border border-slate-200 bg-white px-2 py-1.5 text-center tabular-nums focus:border-slate-900 focus:outline-none"
            />
            % para {profiles.padre.name}
          </label>
        </div>

        {!locked && changed && settlement.total > 0 && (
          <p className="text-[14px] leading-relaxed text-slate-600">
            Esto cambia el balance de {monthName} para los dos y queda registrado en la actividad.
          </p>
        )}
        {config.updatedBy && (
          <p className="text-[13px] text-slate-500">
            Último cambio: {nameOf(config.updatedBy)} · {relativeTime(config.updatedAt)}
          </p>
        )}
        <FormError>{saveError}</FormError>
      </div>
    </Modal>
  );
}
