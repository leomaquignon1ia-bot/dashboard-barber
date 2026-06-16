import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Users, TrendingUp, Coins, Star, Settings, Scissors, Plus, X } from "lucide-react";
import { BarberChair } from "@/components/Illustrations";
import FeatureLock from "@/components/FeatureLock";

const chairColor = (count, actif) => {
  if (!actif) return "#9CA3AF";
  if (count >= 6) return "#EF4444";
  if (count >= 3) return "#F59E0B";
  if (count >= 1) return "#3B82F6";
  return "#9CA3AF";
};

export default function GerantDashboard() {
  const { profile, signOut } = useAuth();
  const { salon, loadSalon } = useTheme();
  const navigate = useNavigate();

  const [coiffeurs, setCoiffeurs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [filterCoiffeur, setFilterCoiffeur] = useState("all");
  const [stats, setStats] = useState({ clients: 0, ca: 0, tips: 0, top: "—" });

  const loadAll = useCallback(async () => {
    const sId = profile.salon_id;
    const [{ data: cs }, { data: q }] = await Promise.all([
      supabase.from("coiffeurs").select("*").eq("salon_id", sId).eq("actif", true),
      supabase.from("file_attente").select("*").eq("salon_id", sId).order("created_at"),
    ]);
    setCoiffeurs(cs || []);
    setQueue(q || []);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayQ = (q || []).filter(x => new Date(x.created_at) >= today);
    const done = todayQ.filter(x => x.statut === "termine");
    const ca = done.reduce((s,x) => s + Number(x.prix || 0), 0);
    const { data: tips } = await supabase.from("pourboires").select("montant, coiffeur_id").eq("salon_id", sId).gte("created_at", today.toISOString());
    const tipsTotal = (tips||[]).reduce((s,x)=>s+Number(x.montant),0);
    const counts = {};
    done.forEach(d => { if (d.coiffeur_id) counts[d.coiffeur_id] = (counts[d.coiffeur_id]||0)+1; });
    let topId = null, topN = 0;
    Object.entries(counts).forEach(([id,n])=>{ if(n>topN){topN=n;topId=id;} });
    const top = (cs||[]).find(c=>c.id===topId)?.prenom || "—";
    setStats({ clients: done.length, ca, tips: tipsTotal, top });
  }, [profile]);

  useEffect(() => {
    if (!profile?.salon_id) return;
    loadAll();
    const ch = supabase.channel("gerant-feed")
      .on("postgres_changes", { event:"*", schema:"public", table:"file_attente" }, loadAll)
      .on("postgres_changes", { event:"*", schema:"public", table:"coiffeurs" }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile, loadAll]);

  const assignCoiffeur = async (fileId, coiffeurId) => {
    await supabase.from("file_attente").update({ coiffeur_id: coiffeurId, peu_importe: false }).eq("id", fileId);
    toast.success("Client assigné");
  };

  const availableCoiffeurs = useMemo(() => coiffeurs.filter(c => c.disponible), [coiffeurs]);

  const filteredQueue = useMemo(
    () => queue.filter(q => filterCoiffeur === "all" || q.coiffeur_id === filterCoiffeur),
    [queue, filterCoiffeur]
  );

  if (!salon) return <div className="min-h-screen flex items-center justify-center label-uppercase">Chargement…</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-6xl mx-auto px-5 py-6 lg:px-8 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {salon?.logo_url ? (
              <img src={salon.logo_url} alt="" className="w-10 h-10 rounded-md object-cover"/>
            ) : (
              <div className="w-10 h-10 rounded-md bg-black dark:bg-white text-white dark:text-black flex items-center justify-center">
                <Scissors size={18}/>
              </div>
            )}
            <div>
              <div className="label-uppercase">Dashboard</div>
              <div className="text-2xl font-black tracking-tighter">{salon.nom}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-neutral-500 hidden sm:block">{new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}</div>
            <button data-testid="signout" onClick={() => { signOut(); navigate("/"); }} className="text-neutral-500 hover:text-current"><LogOut size={18}/></button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <KPI Icon={Users} label="Clients du jour" value={stats.clients}/>
          <KPI Icon={TrendingUp} label="CA du jour" value={`${stats.ca}€`}/>
          <KPI Icon={Coins} label="Pourboires" value={`${stats.tips}€`}/>
          <KPI Icon={Star} label="Top coiffeur" value={stats.top}/>
        </div>

        <Tabs defaultValue="chaises">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger data-testid="tab-chaises" value="chaises">Chaises</TabsTrigger>
            <TabsTrigger data-testid="tab-file" value="file">File d&apos;attente</TabsTrigger>
            <TabsTrigger data-testid="tab-pourboires" value="pourboires">Pourboires</TabsTrigger>
            <TabsTrigger data-testid="tab-params" value="params">Paramètres</TabsTrigger>
          </TabsList>

          {/* Chaises */}
          <TabsContent value="chaises">
            <div className="flex justify-end mb-3">
              <AjouterCoiffeurBtn salonId={profile.salon_id} onAdded={loadAll}/>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              {coiffeurs.map(c => {
                const count = queue.filter(q => q.coiffeur_id === c.id && ["en_attente","en_cours"].includes(q.statut)).length;
                return (
                  <div key={c.id} className="flex flex-col items-center gap-1">
                    <BarberChair color={chairColor(count, c.disponible)} label={c.prenom} count={count}/>
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: c.disponible ? "#3B82F6" : "#EF4444" }}>
                      {c.disponible ? "Actif" : "Inactif"}
                    </span>
                  </div>
                );
              })}
              {coiffeurs.length === 0 && <div className="col-span-full text-center text-sm text-neutral-500 py-10">Aucun coiffeur actif</div>}
            </div>
          </TabsContent>

          {/* File */}
          <TabsContent value="file">
            <div className="flex flex-wrap gap-2 mb-4">
              <button data-testid="filter-all" onClick={()=>setFilterCoiffeur("all")} className={`text-xs px-3 py-1.5 rounded-md border ${filterCoiffeur==="all"?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>Tous</button>
              {coiffeurs.map(c => (
                <button key={c.id} data-testid={`filter-${c.id}`} onClick={()=>setFilterCoiffeur(c.id)} className={`text-xs px-3 py-1.5 rounded-md border ${filterCoiffeur===c.id?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>{c.prenom}</button>
              ))}
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredQueue.length === 0 && <div className="p-8 text-center text-sm text-neutral-500">File vide.</div>}
              {filteredQueue.map(q => (
                <div key={q.id} className="flex items-center justify-between p-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{q.prenom} {q.peu_importe && <span className="text-[10px] text-[#F59E0B] font-bold ml-1">PEU IMPORTE</span>}</div>
                    <div className="text-xs text-neutral-500 truncate">{q.type_coupe} · {q.is_adulte?"Adulte":"Enfant"} · {q.prix}€</div>
                  </div>
                  {q.peu_importe && q.statut === "en_attente" && (
                    <select data-testid={`assign-${q.id}`} onChange={(e)=>assignCoiffeur(q.id, e.target.value)} className="text-xs border border-neutral-200 dark:border-neutral-800 rounded-md px-2 py-1 bg-transparent">
                      <option value="">Assigner…</option>
                      {availableCoiffeurs.map(c => <option key={c.id} value={c.id}>{c.prenom}</option>)}
                    </select>
                  )}
                  <StatusPill statut={q.statut}/>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Pourboires */}
          <TabsContent value="pourboires">
            <PourboiresView salonId={profile.salon_id} coiffeurs={coiffeurs}/>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="params">
            <ParamsView salon={salon} onSaved={() => loadSalon(salon.id)}/>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const KPI = ({ Icon, label, value }) => (
  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
    <div className="flex items-center gap-1.5 label-uppercase mb-1"><Icon size={12}/>{label}</div>
    <div className="text-2xl lg:text-3xl font-black tracking-tighter">{value}</div>
  </div>
);

const StatusPill = ({ statut }) => {
  const map = { en_attente: { c: "#3B82F6", l: "En attente" }, en_cours: { c: "#F59E0B", l: "En cours" }, termine: { c: "#10B981", l: "Terminé" }, absent: { c: "#EF4444", l: "Absent" }};
  const s = map[statut] || map.en_attente;
  return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md whitespace-nowrap" style={{ color: s.c, background: s.c+"15" }}>{s.l}</span>;
};

const PourboiresView = ({ salonId, coiffeurs }) => {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
    supabase.from("pourboires").select("*").eq("salon_id", salonId).gte("created_at", month.toISOString())
      .then(({ data }) => setRows(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);
  const total = useMemo(() => rows.reduce((s,r)=>s+Number(r.montant),0), [rows]);
  const byCoiffeur = useMemo(
    () => coiffeurs.map(c => ({ ...c, total: rows.filter(r=>r.coiffeur_id===c.id).reduce((s,r)=>s+Number(r.montant),0) })),
    [coiffeurs, rows]
  );
  return (
    <div>
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-4">
        <div className="label-uppercase mb-1">Total du mois</div>
        <div className="text-4xl font-black tracking-tighter">{total}€</div>
      </div>
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
        {byCoiffeur.map(c => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div className="font-semibold">{c.prenom}</div>
            <div className="font-bold">{c.total}€</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ParamsView = ({ salon, onSaved }) => {
  const [form, setForm] = useState(salon);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(salon), [salon]);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("salons").update({
      consignes: form.consignes,
      horaire_ouverture: form.horaire_ouverture,
      horaire_fermeture: form.horaire_fermeture,
      limite_rdv_classique: form.limite_rdv_classique,
      limite_fs: form.limite_fs,
      delai_retard_rdv: Number(form.delai_retard_rdv),
      delai_retard_fs: Number(form.delai_retard_fs),
      google_business_url: form.google_business_url,
      locks_actif: form.locks_actif,
    }).eq("id", salon.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Paramètres enregistrés");
    onSaved && onSaved();
  };
  const isStarter = salon.plan === "starter";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Horaire ouverture"><Input data-testid="param-ouverture" value={form.horaire_ouverture||""} onChange={e=>setForm({...form, horaire_ouverture:e.target.value})}/></Field>
        <Field label="Horaire fermeture"><Input data-testid="param-fermeture" value={form.horaire_fermeture||""} onChange={e=>setForm({...form, horaire_fermeture:e.target.value})}/></Field>
        <Field label="Limite RDV classique"><Input value={form.limite_rdv_classique||""} onChange={e=>setForm({...form, limite_rdv_classique:e.target.value})}/></Field>
        <Field label="Limite inscription FS"><Input value={form.limite_fs||""} onChange={e=>setForm({...form, limite_fs:e.target.value})}/></Field>
        <Field label="Délai retard RDV (min)"><Input type="number" value={form.delai_retard_rdv||0} onChange={e=>setForm({...form, delai_retard_rdv:e.target.value})}/></Field>
        <Field label="Délai retard FS (min)"><Input type="number" value={form.delai_retard_fs||0} onChange={e=>setForm({...form, delai_retard_fs:e.target.value})}/></Field>
      </div>
      <Field label="Consignes salon">
        <Textarea data-testid="param-consignes" rows={4} value={form.consignes||""} onChange={e=>setForm({...form, consignes:e.target.value})}/>
      </Field>
      <Field label="Lien Google My Business">
        <Input value={form.google_business_url||""} onChange={e=>setForm({...form, google_business_url:e.target.value})}/>
      </Field>
      <div className="flex items-center justify-between border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
        <div>
          <div className="font-semibold">Locks / Tresses / Twist</div>
          <div className="text-xs text-neutral-500">Activer cette prestation pour les clients</div>
        </div>
        <Switch data-testid="param-locks" checked={!!form.locks_actif} onCheckedChange={(v)=>setForm({...form, locks_actif:v})}/>
      </div>

      <FeatureLock locked={isStarter} requiredPlan="pro" featureName="Calendrier RDV avancé" currentPlan={salon.plan} salonName={salon.nom}>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2"><Settings size={14}/><span className="label-uppercase">Plan {salon.plan?.toUpperCase()}</span></div>
          <div className="text-sm text-neutral-500">Calendrier RDV avec rappels SMS Brevo, gestion STOP SMS et avis Google automatiques.</div>
        </div>
      </FeatureLock>

      <Button data-testid="save-params" onClick={save} disabled={saving} className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 h-11 px-6 font-semibold">
        {saving?"...":"Enregistrer"}
      </Button>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="label-uppercase">{label}</Label>
    {children}
  </div>
);

const AjouterCoiffeurBtn = ({ salonId, onAdded }) => {
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!prenom.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("coiffeurs").insert({ salon_id: salonId, prenom: prenom.trim(), actif: true, disponible: false });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${prenom} ajouté. Invite-le à créer son compte sur /login?role=coiffeur (prénom: ${prenom.trim()})`);
    setPrenom(""); setOpen(false); onAdded && onAdded();
  };
  if (!open) return (
    <Button data-testid="add-coiffeur-btn" onClick={() => setOpen(true)} variant="outline" size="sm" className="border-dashed">
      <Plus size={14} className="mr-1"/> Ajouter un coiffeur
    </Button>
  );
  return (
    <div className="flex items-center gap-2">
      <Input data-testid="add-coiffeur-prenom" placeholder="Prénom" value={prenom} onChange={e=>setPrenom(e.target.value)} className="h-9 w-40"/>
      <Button data-testid="add-coiffeur-save" onClick={add} disabled={saving} size="sm">Créer</Button>
      <button onClick={() => { setOpen(false); setPrenom(""); }}><X size={16}/></button>
    </div>
  );
};
