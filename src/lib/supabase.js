import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/** Traduce errores comunes de Supabase a mensajes en castellano. */
export function friendlyError(error) {
  const msg = error?.message ?? String(error ?? '');
  if (/Invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese email. Iniciá sesión.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres';
  if (/Email not confirmed/i.test(msg)) return 'Tenés que confirmar tu email antes de entrar';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Esperá unos minutos.';
  if (/Unable to validate email|invalid format/i.test(msg)) return 'El email no es válido';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sin conexión. Revisá tu internet.';
  if (/violates check constraint/i.test(msg)) return 'Algún dato es demasiado largo o no es válido';
  if (/New password should be different/i.test(msg)) return 'La contraseña nueva tiene que ser distinta de la anterior';
  return msg || 'Ocurrió un error inesperado';
}
