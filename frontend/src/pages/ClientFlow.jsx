import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, DEMO_SALON_ID } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { HairTextureIcon, CutSilhouette } from "@/components/Illustrations";
const TEXTURES = [
  { id: "lisses", label: "Lisses" },
  { id: "ondules", label: "Ondulés" },
  { id: "boucles", label: "Bouclés" },
  { id: "crepus", label: "Crépus" },
];

const CUTS = [
  { id: "degrade_bas", label: "Dégradé bas" },
  { id: "degrade_haut", label: "Dégradé haut" },
  { id: "classique", label: "Coupe classique" },
  { id: "taper", label: "Taper" },
  { id: "locks", label: "Locks / Tresses / Twist", needsLocks: true },
  { id: "decrire", label: "Je décris au coiffeur" },
];

const FINITIONS = [
  { id: "peau", label: "Peau / Zéro" },
  { id: "courte", label: "Courte" },
  { id: "naturelle", label: "Naturelle" },
];

const NEEDS_FINITION = ["degrade_bas","degrade_haut","taper"];
const CUT_ICON_SIZE = 88;
const ESTIMATED_MIN_PER_CLIENT = 20;

export default function ClientFlow() {
  const { salonId: paramSalonId } = useParams();
  const salonId = paramSalonId || DEMO_SALON_ID;
  const { salon, loadSalon } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [accept, setAccept] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [isAdulte, setIsAdulte] = useState(true);
  const [texture, setTexture] = useState(null);
  const [coupe, setCoupe] = useState(null);
  const [finition, setFinition] = useState(null);
  const [coiffeurId, setCoiffeurId] = useState(null);
  const [peuImporte, setPeuImporte] = useState(false);
  const [paiement, setPaiement] = useState(null);
  const [coiffeurs, setCoiffeurs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadSalon(salonId); }, [salonId, loadSalon]);

  useEffect(() => {
    supabase.from("coiffeurs").select("*").eq("salon_id", salonId).eq("actif", true).eq("disponible", true)
      .then(({ data }) => setCoiffeurs(data || []));
  }, [salonId]);

  const prix = (() => {
    if (!coupe || !salon?.tarifs) return 0;
    const tier = isAdulte ? "adulte" : "enfant";
    return salon.tarifs?.[tier]?.[coupe] || 0;
  })();

  const next = () => setStep((s) => Math.min(8, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canNext = (() => {
    if (step === 1) return accept;
    if (step === 2) return prenom.trim() && telephone.trim().length >= 8;
    if (step === 3) return !!texture;
    if (step === 4) return !!coupe;
    if (step === 5) return !NEEDS_FINITION.includes(coupe) || !!finition;
    if (step === 6) return peuImporte || !!coiffeurId;
    if (step === 7) return !!paiement;
    return true;
  })();

  // Skip finition step if not required
  const advance = () => {
    if (step === 4 && !NEEDS_FINITION.includes(coupe)) { setFinition(null); setStep(6); return; }
    next();
  };
  const goBack = () => {
    if (step === 6 && !NEEDS_FINITION.includes(coupe)) { setStep(4); return; }
    back();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Upsert client by phone
      const { data: existing } = await supabase.from("clients").select("*").eq("salon_id", salonId).eq("telephone", telephone).maybeSingle();
      let clientId = existing?.id;
      if (!clientId) {
        const { data: created, error } = await supabase.from("clients").insert({ salon_id: salonId, prenom, telephone, is_adulte: isAdulte }).select().single();
        if (error) throw error;
        clientId = created.id;
      }
      // Compute position
      const { count } = await supabase.from("file_attente").select("*", { count: "exact", head: true }).eq("salon_id", salonId).in("statut", ["en_attente","en_cours"]);
      const position = (count || 0) + 1;
      const { data: file, error: errF } = await supabase.from("file_attente").insert({
        salon_id: salonId,
        coiffeur_id: peuImporte ? null : coiffeurId,
        client_id: clientId,
        prenom, telephone, is_adulte: isAdulte,
        texture, type_coupe: coupe, finition,
        paiement, prix, statut: "en_attente",
        position, peu_importe: peuImporte,
      }).select().single();
      if (errF) throw errF;
      toast.success("Inscription confirmée !");
      navigate(`/attente/${file.id}`);
    } catch (e) {
      toast.error(e.message || "Erreur lors de l'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  const availableCuts = CUTS.filter(c => {
    const list = salon?.coupes_actives || ["degrade_bas","degrade_haut","classique","taper","decrire"];
    if (c.id === "decrire") return true;
    if (c.needsLocks) return !!salon?.locks_actif;
    return list.includes(c.id);
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-md mx-auto px-5 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button data-testid="back-step" onClick={goBack} disabled={step===1} className="text-sm text-neutral-500 disabled:opacity-30 inline-flex items-center gap-1">
            <ArrowLeft size={14}/> Retour
          </button>
          <div className="flex items-center gap-3">
            {salon?.logo_url && <img src={salon.logo_url} alt="" className="w-7 h-7 rounded-md object-cover"/>}
            <div className="label-uppercase">{salon?.nom || "Salon"}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i<=step ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"}`}/>
          ))}
        </div>

        <div className="fade-up" key={step}>
        {step === 1 && (
          <div>
            <div className="label-uppercase mb-2">Étape 1 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-4">Les consignes</h2>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 mb-6 whitespace-pre-wrap">
              {salon?.consignes || "Bienvenue. Merci de patienter calmement et de respecter votre tour."}
            </div>
            <label className="flex items-center justify-between gap-3 cursor-pointer border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
              <span className="text-sm font-medium">J'accepte les conditions</span>
              <Switch data-testid="accept-cgu" checked={accept} onCheckedChange={setAccept}/>
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="label-uppercase mb-2">Étape 2 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Vos informations</h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input data-testid="client-prenom" value={prenom} onChange={(e)=>setPrenom(e.target.value)} placeholder="Ex: Karim" />
              </div>
              <div className="space-y-2">
                <Label>Numéro de téléphone</Label>
                <Input data-testid="client-tel" type="tel" value={telephone} onChange={(e)=>setTelephone(e.target.value)} placeholder="06 ..." />
              </div>
              <div className="space-y-2">
                <Label>Vous êtes</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button data-testid="adulte-btn" onClick={()=>setIsAdulte(true)} className={`p-5 rounded-lg border text-base font-semibold ${isAdulte ? "border-black dark:border-white bg-black/5 dark:bg-white/5" : "border-neutral-200 dark:border-neutral-800"}`}>Adulte</button>
                  <button data-testid="enfant-btn" onClick={()=>setIsAdulte(false)} className={`p-5 rounded-lg border text-base font-semibold ${!isAdulte ? "border-black dark:border-white bg-black/5 dark:bg-white/5" : "border-neutral-200 dark:border-neutral-800"}`}>Enfant</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="label-uppercase mb-2">Étape 3 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Texture de cheveux</h2>
            <div className="grid grid-cols-2 gap-3">
              {TEXTURES.map(t => (
                <button key={t.id} data-testid={`texture-${t.id}`} onClick={()=>setTexture(t.id)}
                  className={`p-5 rounded-lg border flex flex-col items-center gap-3 ${texture===t.id?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>
                  <HairTextureIcon type={t.id}/>
                  <span className="text-sm font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="label-uppercase mb-2">Étape 4 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Type de coupe</h2>
            <div className="grid grid-cols-2 gap-3">
              {availableCuts.map(c => (
                <button key={c.id} data-testid={`coupe-${c.id}`} onClick={()=>setCoupe(c.id)}
                  className={`p-4 rounded-lg border flex flex-col items-center gap-2 ${coupe===c.id?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>
                  {c.id === "decrire" ? (
                    <div className="w-[88px] h-[88px] flex items-center justify-center text-3xl">💬</div>
                  ) : (
                    <CutSilhouette variant={c.id} texture={texture || "lisses"} size={CUT_ICON_SIZE}/>
                  )}
                  <span className="text-xs font-semibold text-center leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="label-uppercase mb-2">Étape 5 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Finition</h2>
            <div className="space-y-3">
              {FINITIONS.map(f => (
                <button key={f.id} data-testid={`finition-${f.id}`} onClick={()=>setFinition(f.id)}
                  className={`w-full p-5 rounded-lg border text-left font-semibold ${finition===f.id?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <div className="label-uppercase mb-2">Étape 6 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Choisir un coiffeur</h2>
            <div className="space-y-3">
              {coiffeurs.map(c => (
                <button key={c.id} data-testid={`coiffeur-${c.id}`} onClick={()=>{setCoiffeurId(c.id); setPeuImporte(false);}}
                  className={`w-full p-4 rounded-lg border flex items-center gap-4 ${coiffeurId===c.id && !peuImporte?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>
                  <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-semibold">{c.prenom?.[0]}</div>
                  <div className="text-left">
                    <div className="font-semibold">{c.prenom}</div>
                    <div className="text-xs text-neutral-500">Disponible aujourd'hui</div>
                  </div>
                </button>
              ))}
              <button data-testid="peu-importe" onClick={()=>{setPeuImporte(true); setCoiffeurId(null);}}
                className={`w-full p-4 rounded-lg border-2 border-dashed flex items-center gap-4 ${peuImporte?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-300 dark:border-neutral-700"}`}>
                <div className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">?</div>
                <div className="text-left">
                  <div className="font-semibold">Peu importe</div>
                  <div className="text-xs text-neutral-500">Assigné par le gérant</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <div className="label-uppercase mb-2">Étape 7 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Mode de paiement</h2>
            <div className="space-y-3">
              {[{id:"cb",l:"Carte bancaire"},{id:"especes",l:"Espèces"},{id:"fidelite",l:"Code fidélité (10 coupes = -100%)"}].map(p => (
                <button key={p.id} data-testid={`paiement-${p.id}`} onClick={()=>setPaiement(p.id)}
                  className={`w-full p-5 rounded-lg border text-left font-semibold ${paiement===p.id?"border-black dark:border-white bg-black/5 dark:bg-white/5":"border-neutral-200 dark:border-neutral-800"}`}>
                  {p.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <div className="label-uppercase mb-2">Étape 8 / 8</div>
            <h2 className="text-3xl font-black tracking-tight mb-6">Récapitulatif</h2>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-3">
              <Row k="Prénom" v={prenom}/>
              <Row k="Téléphone" v={telephone}/>
              <Row k="Type" v={isAdulte?"Adulte":"Enfant"}/>
              <Row k="Texture" v={TEXTURES.find(t=>t.id===texture)?.label}/>
              <Row k="Coupe" v={CUTS.find(c=>c.id===coupe)?.label}/>
              {finition && <Row k="Finition" v={FINITIONS.find(f=>f.id===finition)?.label}/>}
              <Row k="Coiffeur" v={peuImporte?"Peu importe":coiffeurs.find(c=>c.id===coiffeurId)?.prenom}/>
              <Row k="Paiement" v={paiement}/>
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 mt-3 flex items-center justify-between">
                <span className="label-uppercase">Total estimé</span>
                <span className="text-2xl font-black">{paiement==="fidelite" ? "0 €" : `${prix} €`}</span>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Bottom action bar */}
        <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#111111] border-t border-neutral-200 dark:border-neutral-800 p-4">
          <div className="max-w-md mx-auto">
            {step < 8 ? (
              <Button data-testid="next-step" onClick={advance} disabled={!canNext}
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 h-12 font-semibold">
                Continuer <ArrowRight size={16} className="ml-1"/>
              </Button>
            ) : (
              <Button data-testid="confirm-inscription" onClick={submit} disabled={submitting}
                className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white h-12 font-semibold">
                {submitting?"...":"Confirmer mon inscription"} <Check size={16} className="ml-1"/>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-neutral-500">{k}</span>
    <span className="font-medium">{v || "—"}</span>
  </div>
);
