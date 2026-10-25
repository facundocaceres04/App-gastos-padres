import { useEffect, useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';
import Modal, { btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import { useExpenses } from '../context/ExpensesContext';

/** Ajustes de familia: nombres, CBU/Alias, hijos y restaurar datos de prueba. */
export default function SettingsModal({ open, onClose, onSaved }) {
  const { profiles, setProfiles, childrenList, setChildrenList, resetDemo } = useExpenses();
  const [draft, setDraft] = useState(profiles);
  const [kids, setKids] = useState(childrenList.join(', '));

  useEffect(() => {
    if (open) {
      setDraft(profiles);
      setKids(childrenList.join(', '));
    }
  }, [open, profiles, childrenList]);

  const setField = (who, field, value) => setDraft((d) => ({ ...d, [who]: { ...d[who], [field]: value } }));

  const save = () => {
    setProfiles({
      padre: { name: draft.padre.name.trim() || 'Padre', alias: draft.padre.alias.trim() },
      madre: { name: draft.madre.name.trim() || 'Madre', alias: draft.madre.alias.trim() },
    });
    setChildrenList(kids.split(',').map((k) => k.trim()).filter(Boolean));
    onSaved?.('Ajustes guardados');
    onClose();
  };

  const reset = () => {
    if (confirm('¿Restaurar los datos de prueba? Se perderán los cambios.')) {
      resetDemo();
      onSaved?.('Datos de prueba restaurados');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustes de familia"
      icon={Settings}
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancelar</button>
          <button onClick={save} className={btnPrimary}>Guardar</button>
        </>
      }
    >
      <div className="space-y-4">
        {[
          ['padre', 'Progenitor 1'],
          ['madre', 'Progenitor 2'],
        ].map(([who, legend]) => (
          <fieldset key={who}>
            <legend className={labelCls}>{legend}</legend>
            <div className="grid grid-cols-2 gap-2">
              <input value={draft[who].name} onChange={(e) => setField(who, 'name', e.target.value)} placeholder="Nombre" className={inputCls} />
              <input value={draft[who].alias} onChange={(e) => setField(who, 'alias', e.target.value)} placeholder="CBU o Alias" className={`${inputCls} font-mono text-[12px]`} />
            </div>
          </fieldset>
        ))}
        <div>
          <label className={labelCls} htmlFor="kids">Hijos/as (separados por coma)</label>
          <input id="kids" value={kids} onChange={(e) => setKids(e.target.value)} placeholder="Mateo, Sofía" className={inputCls} />
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800">
          <RotateCcw size={13} /> Restaurar datos de prueba
        </button>
      </div>
    </Modal>
  );
}
