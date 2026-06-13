import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      loadProfile(session?.user?.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      loadProfile(session?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from('user_roles').select('*').eq('user_id', userId).maybeSingle();
    setProfile(data);
    setLoading(false);
  };

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });

  const signUp = async (email, password, role, salonId, prenom) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    const userId = data.user?.id;
    if (userId) {
      await supabase.from('user_roles').upsert({ user_id: userId, role, salon_id: salonId, prenom });
    }
    return { data };
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile: () => loadProfile(session?.user?.id) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
