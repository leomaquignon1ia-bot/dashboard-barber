import { useState } from "react";
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
  const navigate = useNavigate();
  const isReset = window.location.hash.includes("type=recovery");

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email envoyé ! Vérifie ta boîte mail.");
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour !");
    navigate("/gerant/login");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] text-[#1A1A1A] dark:text-[#F5F5F5]">
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="label-uppercase mb-2">Sécurité</div>
        <h1 className="text-3xl font-black tracking-tight mb-8">
          {isReset ? "Nouveau mot de passe" : "Mot de passe oublié"}
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
              {loading ? "..." : "Mettre à jour"}
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
