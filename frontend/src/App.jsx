import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { Web3Provider } from "./context/Web3Context";

import Navbar from "./components/Navbar";
import SplashScreen from "./components/SplashScreen";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";

import { useAuth } from "./context/AuthContext";

// ─── Protected Route Wrapper ──────────────────────────────────────────────────
const ProtectedRoute = ({ children, adminOnly = false, voterOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <img src="/logo.png" alt="Pollaris" className="w-16 h-16 rounded-2xl animate-pulse" />
      <div className="w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-[loading_1.2s_ease-in-out_infinite]" style={{width:"60%"}} />
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (voterOnly && user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  // Redirect logged-in users away from /login and /register
  // Admin goes to /admin, voters go to /dashboard
  const AuthRedirect = ({ children }) => {
    if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
    return children;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* ─── Global Logo Watermark ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: "url('/logo.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "600px",
          opacity: 0.07,
          filter: "blur(0.5px)",
        }}
      />
      <Navbar />
      <main className="pt-16" style={{ position: "relative", zIndex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />
          <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
          <Route path="/results" element={<Results />} />
          <Route path="/admin-login" element={<AuthRedirect><AdminLogin /></AuthRedirect>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute voterOnly>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vote"
            element={
              <ProtectedRoute voterOnly>
                <Vote />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155" },
          duration: 4000,
        }}
      />
    </div>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <Router>
      <AuthProvider>
        <Web3Provider>
          {!splashDone && <SplashScreen onDone={handleSplashDone} />}
          <AppRoutes />
        </Web3Provider>
      </AuthProvider>
    </Router>
  );
}

