import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/supabase';
import { inputCls, labelCls } from '../components/Modal';

/** Se muestra al entrar desde el link de "olvidé mi contraseña". */
export default function NewPasswordScreen() {
  const { user, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (password !== confirm) return setError('Las contraseñas no coinciden');
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) setError(friendlyError(err));
    // Si salió bien, la app sigue sola hacia el panel.
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <KeyRound size={22} />
          </div>
          <h1 className="font-display text-[20px] font-bold tracking-tight text-slate-900">Elegí una contraseña nueva</h1>
          <p className="mt-1 text-[13px] text-slate-500">Para {user?.email}</p>
        </div>

        <form onSubmit={submit} className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div>
            <label className={labelCls} htmlFor="new-password">Contraseña nueva</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
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
          <div>
            <label className={labelCls} htmlFor="confirm-password">Repetila</label>
            <input
              id="confirm-password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Guardar contraseña
          </button>
        </form>

        <p className="mt-4 text-center text-[12px] text-slate-500">
          <button onClick={signOut} className="font-medium hover:text-slate-800">Cancelar y salir</button>
        </p>
      </div>
    </div>
  );
}
