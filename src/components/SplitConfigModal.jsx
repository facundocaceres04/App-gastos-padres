import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import Modal, { btnPrimary, btnSecondary } from './Modal';
import { useExpenses } from '../context/ExpensesContext';

/** "Acuerdo": proporción personalizada para el mes seleccionado. */
export default function SplitConfigModal({ open, onClose, onSaved }) {
  const { config, setFatherPct, profiles, label } = useExpenses();
  const [pct, setPct] = useState(config.fatherPct);

  useEffect(() => {
    if (open) setPct(config.fatherPct);
  }, [open, config.fatherPct]);

  const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

  const save = () => {
    setFatherPct(clamp(pct));
    onSaved?.(`Distribución pactada: ${clamp(pct)} / ${100 - clamp(pct)}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Acuerdo · ${label}`}
      icon={Percent}
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button onClick={save} className={btnPrimary}>Guardar acuerdo</button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-slate-600">
          Definí qué parte del total le corresponde a cada uno. El cierre se recalcula al instante.
        </p>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">{profiles.padre.name}</p>
              <p className="font-display text-[28px] leading-none font-bold text-slate-900 tabular-nums">{pct}%</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-slate-500">{profiles.madre.name}</p>
              <p className="font-display text-[28px] leading-none font-bold text-slate-900 tabular-nums">{100 - pct}%</p>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="w-full"
            aria-label={`Porcentaje asignado a ${profiles.padre.name}`}
          />
          <div className="mt-1 flex h-2 gap-[2px] overflow-hidden rounded-full">
            <div className="rounded-l-full bg-padre transition-all" style={{ width: `${pct}%` }} />
            <div className="flex-1 rounded-r-full bg-madre transition-all" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-600">
            Valor exacto:
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(clamp(e.target.value))}
              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center tabular-nums focus:border-brand-600 focus:outline-none"
            />
            % para {profiles.padre.name}
          </label>
        </div>
      </div>
    </Modal>
  );
}
