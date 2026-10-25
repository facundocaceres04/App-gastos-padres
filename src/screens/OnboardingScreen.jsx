import { useState } from 'react';
import { KeyRound, Loader2, LogOut, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/supabase';
import { inputCls, labelCls } from '../components/Modal';

/** Primer ingreso: crear la familia (y obtener el código) o unirse con un código. */
export default function OnboardingScreen() {
  const { user, createHousehold, joinHousehold, signOut } = useAuth();
  const initialCode = (new URLSearchParams(window.location.search).get('codigo') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const [tab, setTab] = useState(initialCode ? 'join' : 'create');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [role, setRole] = useState('padre');
  const [myName, setMyName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [kids, setKids] = useState('');
  const [code, setCode] = useState(initialCode);

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const create = (e) => {
    e.preventDefault();
    if (!myName.trim()) return setError('Ingresá tu nombre');
    run(() =>
      createHousehold({
        role,
        myName: myName.trim(),
        otherName: otherName.trim(),
        children: kids.split(',').map((k) => k.trim()).filter(Boolean),
      }),
    );
  };

  const join = (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) return setError('El código tiene 6 caracteres. Revisalo y volvé a intentar.');
    run(() => joinHousehold(code.trim()));
  };

  const roleBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setRole(id)}
      className={`rounded-xl border py-2 text-[12px] font-semibold transition-all ${
        role === id ? 'border-slate-900 bg-slate-900 text-white shadow-xs' : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <h1 className="font-display text-[20px] font-bold tracking-tight text-slate-900">Configuremos tu familia</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Uno de los dos crea la familia y le comparte el código al otro.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-200/60 p-0.5">
            {[
              ['create', 'Crear familia', Users],
              ['join', 'Tengo un código', KeyRound],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setError('');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition-all ${
                  tab === id ? 'bg-white font-semibold text-slate-900 shadow-xs dark:bg-slate-300' : 'font-medium text-slate-600'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <form onSubmit={create} className="space-y-3.5">
              <div>
                <span className={labelCls}>Yo soy</span>
                <div className="grid grid-cols-2 gap-2">
                  {roleBtn('padre', 'Padre')}
                  {roleBtn('madre', 'Madre')}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} htmlFor="my-name">Tu nombre</label>
                  <input id="my-name" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Martín" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="other-name">{role === 'padre' ? 'La madre' : 'El padre'}</label>
                  <input
                    id="other-name"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    placeholder={role === 'padre' ? 'Laura' : 'Martín'}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="kids">Hijos/as (separados por coma)</label>
                <input id="kids" value={kids} onChange={(e) => setKids(e.target.value)} placeholder="Mateo, Sofía" className={inputCls} />
              </div>
              {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Crear y obtener código
              </button>
            </form>
          ) : (
            <form onSubmit={join} className="space-y-3.5">
              <div>
                <label className={labelCls} htmlFor="code">Código de invitación</label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className={`${inputCls} text-center font-mono text-[20px] font-bold tracking-[0.3em]`}
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Pedíselo al otro progenitor: lo ve en Ajustes → Compartir.
                </p>
              </div>
              {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Unirme a la familia
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-slate-500">
          <span className="truncate">{user?.email}</span>·
          <button onClick={signOut} className="flex items-center gap-1 font-medium hover:text-slate-800">
            <LogOut size={12} /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}
