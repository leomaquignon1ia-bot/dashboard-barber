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

  const signIn = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), []);

  const signUp = useCallback(async (email, password, role, salonId, prenom) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    const userId = data.user?.id;
    if (userId) {
      await supabase.from('user_roles').upsert({ user_id: userId, role, salon_id: salonId, prenom });
    }
    return { data };
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);
  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session]);

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
