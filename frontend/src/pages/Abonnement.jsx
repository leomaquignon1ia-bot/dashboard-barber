import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PLANS = {
  starter: {
    label: "Starter",
    color: "border-neutral-200",
    prices: {
      "3": { id: "price_1Tsg8HRwdxzJPMp6Djw83oez", amount: "239,99€" },
      "6": { id: "price_1Tsg8oRwdxzJPMp6HNrE9bTA", amount: "209,99€" },
      "12": { id: "price_1Tsg9KRwdxzJPMp652fqzcPh", amount: "169,99€" },
    }
  },
  pro: {
    label: "Pro",
    color: "border-[#6C63FF]",
    prices: {
      "3": { id: "price_1Tsg9kRwdxzJPMp6lSWEi7PE", amount: "289,99€" },
      "6": { id: "price_1TsgA1RwdxzJPMp6Tcr7l3KB", amount: "249,99€" },
      "12": { id: "price_1TsgAlRwdxzJPMp6txmOYE97", amount: "199,99€" },
    }
  },
  studio: {
    label: "Studio",
    color: "border-yellow-400",
    prices: {
      "3": { id: "price_1TsgBARwdxzJPMp6ZSv3SvOJ", amount: "349,99€" },
      "6": { id: "price_1TsgBTRwdxzJPMp6fw04p43t", amount: "299,99€" },
      "12": { id: "price_1TsgBuRwdxzJPMp6b6MCjAQY", amount: "249,99€" },
    }
  }
};

const DUREE_COLORS = { "3": "bg-neutral-900 text-white", "6": "bg-[#6C63FF] text-white", "12": "bg-neutral-900 text-white" };
const DUREE_LABELS = { "3": "3 mois", "6": "6 mois", "12": "12 mois" };

export default function Abonnement({ salonId, currentPlan }) {
  const [duree, setDuree] = useState("6");
  const [loading, setLoading] = useState(null);

  const subscribe = async (planKey) => {
    const price = PLANS[planKey].prices[duree];
    setLoading(planKey);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_id: price.id, salon_id: salonId, plan: planKey, duree }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error("Erreur lors de la création de la session");
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="label-uppercase mb-2">Abonnement</div>
      <h2 className="text-2xl font-black tracking-tight">Choisissez votre plan</h2>

      {/* Sélecteur durée */}
      <div className="flex gap-2">
        {["3", "6", "12"].map(d => (
          <button key={d} onClick={() => setDuree(d)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${duree === d ? DUREE_COLORS[d] : "bg-neutral-100 text-neutral-500"}`}>
            {DUREE_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Cards plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => (
          <div key={key} className={`border-2 ${plan.color} rounded-xl p-6 space-y-4 ${currentPlan === key ? "ring-2 ring-[#6C63FF]" : ""}`}>
            <div className="font-black text-xl">{plan.label}</div>
            <div className="text-3xl font-black">{plan.prices[duree].amount}<span className="text-sm font-normal text-neutral-500">/mois HT</span></div>
            <div className="text-xs text-neutral-500">Engagement {DUREE_LABELS[duree]}</div>
            {currentPlan === key ? (
              <div className="w-full py-2 text-center text-sm font-semibold text-[#6C63FF] border border-[#6C63FF] rounded-lg">Plan actuel</div>
            ) : (
              <button onClick={() => subscribe(key)} disabled={!!loading}
                className="w-full py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
                {loading === key ? "..." : "Choisir ce plan"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
