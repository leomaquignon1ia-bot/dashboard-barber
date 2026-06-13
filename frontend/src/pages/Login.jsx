import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const [params] = useSearchParams();
  const role = params.get("role") || "gerant";
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [loading, setLoading] = useState(false);

  const roleLabel = { coiffeur: "Coiffeur", gerant: "Gérant", super_admin: "Super Admin", franchise: "Franchisé" }[role] || "Utilisateur";
  const dest = { coiffeur: "/coiffeur", gerant: "/gerant", super_admin: "/super-admin" }[role] || "/";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Connexion réussie");
        navigate(dest);
      } else {
        const { error } = await signUp(email, password, role, role === "super_admin" ? null : "11111111-1111-1111-1111-111111111111", prenom);
        if (error) throw error;
        toast.success("Compte créé. Vérifie tes emails si confirmation requise.");
        navigate(dest);
      }
    } catch (err) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-md mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-current mb-8" data-testid="back-home">
          <ArrowLeft size={14}/> Retour
        </Link>

        <div className="label-uppercase mb-2">{roleLabel}</div>
        <h1 className="text-3xl font-black tracking-tight mb-8">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>

        <form onSubmit={submit} className="space-y-5">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input data-testid="signup-prenom" value={prenom} onChange={(e)=>setPrenom(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input data-testid="login-email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input data-testid="login-password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={6}/>
          </div>
          <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 h-11 font-semibold">
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <button
          data-testid="toggle-mode"
          className="mt-6 text-sm text-neutral-500 hover:text-current"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Pas encore de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}
        </button>

        {role === "gerant" && (
          <div className="mt-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-xs text-neutral-500">
            <div className="font-semibold mb-1 text-neutral-700 dark:text-neutral-300">Compte démo</div>
            gerant@demo.fr / demo123 (à créer en mode "Créer un compte" si premier accès)
          </div>
        )}
      </div>
    </div>
  );
}
