import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Onboarding() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!session) { navigate("/login"); return; }
    if (profile?.role === "gerant") navigate("/gerant");
    else if (profile?.role === "coiffeur") navigate("/coiffeur");
    else if (profile?.role === "super_admin") navigate("/super-admin");
  }, [profile, session, navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm label-uppercase">
      Bienvenue — préparation de votre espace…
    </div>
  );
}
