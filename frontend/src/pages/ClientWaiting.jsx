import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, AlertTriangle, Star, Scissors } from "lucide-react";

const CUT_LABELS = {
  degrade_bas: "Dégradé bas",
  degrade_haut: "Dégradé haut",
  classique: "Coupe classique",
  taper: "Taper",
  locks: "Locks / Tresses / Twist",
  decrire: "Je décris au coiffeur",
};
const TEXTURE_LABELS = { lisses: "Lisses", ondules: "Ondulés", boucles: "Bouclés", crepus: "Crépus" };
const FINITION_LABELS = { peau: "Peau / Zéro", courte: "Courte", naturelle: "Naturelle" };
const PAIEMENT_LABELS = { cb: "Carte bancaire", especes: "Espèces", fidelite: "Code fidélité" };
const ESTIMATED_MIN_PER_CLIENT = 20;
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

const WaitingHero = ({ status, position, prenom, coiffeurPrenom }) => {
  if (status === "en_cours") {
    return (
      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#F59E0B] leading-tight" data-testid="waiting-en-cours">
        <Scissors className="inline mb-1 mr-1" size={22}/> Votre coiffeur vous attend !
      </div>
    );
  }
  if (position === 1) {
    return (
      <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#10B981] leading-tight" data-testid="waiting-next">
        Vous êtes le prochain, {capitalize(prenom)}{coiffeurPrenom ? ` — ${coiffeurPrenom} arrive` : ""} !
      </div>
    );
  }
  return (
    <>
      <div className="text-7xl font-black tracking-tighter" data-testid="waiting-position">{position}</div>
      <div className="text-sm text-neutral-500 mt-2">{position - 1} personne{position-1>1?"s":""} devant vous</div>
    </>
  );
};

export default function ClientWaiting() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [position, setPosition] = useState(null);
  const [coiffeur, setCoiffeur] = useState(null);
  const [salon, setSalon] = useState(null);

  const computePosition = useCallback(async (f) => {
    const q = supabase.from("file_attente").select("id, created_at, coiffeur_id, statut", { count: "exact" })
      .eq("salon_id", f.salon_id).in("statut", ["en_attente","en_cours"])
      .lte("created_at", f.created_at);
    if (f.coiffeur_id) q.eq("coiffeur_id", f.coiffeur_id);
    const { count } = await q;
    setPosition(count || 1);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("file_attente").select("*").eq("id", fileId).maybeSingle();
      if (!active) return;
      setFile(data);
      if (data) {
        await computePosition(data);
        if (data.coiffeur_id) {
          const { data: c } = await supabase.from("coiffeurs").select("prenom").eq("id", data.coiffeur_id).maybeSingle();
          if (active) setCoiffeur(c);
        }
        const { data: s } = await supabase.from("salons").select("nom, google_business_url").eq("id", data.salon_id).maybeSingle();
        if (active) setSalon(s);
      }
    };
    load();
    const channel = supabase
      .channel(`file-${fileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "file_attente" }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [fileId, computePosition]);

  const eta = useMemo(() => Math.max(0, ((position||1) - 1) * ESTIMATED_MIN_PER_CLIENT), [position]);

  if (!file) return <div className="min-h-screen flex items-center justify-center text-sm label-uppercase">Chargement…</div>;

  const status = file.statut;

  if (status === "termine") {
    return (
      <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
        <div className="max-w-md mx-auto px-5 py-10">
          <div className="label-uppercase mb-2">Merci !</div>
          <h1 className="text-4xl font-black tracking-tighter mb-8">À très vite, {capitalize(file.prenom)}</h1>
          <div className="border border-[#10B981]/30 bg-[#10B981]/5 rounded-lg p-8 text-center" data-testid="post-cut-screen">
            <CheckCircle2 className="mx-auto mb-2 text-[#10B981]" size={36}/>
            <div className="font-bold text-xl">Coupe terminée ✂️</div>
            <div className="text-sm text-neutral-500 mt-2">Nous espérons que vous êtes satisfait·e.</div>
          </div>
          {salon?.google_business_url && (
            <a
              data-testid="google-review-link"
              href={salon.google_business_url}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-2 w-full h-14 rounded-lg text-white font-semibold hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)" }}
            >
              <Star size={18}/> Laisser un avis Google
            </a>
          )}
          <Link to={`/client/${file.salon_id}`} className="block mt-6 text-center text-sm text-neutral-500 hover:text-current">
            Nouvelle inscription
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-md mx-auto px-5 py-10">
        <div className="label-uppercase mb-2">Votre place</div>
        <h1 className="text-4xl font-black tracking-tighter mb-8">Bonjour {capitalize(file.prenom)}</h1>

        {status === "absent" ? (
          <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 text-[#EF4444]" size={32}/>
            <div className="font-bold text-lg">Vous êtes marqué absent</div>
            <div className="text-sm text-neutral-500 mt-1">
              <Link to={`/client/${file.salon_id}`} className="underline">Réinscrivez-vous</Link> pour reprendre votre tour.
            </div>
          </div>
        ) : (
          <>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center">
              <div className="label-uppercase mb-3">Position dans la file</div>
              <WaitingHero status={status} position={position||1} prenom={file.prenom} coiffeurPrenom={coiffeur?.prenom}/>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Stat icon={<Clock size={14}/>} label="Temps estimé" value={`~ ${eta} min`}/>
              <Stat label="Statut" value={status === "en_cours" ? "En coupe" : "En attente"}/>
            </div>
          </>
        )}

        <div className="mt-8 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-2 text-sm">
          <div className="label-uppercase mb-2">Votre prestation</div>
          {coiffeur?.prenom && <div className="flex justify-between"><span className="text-neutral-500">Coiffeur</span><span className="font-medium">{coiffeur.prenom}</span></div>}
          <div className="flex justify-between"><span className="text-neutral-500">Coupe</span><span className="font-medium">{CUT_LABELS[file.type_coupe] || file.type_coupe}</span></div>
          {file.texture && <div className="flex justify-between"><span className="text-neutral-500">Texture</span><span className="font-medium">{TEXTURE_LABELS[file.texture] || file.texture}</span></div>}
          {file.finition && <div className="flex justify-between"><span className="text-neutral-500">Finition</span><span className="font-medium">{FINITION_LABELS[file.finition] || file.finition}</span></div>}
          {file.paiement && <div className="flex justify-between"><span className="text-neutral-500">Paiement</span><span className="font-medium">{PAIEMENT_LABELS[file.paiement] || file.paiement}</span></div>}
          <div className="flex justify-between"><span className="text-neutral-500">Prix</span><span className="font-medium">{file.prix} €</span></div>
        </div>

        <Link to={`/client/${file.salon_id}`} className="block mt-8 text-center text-sm text-neutral-500 hover:text-current">Nouvelle inscription</Link>
      </div>
    </div>
  );
}

const Stat = ({ icon, label, value }) => (
  <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
    <div className="flex items-center gap-1.5 label-uppercase mb-1">{icon}{label}</div>
    <div className="text-lg font-bold tracking-tight">{value}</div>
  </div>
);
