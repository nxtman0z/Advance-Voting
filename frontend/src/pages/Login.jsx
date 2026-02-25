import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import { SiEthereum } from "react-icons/si";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      navigate(res?.data?.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-4">
            <img src="/logo.png" alt="Pollaris" className="w-16 h-16 rounded-2xl object-contain shadow-lg shadow-blue-600/30" />
          </div>
          <h1 className="text-3xl font-bold text-white">{t("login.title").split("Pollaris")[0]}<span className="text-blue-400">Pollaris</span></h1>
          <p className="text-slate-400 mt-1">{t("login.subtitle")}</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t("login.email")}</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t("login.password")}</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="password"
                  className="input-field pl-10"
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><FiLogIn /> {t("login.signIn")}</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700 text-center">
            <p className="text-slate-400 text-sm">
              {t("login.noAccount")}{" "}
              <Link to="/register" className="text-blue-400 hover:underline font-medium">
                {t("login.registerHere")}
              </Link>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 card p-4 flex items-start gap-3">
          <FiLock className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400">
            Your login is secured with JWT authentication and encrypted with bcrypt.
            Connect your MetaMask wallet on the Vote page.
          </p>
        </div>
      </div>
    </div>
  );
}
