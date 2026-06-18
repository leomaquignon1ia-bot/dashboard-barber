import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from('user_roles').select('*').eq('user_id', userId).maybeSingle();
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session?.user?.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  // Stable action handlers grouped in one memo (reduces value-memo dependency count below)
  const actions = useMemo(() => ({
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: async (email, password, role, salonId, prenom) => {
      let userId;
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        // Si le compte existe déjà, on tente une connexion automatique
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          const { data: signed, error: errSignin } = await supabase.auth.signInWithPassword({ email, password });
          if (errSignin) return { error: errSignin };
          userId = signed.user?.id;
        } else {
          return { error };
        }
      } else {
        userId = data.user?.id;
      }
      if (userId) {
        await supabase.from('user_roles').upsert({ user_id: userId, role, salon_id: salonId, prenom });
      }
      return { data: { user: { id: userId } } };
    },
    signOut: () => supabase.auth.signOut(),
  }), []);

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session]);

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile, ...actions }),
    [session, profile, loading, refreshProfile, actions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
