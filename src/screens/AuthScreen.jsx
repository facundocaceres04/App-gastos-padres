import { useState } from 'react';
import { Eye, EyeOff, Loader2, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/supabase';
import { inputCls, labelCls } from '../components/Modal';

/** Pantalla de ingreso / registro con email y contraseña. */
export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // Solo letras y números: el parámetro de la URL no puede inyectar texto en el mensaje.
  const inviteCode = (new URLSearchParams(window.location.search).get('codigo') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    setBusy(true);
    const { data, error: err } = mode === 'login' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setBusy(false);
    if (err) return setError(friendlyError(err));
    // Si el proyecto exige confirmar email, signUp no devuelve sesión.
    if (mode === 'signup' && !data.session) setInfo('Te enviamos un email para confirmar tu cuenta. Después iniciá sesión.');
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <Scale size={22} />
          </div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-slate-900">Cuentas Claras</h1>
          <p className="mt-1 text-[13px] text-slate-500">Gastos compartidos de los chicos, sin discusiones.</p>
        </div>

        {inviteCode && (
          <div className="mb-3 rounded-xl border border-sage-100 bg-sage-50 p-3 text-[12px] text-sage-700">
            Te invitaron a una familia con el código <strong className="font-mono">{inviteCode}</strong>. Creá tu cuenta o
            iniciá sesión para unirte.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-200/60 p-0.5">
            {[
              ['login', 'Ingresar'],
              ['signup', 'Crear cuenta'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setError('');
                  setInfo('');
                }}
                className={`rounded-lg py-1.5 text-[12px] transition-all ${
                  mode === id ? 'bg-white font-semibold text-slate-900 shadow-xs dark:bg-slate-300' : 'font-medium text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className={labelCls} htmlFor="email">Email</label>
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
            <div>
              <label className={labelCls} htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••'}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{error}</p>}
            {info && <p className="rounded-lg bg-sage-50 px-3 py-2 text-[12px] text-sage-700">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
