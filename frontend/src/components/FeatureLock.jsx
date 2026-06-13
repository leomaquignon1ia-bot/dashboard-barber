import { Lock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function FeatureLock({ children, locked, requiredPlan = "pro", featureName = "Cette fonctionnalité", currentPlan = "starter", salonName = "Mon salon" }) {
  const [open, setOpen] = useState(false);
  if (!locked) return children;
  const sendUpgradeMail = () => {
    const body = `Bonjour, le salon "${salonName}" (plan actuel: ${currentPlan}) souhaite passer au plan ${requiredPlan} pour débloquer: ${featureName}.`;
    window.location.href = `mailto:contact@dashboard-barber.fr?subject=Demande upgrade ${requiredPlan}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  };
  return (
    <>
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none">{children}</div>
        <button data-testid="feature-lock" onClick={() => setOpen(true)} className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/80 dark:bg-white/90 text-white dark:text-black flex items-center justify-center">
          <Lock size={14}/>
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fonctionnalité verrouillée</DialogTitle>
            <DialogDescription>Cette fonctionnalité n'est pas incluse dans votre plan actuel ({currentPlan}). Passez au plan {requiredPlan} pour la débloquer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button data-testid="upgrade-cta" onClick={sendUpgradeMail}>Passer au plan {requiredPlan}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
