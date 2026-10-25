import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../lib/supabase';
import { btnPrimary, FormError, inputCls, labelCls } from '../components/Modal';

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
    <div className="flex min-h-dvh flex-col bg-surface px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-10 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm">
        <p className="font-display text-[19px] font-medium tracking-[-0.01em] text-slate-900">Cuentas Claras</p>
        <div className="mt-14 sm:mt-10">
          <h1 className="font-display text-[34px] leading-[1.1] font-medium tracking-[-0.02em] text-slate-900">Elegí una contraseña nueva</h1>
          <p className="mt-2 text-[16px] text-slate-600">Para {user?.email}</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
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

          <FormError>{error}</FormError>

          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Guardar contraseña
          </button>
        </form>

        <button onClick={signOut} className="mt-6 text-[15px] text-slate-600 underline underline-offset-[3px] hover:text-slate-900">
          Cancelar y salir
        </button>
      </div>
    </div>
  );
}
