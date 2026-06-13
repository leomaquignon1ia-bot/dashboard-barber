import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Building2, Users, TrendingUp, Coins, AlertCircle } from "lucide-react";

export default function SuperAdmin() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [salons, setSalons] = useState([]);
  const [stats, setStats] = useState({ totalCA: 0, totalCoiffeurs: 0, totalClients: 0, totalTips: 0, plans: { starter:0, pro:0, studio:0 } });

  const load = useCallback(async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const [{ data: ss }, { data: cs }, { data: q }, { data: tips }] = await Promise.all([
      supabase.from("salons").select("*"),
      supabase.from("coiffeurs").select("id, salon_id, disponible"),
      supabase.from("file_attente").select("prix, salon_id, statut, created_at").gte("created_at", today.toISOString()),
      supabase.from("pourboires").select("montant, salon_id").gte("created_at", today.toISOString()),
    ]);
    const totalCA = (q||[]).filter(x=>x.statut==="termine").reduce((s,x)=>s+Number(x.prix||0),0);
    const totalTips = (tips||[]).reduce((s,x)=>s+Number(x.montant),0);
    const plans = { starter:0, pro:0, studio:0 };
    (ss||[]).forEach(s => { plans[s.plan || "starter"] = (plans[s.plan || "starter"] || 0) + 1; });
    setStats({
      totalCA,
      totalCoiffeurs: (cs||[]).filter(c=>c.disponible).length,
      totalClients: (q||[]).length,
      totalTips,
      plans
    });
    setSalons(ss || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setPlan = async (id, plan) => {
    await supabase.from("salons").update({ plan }).eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-6xl mx-auto px-5 py-6 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="label-uppercase">Super Admin · Léo</div>
            <h1 className="text-3xl font-black tracking-tighter">Plateforme</h1>
          </div>
          <button data-testid="signout" onClick={() => { signOut(); navigate("/"); }} className="text-neutral-500 hover:text-current"><LogOut size={18}/></button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <KPI Icon={Building2} label="Salons" value={salons.length}/>
          <KPI Icon={Users} label="Coiffeurs actifs" value={stats.totalCoiffeurs}/>
          <KPI Icon={TrendingUp} label="CA du jour" value={`${stats.totalCA}€`}/>
          <KPI Icon={Coins} label="Pourboires (j)" value={`${stats.totalTips}€`}/>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <KPI label="Starter" value={stats.plans.starter} accent="#9CA3AF"/>
          <KPI label="Pro" value={stats.plans.pro} accent="#3B82F6"/>
          <KPI label="Studio" value={stats.plans.studio} accent="#10B981"/>
        </div>

        <div className="label-uppercase mb-3">Tous les salons</div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
          {salons.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {s.logo_url && <img src={s.logo_url} className="w-8 h-8 rounded-md object-cover" alt=""/>}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.nom}</div>
                  <div className="text-xs text-neutral-500">{s.id.slice(0,8)}</div>
                </div>
              </div>
              <select data-testid={`plan-${s.id}`} value={s.plan || "starter"} onChange={(e)=>setPlan(s.id, e.target.value)} className="text-xs border border-neutral-200 dark:border-neutral-800 rounded-md px-2 py-1 bg-transparent">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="studio">Studio</option>
              </select>
            </div>
          ))}
          {salons.length === 0 && <div className="p-8 text-center text-sm text-neutral-500"><AlertCircle className="inline mr-1" size={14}/>Aucun salon enregistré</div>}
        </div>
      </div>
    </div>
  );
}

const KPI = ({ Icon, label, value, accent }) => (
  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
    <div className="flex items-center gap-1.5 label-uppercase mb-1" style={accent?{color:accent}:undefined}>{Icon && <Icon size={12}/>}{label}</div>
    <div className="text-2xl lg:text-3xl font-black tracking-tighter">{value}</div>
  </div>
);
