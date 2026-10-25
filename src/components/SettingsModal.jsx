import { useEffect, useState } from 'react';
import { DoorOpen, Loader2, LogOut, Monitor, Moon, Settings, Sun, UserMinus, UserPlus } from 'lucide-react';
import Modal, { FormError, btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { useAuth } from '../context/AuthContext';
import { getThemePref, setThemePref } from '../utils/theme';
import { parseChildren } from '../utils/formatters';

const THEMES = [
  ['claro', 'Claro', Sun],
  ['oscuro', 'Oscuro', Moon],
  ['sistema', 'Sistema', Monitor],
];

/** Ajustes de familia: nombres, CBU/Alias, hijos, compartir y cerrar sesión. */
export default function SettingsModal({ open, onClose, onSaved, onShare }) {
  const { profiles, setProfiles, childrenList, setChildrenList, myRole, otherRole, inviteCode, partnerJoined, removePartner, leaveHousehold } =
    useExpenses();
  const { user, signOut } = useAuth();
  const [draft, setDraft] = useState(profiles);
  const [kids, setKids] = useState(childrenList.join(', '));
  const [theme, setTheme] = useState(getThemePref);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirm, setConfirm] = useState(null); // null | 'remove' | 'leave'
  const [leaving, setLeaving] = useState(false);
  const [familyError, setFamilyError] = useState(null);
  const other = profiles[otherRole].name;

  // El borrador se inicializa SOLO al abrir: si llega un cambio del otro mientras escribís
  // (o volvés de la app del banco), no se pisa lo que estabas cargando.
  useEffect(() => {
    if (!open) return;
    setDraft(profiles);
    setKids(childrenList.join(', '));
    setTheme(getThemePref());
    setSaveError(null);
    setConfirm(null);
    setFamilyError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setField = (who, field, value) => setDraft((d) => ({ ...d, [who]: { ...d[who], [field]: value } }));

  const save = async () => {
    const kidsParsed = parseChildren(kids);
    if (kidsParsed.error) return setSaveError(kidsParsed.error);
    setSaving(true);
    setSaveError(null);
    const err =
      (await setProfiles({
        padre: { name: draft.padre.name.trim() || 'Padre', alias: draft.padre.alias.trim() },
        madre: { name: draft.madre.name.trim() || 'Madre', alias: draft.madre.alias.trim() },
      })) ?? (await setChildrenList(kidsParsed.list));
    setSaving(false);
    if (err) return setSaveError(`No se pudo guardar: ${err}`);
    onSaved?.('Ajustes guardados');
    onClose();
  };

  const confirmFamily = async () => {
    setLeaving(true);
    setFamilyError(null);
    const err = confirm === 'remove' ? await removePartner() : await leaveHousehold();
    setLeaving(false);
    if (err) return setFamilyError(err);
    if (confirm === 'remove') {
      setConfirm(null);
      onSaved?.(`${other} ya no está en la familia`);
      onClose();
    }
    // Al salir, la app vuelve sola a la pantalla de crear o unirse a una familia.
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
          <button onClick={save} className={btnPrimary} disabled={saving}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
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
                  theme === id ? 'bg-white font-semibold text-slate-900 shadow-xs dark:bg-slate-300' : 'font-medium text-slate-600 hover:text-slate-900'
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
          {partnerJoined ? (
            <span className="text-[12px] text-slate-500">{other} ya se sumó</span>
          ) : (
            <span className="font-mono text-[13px] font-bold tracking-widest text-slate-900">{inviteCode}</span>
          )}
        </button>

        {[
          ['padre', 'Padre'],
          ['madre', 'Madre'],
        ].map(([who, legend]) => (
          <fieldset key={who}>
            <legend className={labelCls}>
              {legend} {who === myRole && <span className="normal-case text-brand-600">(vos)</span>}
            </legend>
            {/* Cada uno edita solo su CBU/Alias; el nombre del otro, solo hasta que se suma. */}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={draft[who].name}
                onChange={(e) => setField(who, 'name', e.target.value)}
                placeholder="Nombre"
                aria-label={`Nombre (${legend})`}
                maxLength={40}
                disabled={who !== myRole && partnerJoined}
                className={inputCls}
              />
              <input
                value={draft[who].alias}
                aria-label={`CBU o Alias (${legend})`}
                maxLength={40}
                disabled={who !== myRole}
                onChange={(e) => setField(who, 'alias', e.target.value)}
                placeholder="CBU o Alias"
                className={`${inputCls} font-mono text-[12px]`}
              />
            </div>
            {who !== myRole && (
              <p className="mt-1 text-[11px] text-slate-500">Solo {draft[who].name || legend} puede cambiar su CBU/Alias{partnerJoined ? ' y su nombre' : ''}.</p>
            )}
          </fieldset>
        ))}
        <div>
          <label className={labelCls} htmlFor="kids">Hijos/as (separados por coma)</label>
          <input id="kids" value={kids} onChange={(e) => setKids(e.target.value)} maxLength={300} placeholder="Mateo, Sofía" className={inputCls} />
        </div>

        <FormError>{saveError}</FormError>

        <div className="border-t border-slate-100 pt-3">
          <span className={labelCls}>Integrantes</span>
          {confirm ? (
            <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
              <p className="font-semibold">{confirm === 'remove' ? `¿Quitar a ${other} de la familia?` : '¿Salir de la familia?'}</p>
              <p className="leading-relaxed">
                {confirm === 'remove'
                  ? `${other} deja de ver los gastos. El código actual deja de servir: para volver a sumarse necesita uno nuevo. Los gastos cargados quedan.`
                  : partnerJoined
                    ? `Vas a dejar de ver los gastos. ${other} conserva todo. Para volver, te tiene que pasar un código nuevo.`
                    : 'Sos el único integrante: se borran la familia, todos los gastos y los comprobantes. No se puede deshacer.'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirm(null)}
                  className="flex-1 rounded-xl border border-amber-200 bg-white py-2 font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmFamily}
                  disabled={leaving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 font-semibold text-white disabled:opacity-60"
                >
                  {leaving && <Loader2 size={13} className="animate-spin" />}
                  {confirm === 'remove' ? `Sí, quitar a ${other}` : partnerJoined ? 'Sí, salir' : 'Sí, borrar todo'}
                </button>
              </div>
              <FormError>{familyError}</FormError>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {partnerJoined && (
                <button
                  type="button"
                  onClick={() => setConfirm('remove')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:border-amber-300 hover:text-amber-800"
                >
                  <UserMinus size={13} /> Quitar a {other}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirm('leave')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:border-amber-300 hover:text-amber-800"
              >
                <DoorOpen size={13} /> Salir de la familia
              </button>
            </div>
          )}
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
