import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScissorsLogo } from "@/components/Illustrations";
import { CheckCircle2, Clock, Pause, Play, LogOut } from "lucide-react";

export default function CoiffeurPointage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [coiffeur, setCoiffeur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("coiffeurs").select("*").eq("qr_token", token).maybeSingle();
      if (active) {
        setCoiffeur(data);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  const pointer = async () => {
    setBusy(true);
    const { error } = await supabase.from("coiffeurs").update({
      disponible: true,
      en_pause: false,
      pointage_at: new Date().toISOString(),
      fin_journee_at: null,
    }).eq("id", coiffeur.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setCoiffeur({ ...coiffeur, disponible: true, en_pause: false, pointage_at: new Date().toISOString() });
    toast.success("Pointage enregistré");
  };

  const pause = async () => {
    setBusy(true);
    const { error } = await supabase.from("coiffeurs").update({
      en_pause: !coiffeur.en_pause,
      pause_at: new Date().toISOString(),
    }).eq("id", coiffeur.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setCoiffeur({ ...coiffeur, en_pause: !coiffeur.en_pause });
    toast.success(!coiffeur.en_pause ? "Pause activée" : "Reprise du service");
  };

  const finJournee = async () => {
    setBusy(true);
    const { error } = await supabase.from("coiffeurs").update({
      disponible: false,
      en_pause: false,
      fin_journee_at: new Date().toISOString(),
    }).eq("id", coiffeur.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setCoiffeur({ ...coiffeur, disponible: false, fin_journee_at: new Date().toISOString() });
    toast.success("Fin de journée enregistrée");
    setTimeout(() => navigate("/"), 1500);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center label-uppercase">Chargement…</div>;
  if (!coiffeur) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5] p-6 text-center">
        <div>
          <div className="label-uppercase mb-2 text-[#EF4444]">Lien invalide</div>
          <div className="text-sm text-neutral-500">Le QR code de pointage est invalide ou expiré. Contactez votre gérant.</div>
        </div>
      </div>
    );
  }

  const pointageStr = coiffeur.pointage_at
    ? new Date(coiffeur.pointage_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <ScissorsLogo size={40} />
          <div>
            <div className="label-uppercase">Pointage</div>
            <div className="font-black text-xl tracking-tight">{coiffeur.prenom}</div>
          </div>
        </div>

        {!coiffeur.disponible ? (
          <div data-testid="pointage-state-off" className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center">
            <div className="label-uppercase mb-3">Statut</div>
            <div className="text-2xl font-black tracking-tight mb-6 text-[#EF4444]">Hors-ligne</div>
            <Button
              data-testid="pointage-arrive-btn"
              onClick={pointer}
              disabled={busy}
              className="w-full h-14 text-white hover:opacity-90 font-semibold text-base"
              style={{ background: "linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)" }}
            >
              <CheckCircle2 size={18} className="mr-2"/> J&apos;arrive — Je pointe
            </Button>
          </div>
        ) : (
          <div data-testid="pointage-state-on" className="border border-[#3B82F6] bg-[#3B82F6]/5 rounded-lg p-8">
            <div className="label-uppercase mb-2">Statut</div>
            <div className={`text-2xl font-black tracking-tight mb-2 ${coiffeur.en_pause ? "text-[#F59E0B]" : "text-[#3B82F6]"}`}>
              {coiffeur.en_pause ? "En pause" : "Disponible"}
            </div>
            {pointageStr && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6">
                <Clock size={12}/> Pointé à {pointageStr}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button data-testid="pointage-pause-btn" onClick={pause} variant="outline" className="h-12 font-semibold">
                {coiffeur.en_pause ? <><Play size={16} className="mr-1"/>Reprendre</> : <><Pause size={16} className="mr-1"/>Pause</>}
              </Button>
              <Button data-testid="pointage-fin-btn" onClick={finJournee} variant="outline" className="h-12 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 font-semibold">
                <LogOut size={16} className="mr-1"/> Fin journée
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-neutral-500">
          Token : <span className="font-mono">{token.slice(0, 8)}…</span>
        </div>
      </div>
    </div>
  );
}
