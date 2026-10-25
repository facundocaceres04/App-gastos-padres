import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { friendlyError, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

/** Sesión del usuario + familia (household) a la que pertenece. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  // Familia del usuario, guardada junto con el id del usuario al que corresponde.
  const [membershipState, setMembershipState] = useState({ userId: undefined, data: undefined, error: null });
  // true al entrar desde el link de "olvidé mi contraseña": hay que elegir una nueva.
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  const loadMembership = useCallback(async () => {
    if (!userId) {
      setMembershipState({ userId: null, data: null, error: null });
      return;
    }
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    setMembershipState({ userId, data: data ?? null, error: null });
  }, [userId]);

  // Supabase emite varios eventos de sesión (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED);
  // la familia solo se recarga cuando cambia el usuario, no en cada evento.
  const sessionReady = session !== undefined;
  useEffect(() => {
    if (!sessionReady) return;
    // Un error de red NO significa "sin familia": se muestra para reintentar, no el onboarding.
    loadMembership().catch((e) => setMembershipState({ userId: userId ?? null, data: undefined, error: friendlyError(e) }));
  }, [sessionReady, loadMembership, userId]);

  // Al volver a la app se revisa si seguís en la familia (el otro te pudo haber quitado).
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => document.visibilityState === 'visible' && loadMembership().catch(() => {});
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [userId, loadMembership]);

  // Mientras no se cargó la familia del usuario actual, se considera "cargando".
  const isCurrent = membershipState.userId === (userId ?? null);
  const membership = isCurrent ? membershipState.data : undefined;
  const membershipError = isCurrent ? membershipState.error : null;

  const value = {
    session,
    user: session?.user ?? null,
    membership,
    membershipError,
    retryMembership: () => {
      setMembershipState((s) => ({ ...s, error: null }));
      loadMembership().catch((e) => setMembershipState({ userId: userId ?? null, data: undefined, error: friendlyError(e) }));
    },
    /** Vuelve a consultar la familia (p. ej. después de salir o si el otro te quitó). */
    refreshMembership: () => loadMembership().catch(() => {}),
    loading: session === undefined || (session && membership === undefined && !membershipError),
    recovery,

    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
    /** Manda el link para elegir una contraseña nueva. Vuelve a esta misma app. */
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
    updatePassword: async (password) => {
      const res = await supabase.auth.updateUser({ password });
      if (!res.error) setRecovery(false);
      return res;
    },

    createHousehold: async ({ role, myName, otherName, children }) => {
      const { error } = await supabase.rpc('create_household', {
        p_role: role,
        p_my_name: myName,
        p_other_name: otherName,
        p_children: children,
      });
      if (error) throw error;
      await loadMembership();
    },
    joinHousehold: async (code) => {
      const { data, error } = await supabase.rpc('join_household', { p_code: code });
      if (error) throw error;
      if (!data) throw new Error('Código inválido. Revisalo o pedile al otro progenitor que te lo vuelva a pasar.');
      await loadMembership();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
