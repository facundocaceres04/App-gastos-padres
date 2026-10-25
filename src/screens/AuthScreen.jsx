import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/supabase';
import { btnPrimary, FormError, inputCls, labelCls } from '../components/Modal';

/** Pantalla de ingreso / registro con email y contraseña. */
export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // Solo letras y números: el parámetro de la URL no puede inyectar texto en el mensaje.
  const inviteCode = (new URLSearchParams(window.location.search).get('codigo') ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  // Quien llega con un link de invitación casi siempre es nuevo: arranca en "Crear cuenta".
  const [mode, setMode] = useState(inviteCode ? 'signup' : 'login'); // 'login' | 'signup' | 'reset'

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'reset') {
      setBusy(true);
      const { error: err } = await resetPassword(email.trim());
      setBusy(false);
      if (err) return setError(friendlyError(err));
      // Mismo mensaje exista o no la cuenta: no se revela qué emails están registrados.
      return setInfo('Si hay una cuenta con ese email, te llegó un link para elegir una contraseña nueva. Revisá también el spam.');
    }
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    setBusy(true);
    let { data, error: err } = mode === 'login' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    // Si eligió "Crear cuenta" pero ya tenía una, se lo deja entrar con esos mismos datos.
    if (mode === 'signup' && /already registered/i.test(err?.message ?? '')) {
      ({ data, error: err } = await signIn(email.trim(), password));
      if (err) err = new Error('User already registered');
    }
    setBusy(false);
    if (err) return setError(friendlyError(err));
    // Si el proyecto exige confirmar email, signUp no devuelve sesión.
    if (mode === 'signup' && !data.session) setInfo('Te enviamos un email para confirmar tu cuenta. Después iniciá sesión.');
  };

  const copy = {
    login: ['Hola de nuevo.', 'Entrá para ver cómo vienen las cuentas del mes.'],
    signup: ['Creá tu cuenta.', 'Cada uno tiene la suya; después se unen a la misma familia con un código.'],
    reset: ['Recuperar contraseña', 'Te mandamos un link por email para elegir una nueva.'],
  }[mode];

  return (
    <div className="flex min-h-dvh flex-col bg-surface px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-10 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm">
        <p className="font-display text-[19px] font-medium tracking-[-0.01em] text-slate-900">Cuentas Claras</p>

        <div className="mt-14 sm:mt-10">
          <h1 className="font-display text-[34px] leading-[1.1] font-medium tracking-[-0.02em] text-slate-900">{copy[0]}</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{copy[1]}</p>
        </div>

        {inviteCode && mode !== 'reset' && (
          <p className="mt-6 border-l-2 border-brand-600 pl-3 text-[14px] leading-relaxed text-slate-700">
            Te invitaron con el código <strong className="font-semibold tracking-wider text-slate-900">{inviteCode}</strong>. Creá tu cuenta (o
            ingresá) y quedan unidos.
          </p>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className={labelCls} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@email.com"
              className={inputCls}
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <div className="flex items-baseline justify-between">
                <label className={labelCls} htmlFor="password">
                  Contraseña
                </label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('reset')} className="text-[13px] text-slate-500 underline underline-offset-[3px] hover:text-slate-900">
                    ¿La olvidaste?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : ''}
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute top-1/2 right-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-slate-500 hover:text-slate-800"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <FormError>{error}</FormError>
          {info && <p className="border-l-2 border-sage-500 pl-3 text-[14px] leading-relaxed text-slate-700">{info}</p>}

          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Ingresar' : mode === 'signup' ? 'Crear cuenta' : 'Mandarme el link'}
          </button>
        </form>

        <p className="mt-6 text-[15px] text-slate-600">
          {mode === 'login' ? '¿Primera vez? ' : mode === 'signup' ? '¿Ya tenés cuenta? ' : ''}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-900"
          >
            {mode === 'login' ? 'Creá tu cuenta' : mode === 'signup' ? 'Ingresá' : 'Volver a ingresar'}
          </button>
        </p>
      </div>
    </div>
  );
}
