import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

/** Sesión del usuario + familia (household) a la que pertenece. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  // Familia del usuario, guardada junto con el id del usuario al que corresponde.
  const [membershipState, setMembershipState] = useState({ userId: undefined, data: undefined });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  const loadMembership = useCallback(async () => {
    if (!userId) {
      setMembershipState({ userId: null, data: null });
      return;
    }
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    setMembershipState({ userId, data: data ?? null });
  }, [userId]);

  // Supabase emite varios eventos de sesión (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED);
  // la familia solo se recarga cuando cambia el usuario, no en cada evento.
  const sessionReady = session !== undefined;
  useEffect(() => {
    if (!sessionReady) return;
    loadMembership().catch(() => setMembershipState({ userId: userId ?? null, data: null }));
  }, [sessionReady, loadMembership, userId]);

  // Mientras no se cargó la familia del usuario actual, se considera "cargando".
  const membership = membershipState.userId === (userId ?? null) ? membershipState.data : undefined;

  const value = {
    session,
    user: session?.user ?? null,
    membership,
    loading: session === undefined || (session && membership === undefined),

    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),

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
      const { error } = await supabase.rpc('join_household', { p_code: code });
      if (error) throw error;
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
