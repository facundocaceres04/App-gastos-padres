import { useEffect, useState } from 'react';
import { LogOut, Monitor, Moon, Settings, Sun, UserPlus } from 'lucide-react';
import Modal, { btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { useAuth } from '../context/AuthContext';
import { getThemePref, setThemePref } from '../utils/theme';

const THEMES = [
  ['claro', 'Claro', Sun],
  ['oscuro', 'Oscuro', Moon],
  ['sistema', 'Sistema', Monitor],
];

/** Ajustes de familia: nombres, CBU/Alias, hijos, compartir y cerrar sesión. */
export default function SettingsModal({ open, onClose, onSaved, onShare }) {
  const { profiles, setProfiles, childrenList, setChildrenList, myRole, inviteCode } = useExpenses();
  const { user, signOut } = useAuth();
  const [draft, setDraft] = useState(profiles);
  const [kids, setKids] = useState(childrenList.join(', '));
  const [theme, setTheme] = useState(getThemePref);

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
        <div>
          <span className={labelCls}>Apariencia</span>
          <div className="grid grid-cols-3 rounded-xl bg-slate-200/60 p-0.5">
            {THEMES.map(([id, text, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTheme(id);
                  setThemePref(id);
                }}
                aria-pressed={theme === id}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition-all ${
                  theme === id ? 'bg-white font-semibold text-slate-900 shadow-xs' : 'font-medium text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon size={13} /> {text}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onShare}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-brand-600"
        >
          <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
            <UserPlus size={15} className="text-brand-600" /> Compartir con el otro progenitor
          </span>
          <span className="font-mono text-[13px] font-bold tracking-widest text-slate-900">{inviteCode}</span>
        </button>

        {[
          ['padre', 'Padre'],
          ['madre', 'Madre'],
        ].map(([who, legend]) => (
          <fieldset key={who}>
            <legend className={labelCls}>
              {legend} {who === myRole && <span className="normal-case text-brand-600">(vos)</span>}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <input value={draft[who].name} onChange={(e) => setField(who, 'name', e.target.value)} placeholder="Nombre" className={inputCls} />
              <input
                value={draft[who].alias}
                onChange={(e) => setField(who, 'alias', e.target.value)}
                placeholder="CBU o Alias"
                className={`${inputCls} font-mono text-[12px]`}
              />
            </div>
          </fieldset>
        ))}
        <div>
          <label className={labelCls} htmlFor="kids">Hijos/as (separados por coma)</label>
          <input id="kids" value={kids} onChange={(e) => setKids(e.target.value)} placeholder="Mateo, Sofía" className={inputCls} />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[12px] text-slate-500">
          <span className="truncate">{user?.email}</span>
          <button onClick={signOut} className="flex shrink-0 items-center gap-1 font-medium hover:text-slate-800">
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </div>
    </Modal>
  );
}
