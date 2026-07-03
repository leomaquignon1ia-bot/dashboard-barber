import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ClientFlow from "@/pages/ClientFlow";
import ClientWaiting from "@/pages/ClientWaiting";
import CoiffeurDashboard from "@/pages/CoiffeurDashboard";
import CoiffeurPointage from "@/pages/CoiffeurPointage";
import GerantDashboard from "@/pages/GerantDashboard";
import SuperAdmin from "@/pages/SuperAdmin";
import FranchiseDashboard from "@/pages/FranchiseDashboard";
import Onboarding from "@/pages/Onboarding";

const ROLE_COIFFEUR = ["coiffeur"];
const ROLE_GERANT = ["gerant"];
const ROLE_SUPER_ADMIN = ["super_admin"];
const ROLE_FRANCHISE = ["franchise"];

const ROLE_DEST = { gerant: "/gerant", coiffeur: "/coiffeur", super_admin: "/super-admin", franchise: "/franchise" };
const ROLE_LOGIN = { gerant: "/login?role=gerant", coiffeur: "/login?role=coiffeur", super_admin: "/login?role=super_admin", franchise: "/login?role=franchise" };

const Protected = ({ children, roles }) => {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm label-uppercase">Chargement…</div>;
  if (!session) {
    const target = (roles && roles[0] && ROLE_LOGIN[roles[0]]) || "/login";
    return <Navigate to={target} replace />;
  }
  if (!profile) return <Navigate to="/onboarding" replace />;
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={ROLE_DEST[profile.role] || "/"} replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <Routes>
              <Route path="/" element={<Navigate to="/gerant/login" replace />} />
              <Route path="/admin" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/coiffeur/login" element={<Login />} />
              <Route path="/gerant/login" element={<Login />} />
              <Route path="/franchise/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/client" element={<ClientFlow />} />
              <Route path="/client/:salonId" element={<ClientFlow />} />
              <Route path="/attente/:fileId" element={<ClientWaiting />} />
              <Route path="/coiffeur/pointage/:token" element={<CoiffeurPointage />} />
              <Route path="/coiffeur" element={<Protected roles={ROLE_COIFFEUR}><CoiffeurDashboard /></Protected>} />
              <Route path="/gerant" element={<Protected roles={ROLE_GERANT}><GerantDashboard /></Protected>} />
              <Route path="/super-admin" element={<Protected roles={ROLE_SUPER_ADMIN}><SuperAdmin /></Protected>} />
              <Route path="/franchise" element={<Protected roles={ROLE_FRANCHISE}><FranchiseDashboard /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster richColors position="top-center" />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
