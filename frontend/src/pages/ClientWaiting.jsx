import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ClientWaiting() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("file_attente").select("*").eq("id", fileId).maybeSingle();
      if (!active) return;
      setFile(data);
      if (data) await computePosition(data);
    };
    load();
    const channel = supabase
      .channel(`file-${fileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "file_attente" }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [fileId]);

  const computePosition = async (f) => {
    const q = supabase.from("file_attente").select("id, created_at, coiffeur_id, statut", { count: "exact" })
      .eq("salon_id", f.salon_id).in("statut", ["en_attente","en_cours"])
      .lte("created_at", f.created_at);
    if (f.coiffeur_id) q.eq("coiffeur_id", f.coiffeur_id);
    const { count } = await q;
    setPosition(count || 1);
  };

  if (!file) return <div className="min-h-screen flex items-center justify-center text-sm label-uppercase">Chargement…</div>;

  const status = file.statut;
  const isNext = position === 1 && status === "en_attente";
  const eta = Math.max(0, (position - 1) * 20);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-md mx-auto px-5 py-10">
        <div className="label-uppercase mb-2">Votre place</div>
        <h1 className="text-4xl font-black tracking-tighter mb-8">Bonjour {file.prenom}</h1>

        {status === "termine" ? (
          <div className="border border-[#10B981]/30 bg-[#10B981]/5 rounded-lg p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-[#10B981]" size={32}/>
            <div className="font-bold text-lg">Coupe terminée ✂️</div>
            <div className="text-sm text-neutral-500 mt-1">Merci de votre visite !</div>
          </div>
        ) : status === "absent" ? (
          <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 text-[#EF4444]" size={32}/>
            <div className="font-bold text-lg">Vous êtes marqué absent</div>
            <div className="text-sm text-neutral-500 mt-1">Veuillez vous réinscrire pour reprendre votre tour.</div>
          </div>
        ) : (
          <>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center">
              <div className="label-uppercase mb-3">Position dans la file</div>
              {isNext ? (
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#10B981] leading-tight">
                  Vous êtes le prochain, {file.prenom} !
                </div>
              ) : (
                <>
                  <div className="text-7xl font-black tracking-tighter">{position}</div>
                  <div className="text-sm text-neutral-500 mt-2">{position - 1} personne{position-1>1?"s":""} devant vous</div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Stat icon={<Clock size={14}/>} label="Temps estimé" value={`~ ${eta} min`}/>
              <Stat label="Statut" value={status === "en_cours" ? "En coupe" : "En attente"}/>
            </div>
          </>
        )}

        <div className="mt-8 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-2 text-sm">
          <div className="label-uppercase mb-2">Votre prestation</div>
          <div className="flex justify-between"><span className="text-neutral-500">Coupe</span><span className="font-medium">{file.type_coupe}</span></div>
          {file.finition && <div className="flex justify-between"><span className="text-neutral-500">Finition</span><span className="font-medium">{file.finition}</span></div>}
          <div className="flex justify-between"><span className="text-neutral-500">Prix</span><span className="font-medium">{file.prix} €</span></div>
        </div>

        <Link to="/" className="block mt-8 text-center text-sm text-neutral-500 hover:text-current">← Accueil</Link>
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
