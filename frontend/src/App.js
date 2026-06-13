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
import GerantDashboard from "@/pages/GerantDashboard";
import SuperAdmin from "@/pages/SuperAdmin";
import Onboarding from "@/pages/Onboarding";

const ROLE_COIFFEUR = ["coiffeur"];
const ROLE_GERANT = ["gerant"];
const ROLE_SUPER_ADMIN = ["super_admin"];

const Protected = ({ children, roles }) => {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm label-uppercase">Chargement…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/client" element={<ClientFlow />} />
              <Route path="/client/:salonId" element={<ClientFlow />} />
              <Route path="/attente/:fileId" element={<ClientWaiting />} />
              <Route path="/coiffeur" element={<Protected roles={ROLE_COIFFEUR}><CoiffeurDashboard /></Protected>} />
              <Route path="/gerant" element={<Protected roles={ROLE_GERANT}><GerantDashboard /></Protected>} />
              <Route path="/super-admin" element={<Protected roles={ROLE_SUPER_ADMIN}><SuperAdmin /></Protected>} />
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
