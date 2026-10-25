import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/supabase';
import { parseChildren } from '../utils/formatters';
import { btnPrimary, FormError, inputCls, labelCls } from '../components/Modal';

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
    const kidsParsed = parseChildren(kids);
    if (kidsParsed.error) return setError(kidsParsed.error);
    run(() =>
      createHousehold({
        role,
        myName: myName.trim(),
        otherName: otherName.trim(),
        children: kidsParsed.list,
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
      aria-pressed={role === id}
      className={`press h-11 rounded-[10px] border text-[15px] font-medium ${
        role === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-10 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display shrink-0 text-[19px] font-medium tracking-[-0.01em] whitespace-nowrap text-slate-900">Cuentas Claras</p>
          <button onClick={signOut} className="min-w-0 truncate text-[13px] text-slate-500 hover:text-slate-900" title="Salir">
            {user?.email} · Salir
          </button>
        </div>

        <div className="mt-12 sm:mt-10">
          <h1 className="font-display text-[34px] leading-[1.1] font-medium tracking-[-0.02em] text-slate-900">Configuremos tu familia</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-slate-600">Uno de los dos la crea y le pasa el código al otro.</p>
        </div>

        <div className="mt-7 flex gap-6 border-b border-slate-200" role="tablist">
          {[
            ['create', 'Crear familia'],
            ['join', 'Tengo un código'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setError('');
              }}
              className={`-mb-px border-b-2 pb-2.5 text-[15px] transition-colors ${
                tab === id ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={create} className="mt-6 space-y-4">
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
                <input id="my-name" value={myName} onChange={(e) => setMyName(e.target.value)} maxLength={40} placeholder="Martín" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="other-name">{role === 'padre' ? 'La madre' : 'El padre'}</label>
                <input
                  id="other-name"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  maxLength={40}
                  placeholder={role === 'padre' ? 'Laura' : 'Martín'}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="kids">Hijos o hijas</label>
              <input id="kids" value={kids} onChange={(e) => setKids(e.target.value)} maxLength={300} placeholder="Mateo, Sofía" className={inputCls} />
              <p className="mt-1.5 text-[13px] text-slate-500">Separados por coma.</p>
            </div>
            <FormError>{error}</FormError>
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              Crear y obtener código
            </button>
          </form>
        ) : (
          <form onSubmit={join} className="mt-6 space-y-4">
            <div>
              <label className={labelCls} htmlFor="code">Código</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                autoCapitalize="characters"
                autoComplete="off"
                data-keep-size
                className={`${inputCls} font-display h-16 text-center text-[30px] font-medium tracking-[0.3em] placeholder:text-slate-300`}
              />
              <p className="mt-1.5 text-[13px] text-slate-500">El otro lo encuentra en Ajustes → Compartir.</p>
            </div>
            <FormError>{error}</FormError>
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              Unirme a la familia
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
