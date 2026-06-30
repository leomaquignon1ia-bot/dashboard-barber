import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, DEMO_SALON_ID } from '@/lib/supabase';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [salon, setSalon] = useState(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const loadSalon = useCallback(async (salonId) => {
    if (!salonId) return;
    const { data } = await supabase.from('salons').select('*').eq('id', salonId).maybeSingle();
    if (data) {
      setSalon(data);
      document.documentElement.style.setProperty('--brand-primary', data.primary_color || '#4F46E5');
    }
  }, []);

  useEffect(() => {
    loadSalon(DEMO_SALON_ID);
  }, [loadSalon]);

  const value = useMemo(
    () => ({ salon, isDark, setIsDark, loadSalon }),
    [salon, isDark, loadSalon]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
