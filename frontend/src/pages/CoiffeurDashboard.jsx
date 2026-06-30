import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, CheckCircle2, XCircle, TrendingUp, Coins, Pause, Play, QrCode, CalendarClock } from "lucide-react";

export default function CoiffeurDashboard() {
  const { profile, signOut } = useAuth();
  const { salon } = useTheme();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [queue, setQueue] = useState([]);
  const [rdvs, setRdvs] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, tips_today: 0, tips_month: 0 });
  const [tipModal, setTipModal] = useState(null);
  const [customTip, setCustomTip] = useState("");
  const [qrModal, setQrModal] = useState(false);

  const loadStats = useCallback(async (coiffeurId) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const { data: tD } = await supabase.from("file_attente").select("id").eq("coiffeur_id", coiffeurId).eq("statut","termine").gte("termine_at", today.toISOString());
    const { data: tW } = await supabase.from("file_attente").select("id").eq("coiffeur_id", coiffeurId).eq("statut","termine").gte("termine_at", weekStart.toISOString());
    const { data: tM } = await supabase.from("file_attente").select("id").eq("coiffeur_id", coiffeurId).eq("statut","termine").gte("termine_at", monthStart.toISOString());
    const { data: pD } = await supabase.from("pourboires").select("montant").eq("coiffeur_id", coiffeurId).gte("created_at", today.toISOString());
    const { data: pM } = await supabase.from("pourboires").select("montant").eq("coiffeur_id", coiffeurId).gte("created_at", monthStart.toISOString());
    setStats({
      today: tD?.length || 0,
      week: tW?.length || 0,
      month: tM?.length || 0,
      tips_today: (pD||[]).reduce((s,p)=>s+Number(p.montant),0),
      tips_month: (pM||[]).reduce((s,p)=>s+Number(p.montant),0),
    });
  }, []);

  const loadQueue = useCallback(async (cid) => {
    const coiffeurId = cid || me?.id; if (!coiffeurId) return;
    const { data } = await supabase.from("file_attente").select("*").eq("coiffeur_id", coiffeurId).order("created_at");
    setQueue(data || []);
  }, [me?.id]);

  const loadRdvs = useCallback(async (cid) => {
    const coiffeurId = cid || me?.id; if (!coiffeurId) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    const { data } = await supabase.from("rdv").select("*").eq("coiffeur_id", coiffeurId)
      .gte("date_rdv", today.toISOString()).lt("date_rdv", tomorrow.toISOString())
      .order("date_rdv");
    setRdvs(data || []);
  }, [me?.id]);

  const loadMe = useCallback(async () => {
    const { data } = await supabase.from("coiffeurs").select("*").eq("salon_id", profile.salon_id).ilike("prenom", profile.prenom).maybeSingle();
    if (data) { setMe(data); loadQueue(data.id); loadStats(data.id); loadRdvs(data.id); }
  }, [profile, loadQueue, loadStats, loadRdvs]);

  useEffect(() => {
    if (!profile?.salon_id || !profile.prenom) return;
    loadMe();
    const channel = supabase.channel("coiffeur-feed")
      .on("postgres_changes", { event:"*", schema:"public", table:"file_attente" }, () => loadQueue())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile, loadMe, loadQueue]);

  const toggleDispo = async (v) => {
    const { error } = await supabase.from("coiffeurs").update({ disponible: v, pointage_at: v ? new Date().toISOString() : me?.pointage_at }).eq("id", me.id);
    if (error) return toast.error("Erreur");
    setMe({ ...me, disponible: v });
    toast.success(v ? "Vous êtes disponible" : "Vous êtes hors-ligne");
  };

  const togglePause = async () => {
    const next = !me.en_pause;
    const { error } = await supabase.from("coiffeurs").update({ en_pause: next, pause_at: new Date().toISOString() }).eq("id", me.id);
    if (error) return toast.error("Erreur");
    setMe({ ...me, en_pause: next });
    toast.success(next ? "Pause activée" : "Reprise du service");
  };

  const finirJournee = async () => {
    const { error } = await supabase.from("coiffeurs").update({ disponible: false, en_pause: false, fin_journee_at: new Date().toISOString() }).eq("id", me.id);
    if (error) return toast.error("Erreur");
    setMe({ ...me, disponible: false, en_pause: false });
    toast.success("Fin de journée enregistrée");
  };

  const terminer = async (item) => {
    await supabase.from("file_attente").update({ statut:"termine", termine_at: new Date().toISOString() }).eq("id", item.id);
    setTipModal(item);
    loadStats(me.id);
  };
  const absent = async (item) => {
    await supabase.from("file_attente").update({ statut:"absent" }).eq("id", item.id);
    toast.message("Client marqué absent");
  };
  const validerTip = async (montant) => {
    if (!tipModal) return;
    const m = Number(montant) || 0;
    if (m < 0) { toast.error("Montant invalide"); return; }
    if (m > 0) {
      const { error } = await supabase.from("pourboires").insert({
        salon_id: tipModal.salon_id,
        coiffeur_id: me.id,
        client_id: tipModal.client_id,
        montant: m,
      });
      if (error) { toast.error(`Erreur: ${error.message}`); return; }
    }
    setTipModal(null); setCustomTip("");
    loadStats(me.id);
    toast.success(m>0 ? `Pourboire +${m}€ enregistré` : "Pourboire passé");
  };

  const next = queue.find(q => q.statut === "en_attente" || q.statut === "en_cours");

  if (!me) return <div className="min-h-screen flex items-center justify-center label-uppercase">Chargement…</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5] pb-12">
      <div className="max-w-md mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold">{me.prenom[0]}</div>
            <div>
              <div className="font-bold tracking-tight">{me.prenom}</div>
              <div className="text-xs text-neutral-500">{salon?.nom}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button data-testid="qr-pointage-btn" onClick={() => setQrModal(true)} className="text-neutral-500 hover:text-current" title="Mon QR pointage"><QrCode size={18}/></button>
            <button data-testid="signout" onClick={() => { signOut(); navigate("/"); }} className="text-neutral-500 hover:text-current"><LogOut size={18}/></button>
          </div>
        </div>

        {/* Dispo + Pause + Fin journée */}
        <div className={`p-5 rounded-lg border ${me.disponible ? (me.en_pause ? "border-[#F59E0B] bg-[#F59E0B]/5" : "border-[#3B82F6] bg-[#3B82F6]/5") : "border-neutral-200 dark:border-neutral-800"}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-uppercase">Statut du jour</div>
              <div className={`text-lg font-bold tracking-tight ${me.disponible ? (me.en_pause ? "text-[#F59E0B]" : "text-[#3B82F6]") : "text-neutral-400"}`}>
                {me.disponible ? (me.en_pause ? "En pause" : "Disponible") : "Hors-ligne"}
              </div>
              {me.pointage_at && me.disponible && (
                <div className="text-xs text-neutral-500 mt-0.5">Pointé à {new Date(me.pointage_at).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}</div>
              )}
            </div>
            <Switch data-testid="dispo-toggle" checked={me.disponible} onCheckedChange={toggleDispo}/>
          </div>
          {me.disponible && (
            <div className="grid grid-cols-2 gap-3">
              <Button data-testid="pause-btn" variant="outline" onClick={togglePause} className="h-10 font-semibold">
                {me.en_pause ? <><Play size={14} className="mr-1"/>Reprendre</> : <><Pause size={14} className="mr-1"/>Pause</>}
              </Button>
              <Button data-testid="fin-journee-btn" variant="outline" onClick={finirJournee} className="h-10 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 font-semibold">
                <LogOut size={14} className="mr-1"/> Fin journée
              </Button>
            </div>
          )}
        </div>

        {/* Next client */}
        <div className="mt-6">
          <div className="label-uppercase mb-2">Prochain client</div>
          {next ? (
            <div className="border-2 border-black dark:border-white rounded-lg p-6">
              <div className="text-3xl font-black tracking-tighter mb-1">{next.prenom}</div>
              <div className="text-sm text-neutral-500 mb-5">
                {next.type_coupe} · {next.texture}{next.finition?` · ${next.finition}`:""}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button data-testid="termine-btn" onClick={()=>terminer(next)} className="h-12 bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold">
                  <CheckCircle2 size={16} className="mr-1"/> Terminée
                </Button>
                <Button data-testid="absent-btn" onClick={()=>absent(next)} variant="outline" className="h-12 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 font-semibold">
                  <XCircle size={16} className="mr-1"/> Absent
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center text-sm text-neutral-500">
              Aucun client en attente
            </div>
          )}
        </div>

        {/* Personal queue */}
        <div className="mt-8">
          <div className="label-uppercase mb-3">Ma file ({queue.filter(q=>q.statut==="en_attente").length})</div>
          <div className="space-y-2">
            {queue.length === 0 && <div className="text-sm text-neutral-500">Aucun client.</div>}
            {queue.map(q => (
              <div key={q.id} className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3">
                <div>
                  <div className="font-semibold text-sm">{q.prenom}</div>
                  <div className="text-xs text-neutral-500">{q.type_coupe}</div>
                </div>
                <StatusPill statut={q.statut}/>
              </div>
            ))}
          </div>
        </div>

        {/* RDV du jour */}
        <div className="mt-8">
          <div className="label-uppercase mb-3 flex items-center gap-1.5"><CalendarClock size={12}/> RDV du jour ({rdvs.length})</div>
          {rdvs.length === 0 ? (
            <div className="text-sm text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">Aucun rendez-vous planifié aujourd&apos;hui.</div>
          ) : (
            <div className="space-y-2">
              {rdvs.map(r => (
                <div key={r.id} className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3">
                  <div>
                    <div className="font-semibold text-sm">{r.prenom}</div>
                    <div className="text-xs text-neutral-500">{r.type_coupe || "Coupe"}</div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">{new Date(r.date_rdv).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8">
          <div className="label-uppercase mb-3">Mes stats</div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard Icon={TrendingUp} label="Coupes (j)" value={stats.today}/>
            <StatCard Icon={TrendingUp} label="Coupes (sem.)" value={stats.week}/>
            <StatCard Icon={TrendingUp} label="Coupes (mois)" value={stats.month}/>
            <StatCard Icon={Coins} label="Pourboires (j)" value={`${stats.tips_today}€`}/>
            <StatCard Icon={Coins} label="Pourboires (mois)" value={`${stats.tips_month}€`}/>
          </div>
        </div>
      </div>

      {/* Tip modal */}
      <Dialog open={!!tipModal} onOpenChange={(o)=>!o&&setTipModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pourboire</DialogTitle>
            <DialogDescription>Choisissez un montant rapide ou saisissez un montant libre.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-neutral-500 mb-3">Montrer cet écran au client</div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[2,5,10].map(m => (
              <button key={m} data-testid={`tip-${m}`} onClick={()=>validerTip(m)} className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white font-bold text-lg">
                {m}€
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <input data-testid="tip-custom-input" type="number" min="1" step="1" placeholder="Montant libre (min 1€)" value={customTip} onChange={(e)=>setCustomTip(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm"/>
            <Button data-testid="tip-custom-ok" onClick={()=>validerTip(Number(customTip)||0)} disabled={!customTip || Number(customTip) < 1}>OK</Button>
          </div>
          {customTip && Number(customTip) < 1 && (
            <div className="text-xs text-[#EF4444] mb-2">Montant minimum : 1€</div>
          )}
          <button data-testid="tip-pass" onClick={()=>validerTip(0)} className="w-full h-12 rounded-md bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm font-semibold">
            Passer / 0€
          </button>
          {tipModal && (
            <div className="mt-3 text-xs text-neutral-500 text-center">
              Total à saisir au TPE : <span className="font-bold text-base text-current">{Number(tipModal.prix) + (Number(customTip)||0)}€</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* QR Pointage modal */}
      <Dialog open={qrModal} onOpenChange={setQrModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mon QR de pointage</DialogTitle>
            <DialogDescription>Scannez ce QR avec votre téléphone pour pointer l&apos;arrivée, prendre une pause ou terminer la journée.</DialogDescription>
          </DialogHeader>
          {me.qr_token ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <img
                data-testid="qr-image"
                alt="QR Pointage"
                width={220}
                height={220}
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.origin + "/coiffeur/pointage/" + me.qr_token)}`}
                className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white"
              />
              <div className="text-xs text-neutral-500 break-all text-center" data-testid="qr-link">
                {window.location.origin}/coiffeur/pointage/{me.qr_token}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#EF4444]">QR token non généré. Demande au gérant de régénérer.</div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

const StatusPill = ({ statut }) => {
  const map = {
    en_attente: { c: "#3B82F6", l: "En attente" },
    en_cours: { c: "#F59E0B", l: "En cours" },
    termine: { c: "#10B981", l: "Terminé" },
    absent: { c: "#EF4444", l: "Absent" },
  };
  const s = map[statut] || map.en_attente;
  return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{ color: s.c, background: s.c+"15" }}>{s.l}</span>;
};

const StatCard = ({ Icon, label, value }) => (
  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
    <div className="flex items-center gap-1.5 label-uppercase mb-1"><Icon size={12}/>{label}</div>
    <div className="text-2xl font-black tracking-tight">{value}</div>
  </div>
);
