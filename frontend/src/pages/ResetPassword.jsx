import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsReset(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://dashboard-barber-ashen.vercel.app/reset-password",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email envoye ! Verifie ta boite mail.");
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis a jour !");
    navigate("/gerant/login");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Securite</div>
        <h1 className="text-3xl font-black tracking-tight mb-8">
          {isReset ? "Nouveau mot de passe" : "Mot de passe oublie"}
        </h1>
        {isReset ? (
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Confirmer</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 h-11 font-semibold">
              {loading ? "..." : "Mettre a jour"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-5">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 h-11 font-semibold">
              {loading ? "..." : "Envoyer le lien"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
