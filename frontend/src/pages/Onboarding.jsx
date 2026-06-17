import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Onboarding() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!session) { navigate("/login"); return; }
    if (profile?.role === "gerant") navigate("/gerant");
    else if (profile?.role === "coiffeur") navigate("/coiffeur");
    else if (profile?.role === "super_admin") navigate("/super-admin");
    else if (profile?.role === "franchise") navigate("/franchise");
  }, [profile, session, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setStuck(true), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stuck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-sm label-uppercase">Le chargement prend trop de temps</div>
        <button data-testid="onboarding-retry" onClick={() => { window.location.href = "/login"; }} className="text-sm px-4 py-2 rounded-md bg-black dark:bg-white text-white dark:text-black">
          Retour à la connexion
        </button>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center text-sm label-uppercase">
      Bienvenue — préparation de votre espace…
    </div>
  );
}
