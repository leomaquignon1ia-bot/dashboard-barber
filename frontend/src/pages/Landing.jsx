import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scissors, Crown, Sparkles, AlertTriangle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { DEMO_SALON_ID, supabase } from "@/lib/supabase";

const ClientIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const BarberPoleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="20" rx="3"/>
    <path d="M9 6c2 1 4 1 6 0"/>
    <path d="M9 10c2 1 4 1 6 0"/>
    <path d="M9 14c2 1 4 1 6 0"/>
    <path d="M9 18c2 1 4 1 6 0"/>
  </svg>
);

const StoresIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18l1 5H2L3 3z"/>
    <path d="M2 8v13h20V8"/>
    <path d="M8 8v2a4 4 0 0 1-6 0V8"/>
    <path d="M14 8v2a4 4 0 0 0 8 0V8"/>
    <rect x="9" y="14" width="6" height="7" rx="0.5"/>
  </svg>
);

const RoleCard = ({ to, label, sublabel, Icon, testid }) => (
  <Link
    to={to}
    data-testid={testid}
    className="group relative flex items-center justify-between gap-4 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 hover:border-black dark:hover:border-white transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <div>
        <div className="font-semibold tracking-tight">{label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{sublabel}</div>
      </div>
    </div>
    <span className="text-neutral-400 group-hover:translate-x-1 transition-transform">→</span>
  </Link>
);

export default function Landing() {
  const { salon } = useTheme();
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { error } = await supabase.from("salons").select("id, tarifs, locks_actif").limit(1);
      if (active) setSetupNeeded(!!error);
    };
    check();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-2xl mx-auto px-6 py-12 sm:py-16">
        {setupNeeded && (
          <div className="mb-8 border border-[#F59E0B]/40 bg-[#F59E0B]/10 rounded-lg p-4 text-sm flex gap-3">
            <AlertTriangle className="shrink-0 text-[#F59E0B]" size={18}/>
            <div>
              <div className="font-semibold mb-1">Configuration Supabase requise</div>
              <div className="text-neutral-600 dark:text-neutral-400">
                Ouvre ton <span className="font-mono">Supabase → SQL Editor</span> et exécute <span className="font-mono">/app/supabase_schema.sql</span> PUIS <span className="font-mono">/app/supabase_update.sql</span> pour créer les colonnes (adresse, qr_token, tarifs, franchise, rdv…), activer les politiques RLS et rafraîchir le cache PostgREST.
              </div>
            </div>
          </div>
        )}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-md bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
              <Scissors size={16} />
            </div>
            <div className="label-uppercase">Dashboard Barber</div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-[0.95]">
            Le salon, <br/>
            <span className="text-neutral-400">en temps réel.</span>
          </h1>
          <p className="mt-5 text-base text-neutral-600 dark:text-neutral-400 max-w-md">
            Plateforme de gestion intelligente pour barbershops. File d'attente, coiffeurs, RDV et pourboires — sur un seul écran.
          </p>
        </header>

        <div className="space-y-3 fade-up">
          <div className="label-uppercase mb-3">Accéder en tant que</div>
          <RoleCard
            to={`/client/${salon?.id || DEMO_SALON_ID}`}
            label="Client"
            sublabel="S'inscrire dans la file d'attente"
            Icon={ClientIcon}
            testid="role-client"
          />
          <RoleCard to="/login?role=coiffeur" label="Coiffeur" sublabel="Mon interface coiffeur" Icon={Scissors} testid="role-coiffeur" />
          <RoleCard to="/login?role=gerant" label="Gérant" sublabel="Dashboard de mon salon" Icon={BarberPoleIcon} testid="role-gerant" />
          <RoleCard to="/login?role=franchise" label="Franchisé" sublabel="Vue multi-salons" Icon={StoresIcon} testid="role-franchise" />
          <RoleCard to="/login?role=super_admin" label="Super Admin" sublabel="Vue plateforme (Léo)" Icon={Crown} testid="role-super-admin" />
        </div>

        <footer className="mt-16 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <span>© Dashboard Barber</span>
          <span className="flex items-center gap-1.5"><Sparkles size={12}/> v1.0 MVP</span>
        </footer>
      </div>
    </div>
  );
}