import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { FormError, btnPrimary, btnSecondary, inputCls, labelCls } from './Modal';
import { useExpenses } from '../context/ExpensesContext';
import { useAuth } from '../context/AuthContext';
import { getThemePref, setThemePref } from '../utils/theme';
import { parseChildren } from '../utils/formatters';
import InstallHint from './InstallHint';

const THEMES = [
  ['claro', 'Claro'],
  ['oscuro', 'Oscuro'],
  ['sistema', 'Sistema'],
];

const sectionCls = 'border-t border-slate-100 pt-5';
const headingCls = 'mb-3 text-[15px] font-semibold text-slate-900';
const linkBtn =
  'text-[15px] text-slate-700 underline decoration-slate-300 underline-offset-[3px] hover:text-slate-900 hover:decoration-slate-900';

/** Página de Ajustes: tus datos, hijos, compartir, apariencia, integrantes y cerrar sesión. */
export default function SettingsView({ onSaved, onShare }) {
  const {
    profiles,
    setProfiles,
    childrenList,
    setChildrenList,
    myRole,
    otherRole,
    inviteCode,
    partnerJoined,
    removePartner,
    leaveHousehold,
  } = useExpenses();
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

  // El borrador se arma al entrar a la página: si llega un cambio del otro mientras escribís
  // (o volvés de la app del banco), no se pisa lo que estabas cargando.
  // Lo del otro progenitor no se edita acá (salvo su nombre, si todavía no se sumó): se muestra en vivo.
  const otherEditable = !partnerJoined;
  // Último valor de la base que vio cada campo: si no lo tocaste, se actualiza solo cuando llega un cambio.
  const base = useRef({ profiles, kids: childrenList.join(', ') });
  useEffect(() => {
    const prev = base.current;
    const liveKids = childrenList.join(', ');
    setDraft((d) => {
      const next = { padre: { ...d.padre }, madre: { ...d.madre } };
      for (const who of ['padre', 'madre'])
        for (const f of ['name', 'alias']) if (d[who][f] === prev.profiles[who][f]) next[who][f] = profiles[who][f];
      return next;
    });
    setKids((k) => (k === prev.kids ? liveKids : k));
    base.current = { profiles, kids: liveKids };
  }, [profiles, childrenList]);
  const shown = (who, field) => (who === myRole || (field === 'name' && otherEditable) ? draft[who][field] : profiles[who][field]);
  const dirty =
    draft[myRole].name !== profiles[myRole].name ||
    draft[myRole].alias !== profiles[myRole].alias ||
    (otherEditable && draft[otherRole].name !== profiles[otherRole].name) ||
    kids !== childrenList.join(', ');

  const setField = (who, field, value) => setDraft((d) => ({ ...d, [who]: { ...d[who], [field]: value } }));

  const save = async () => {
    const kidsParsed = parseChildren(kids);
    if (kidsParsed.error) return setSaveError(kidsParsed.error);
    setSaving(true);
    setSaveError(null);
    // Solo se mandan tus datos; los del otro van tal como están ahora en la base.
    const fallback = { padre: 'Padre', madre: 'Madre' };
    const next = {
      [myRole]: { name: draft[myRole].name.trim() || fallback[myRole], alias: draft[myRole].alias.trim() },
      [otherRole]: {
        name: otherEditable ? draft[otherRole].name.trim() || fallback[otherRole] : profiles[otherRole].name,
        alias: profiles[otherRole].alias,
      },
    };
    const kidsChanged = kidsParsed.list.join(', ') !== childrenList.join(', ');
    const err = (await setProfiles(next)) ?? (kidsChanged ? await setChildrenList(kidsParsed.list) : null);
    setSaving(false);
    if (err) return setSaveError(`No se pudo guardar: ${err}`);
    setDraft(next);
    setKids(kidsParsed.list.join(', '));
    onSaved?.('Ajustes guardados');
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
    }
    // Al salir, la app vuelve sola a la pantalla de crear o unirse a una familia.
  };

  return (
    <section aria-labelledby="ajustes-title">
      <h2 id="ajustes-title" className="font-display mb-5 px-1 text-[28px] leading-none font-medium tracking-[-0.02em] text-slate-900">
        Ajustes
      </h2>
      <div className="space-y-5 rounded-[20px] bg-white px-5 pt-5 pb-6 shadow-[0_1px_0_rgba(26,23,20,0.04),0_8px_24px_-12px_rgba(26,23,20,0.10)]">
        {/* Cada uno edita solo su CBU/Alias; el nombre del otro, solo hasta que se suma. */}
        {[myRole, myRole === 'padre' ? 'madre' : 'padre'].map((who) => {
          const legend = who === 'padre' ? 'Padre' : 'Madre';
          const mine = who === myRole;
          return (
            <div key={who} className={mine ? '' : sectionCls}>
              <fieldset>
                <legend className={headingCls}>
                  {mine ? 'Vos' : shown(who, 'name') || legend}
                  <span className="ml-1.5 font-normal text-slate-500">{legend.toLowerCase()}</span>
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls} htmlFor={`name-${who}`}>
                      Nombre
                    </label>
                    <input
                      id={`name-${who}`}
                      value={shown(who, 'name')}
                      onChange={(e) => setField(who, 'name', e.target.value)}
                      aria-label={`Nombre (${legend})`}
                      maxLength={40}
                      disabled={!mine && partnerJoined}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor={`alias-${who}`}>
                      CBU o alias
                    </label>
                    <input
                      id={`alias-${who}`}
                      value={shown(who, 'alias')}
                      aria-label={`CBU o Alias (${legend})`}
                      maxLength={60}
                      disabled={!mine}
                      onChange={(e) => setField(who, 'alias', e.target.value)}
                      placeholder={mine ? 'tu.alias' : ''}
                      className={inputCls}
                    />
                  </div>
                </div>
                {!mine && (
                  <p className="mt-2 text-[13px] text-slate-500">
                    Su {partnerJoined ? 'nombre y su alias los cambia' : 'alias lo cambia'} {shown(who, 'name') || legend}.
                  </p>
                )}
              </fieldset>
            </div>
          );
        })}

        <div className={sectionCls}>
          <label className={headingCls + ' block'} htmlFor="kids">
            Hijos o hijas
          </label>
          <input
            id="kids"
            value={kids}
            onChange={(e) => setKids(e.target.value)}
            maxLength={300}
            placeholder="Mateo, Sofía"
            className={inputCls}
          />
          <p className="mt-1.5 text-[13px] text-slate-500">Separados por coma.</p>
        </div>

        <FormError>{saveError}</FormError>
        {/* El botón aparece recién cuando cambiaste algo (tema, compartir y demás se aplican al toque). */}
        {(dirty || saving) && (
          <button onClick={save} className={`animate-fade-in ${btnPrimary} w-full`} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}

        <div className={`${sectionCls} space-y-1`}>
          <button onClick={onShare} className="flex w-full items-center justify-between gap-3 py-2 text-left">
            <span className="text-[15px] text-slate-900">Compartir</span>
            <span className="flex shrink-0 items-center gap-1 text-[14px] text-slate-500">
              {partnerJoined ? `${other} ya se sumó` : <span className="font-semibold tracking-[0.15em] text-slate-900">{inviteCode}</span>}
              <ChevronRight size={16} />
            </span>
          </button>
          <InstallHint variant="row" onInstalled={onSaved} />
        </div>

        <div className={sectionCls}>
          <span className={headingCls + ' block'}>Apariencia</span>
          <div className="grid grid-cols-3 gap-1 rounded-[12px] bg-slate-100 p-1">
            {THEMES.map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTheme(id);
                  setThemePref(id);
                }}
                aria-pressed={theme === id}
                className={`h-9 rounded-[9px] text-[14px] transition-colors ${
                  theme === id
                    ? 'bg-white font-semibold text-slate-900 shadow-[0_1px_2px_rgba(26,23,20,0.12)]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className={sectionCls}>
          <span className={headingCls + ' block'}>Integrantes</span>
          {confirm ? (
            <div className="space-y-3 border-l-2 border-amber-500 pl-3.5 text-[14px] leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">
                {confirm === 'remove' ? `¿Quitar a ${other} de la familia?` : '¿Salir de la familia?'}
              </p>
              <p>
                {confirm === 'remove'
                  ? `${other} deja de ver los gastos. El código actual deja de servir: para volver a sumarse necesita uno nuevo. Los gastos cargados quedan.`
                  : partnerJoined
                    ? `Vas a dejar de ver los gastos. ${other} conserva todo. Para volver, te tiene que pasar un código nuevo.`
                    : 'Sos el único integrante: se borran la familia, todos los gastos y los comprobantes. No se puede deshacer.'}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirm(null)} className={btnSecondary}>
                  Cancelar
                </button>
                <button type="button" onClick={confirmFamily} disabled={leaving} className={btnPrimary}>
                  {leaving && <Loader2 size={14} className="animate-spin" />}
                  {confirm === 'remove' ? `Sí, quitar a ${other}` : partnerJoined ? 'Sí, salir' : 'Sí, borrar todo'}
                </button>
              </div>
              <FormError>{familyError}</FormError>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2.5">
              {partnerJoined && (
                <button type="button" onClick={() => setConfirm('remove')} className={linkBtn}>
                  Quitar a {other}
                </button>
              )}
              <button type="button" onClick={() => setConfirm('leave')} className={linkBtn}>
                Salir de la familia
              </button>
            </div>
          )}
        </div>

        <div className={`${sectionCls} flex items-center justify-between gap-3 text-[14px] text-slate-500`}>
          <span className="truncate">{user?.email}</span>
          <button onClick={signOut} className="shrink-0 font-medium text-slate-900 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  );
}
