import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Building2, Users, TrendingUp, Coins, ExternalLink } from "lucide-react";
import { ScissorsLogo } from "@/components/Illustrations";

export default function FranchiseDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [stats, setStats] = useState({ totalCA: 0, totalTips: 0, totalCoiffeurs: 0, totalClients: 0 });

  const load = useCallback(async () => {
    if (!profile?.salon_id && !profile?.franchise_id) {
      // pour franchise on stocke franchise_id dans salon_id pour MVP
    }
    const fid = profile?.franchise_id || profile?.salon_id;
    const today = new Date(); today.setHours(0,0,0,0);
    const { data: ss } = await supabase.from("salons").select("*").eq("franchise_id", fid);
    const list = ss || [];
    setSalons(list);
    const salonIds = list.map(s => s.id);
    if (salonIds.length === 0) {
      setStats({ totalCA: 0, totalTips: 0, totalCoiffeurs: 0, totalClients: 0 });
      return;
    }
    const [{ data: cs }, { data: q }, { data: tips }] = await Promise.all([
      supabase.from("coiffeurs").select("id, disponible").in("salon_id", salonIds),
      supabase.from("file_attente").select("prix, statut, created_at").in("salon_id", salonIds).gte("created_at", today.toISOString()),
      supabase.from("pourboires").select("montant").in("salon_id", salonIds).gte("created_at", today.toISOString()),
    ]);
    setStats({
      totalCA: (q||[]).filter(x=>x.statut==="termine").reduce((s,x)=>s+Number(x.prix||0),0),
      totalTips: (tips||[]).reduce((s,x)=>s+Number(x.montant),0),
      totalCoiffeurs: (cs||[]).filter(c=>c.disponible).length,
      totalClients: (q||[]).length,
    });
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-6xl mx-auto px-5 py-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="label-uppercase">Franchisé</div>
            <h1 className="text-3xl font-black tracking-tighter">Mes salons</h1>
          </div>
          <button data-testid="signout" onClick={() => { signOut(); navigate("/"); }} className="text-neutral-500 hover:text-current"><LogOut size={18}/></button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <KPI Icon={Building2} label="Salons" value={salons.length}/>
          <KPI Icon={Users} label="Coiffeurs actifs" value={stats.totalCoiffeurs}/>
          <KPI Icon={TrendingUp} label="CA du jour" value={`${stats.totalCA}€`}/>
          <KPI Icon={Coins} label="Pourboires (j)" value={`${stats.totalTips}€`}/>
        </div>

        <div className="label-uppercase mb-3">Vue par salon</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {salons.map(s => (
            <SalonCard key={s.id} salon={s}/>
          ))}
          {salons.length === 0 && (
            <div className="col-span-full border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-10 text-center text-sm text-neutral-500">
              Aucun salon rattaché à votre franchise.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const KPI = ({ Icon, label, value }) => (
  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
    <div className="flex items-center gap-1.5 label-uppercase mb-1">{Icon && <Icon size={12}/>}{label}</div>
    <div className="text-2xl lg:text-3xl font-black tracking-tighter">{value}</div>
  </div>
);

const SalonCard = ({ salon }) => {
  const [stats, setStats] = useState({ clients: 0, ca: 0, tips: 0 });
  useEffect(() => {
    const load = async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const [{ data: q }, { data: tips }] = await Promise.all([
        supabase.from("file_attente").select("prix, statut").eq("salon_id", salon.id).gte("created_at", today.toISOString()),
        supabase.from("pourboires").select("montant").eq("salon_id", salon.id).gte("created_at", today.toISOString()),
      ]);
      setStats({
        clients: (q||[]).length,
        ca: (q||[]).filter(x=>x.statut==="termine").reduce((s,x)=>s+Number(x.prix||0),0),
        tips: (tips||[]).reduce((s,x)=>s+Number(x.montant),0),
      });
    };
    load();
  }, [salon.id]);
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        {salon.logo_url
          ? <img src={salon.logo_url} alt="" className="w-10 h-10 rounded-md object-cover"/>
          : <ScissorsLogo size={40}/>}
        <div className="min-w-0 flex-1">
          <div className="font-bold tracking-tight truncate">{salon.nom}</div>
          <div className="text-xs text-neutral-500 truncate">{salon.ville || salon.adresse || "—"}</div>
        </div>
        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-900">{salon.plan}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label="Clients" value={stats.clients}/>
        <Mini label="CA" value={`${stats.ca}€`}/>
        <Mini label="Pourboires" value={`${stats.tips}€`}/>
      </div>
      <Link to={`/client/${salon.id}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-current">
        <ExternalLink size={12}/> Lien client
      </Link>
    </div>
  );
};

const Mini = ({ label, value }) => (
  <div>
    <div className="label-uppercase mb-0.5">{label}</div>
    <div className="font-bold">{value}</div>
  </div>
);
