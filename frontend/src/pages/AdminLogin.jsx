/**
 * AdminLogin.jsx — Admin authentication via MetaMask wallet signature.
 * Flow: Connect Wallet → Sign Message → Backend verifies → Admin Dashboard
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SiEthereum } from "react-icons/si";
import { FiShield, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiZap } from "react-icons/fi";
import toast from "react-hot-toast";

const STEPS = ["Connect Wallet", "Sign Message", "Access Granted"];

export default function AdminLogin() {
  const { adminWalletLogin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]       = useState(0);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleConnect = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask to continue.");
      return;
    }
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      setStep(1);
      toast.success(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    setError("");
    setLoading(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const message  = `Pollaris Admin Login\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signer.signMessage(message);
      await adminWalletLogin({ address, signature, message });
      setStep(2);
      toast.success("Admin access granted!");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Verification failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg animate-fadeInUp">

        {/* ── Back link ── */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
          <FiArrowLeft size={14} /> Back to Home
        </Link>

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative shrink-0">
            <img src="/logo.png" alt="Pollaris" className="w-14 h-14 rounded-2xl object-contain" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
              <FiShield size={10} className="text-white" />
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-0.5">Secure MetaMask authentication required</p>
          </div>
        </div>

        {/* ── Step bar ── */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center w-full">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                  i < step  ? "bg-green-500/20 border-green-500 text-green-400"
                  : i === step ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                  : "bg-slate-800/80 border-slate-700 text-slate-600"
                }`}>
                  {i < step ? <FiCheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium transition-colors ${
                  i <= step ? "text-slate-300" : "text-slate-600"
                }`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mb-5 mx-1 transition-all duration-500 ${
                  i < step ? "bg-green-500/50" : "bg-slate-700"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-xl shadow-2xl">
          {/* top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          <div className="p-8">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
                <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Step 0: Connect ── */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-purple-900/30 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <SiEthereum size={32} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
                    <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                      Connect the authorized admin MetaMask wallet to proceed with secure authentication.
                    </p>
                  </div>
                </div>

                {/* Feature pills */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[["🔐", "Encrypted"], ["⚡", "No Gas Fee"], ["🛡️", "Signature Auth"]].map(([icon, label]) => (
                    <div key={label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl py-2.5 px-1">
                      <div className="text-lg mb-0.5">{icon}</div>
                      <div className="text-xs text-slate-400 font-medium">{label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5"
                >
                  {loading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><SiEthereum size={18} /> Connect MetaMask</>
                  }
                </button>
              </div>
            )}

            {/* ── Step 1: Sign ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-900/30 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <FiShield size={28} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Verify Identity</h2>
                    <p className="text-slate-400 text-sm mt-1">Sign the message in MetaMask to prove wallet ownership.</p>
                  </div>
                </div>

                {/* Wallet address chip */}
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <span className="text-xs text-green-300 font-mono break-all">{address}</span>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-slate-400 flex items-start gap-2">
                  <FiZap size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                  Signing is free — this does <span className="text-white font-semibold mx-1">not</span> trigger any blockchain transaction.
                </div>

                <button
                  onClick={handleSign}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:-translate-y-0.5"
                >
                  {loading
                    ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                    : <><FiShield size={16} /> Sign & Verify Identity</>
                  }
                </button>

                <button
                  onClick={() => { setStep(0); setAddress(""); setError(""); }}
                  className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
                >
                  <FiArrowLeft size={13} /> Use a different wallet
                </button>
              </div>
            )}

            {/* ── Step 2: Done ── */}
            {step === 2 && (
              <div className="text-center space-y-5 py-4">
                <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                  <FiCheckCircle size={38} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Access Granted</h2>
                  <p className="text-slate-400 text-sm mt-1">Identity verified. Redirecting to Admin Dashboard…</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                  <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                  Loading dashboard…
                </div>
              </div>
            )}
          </div>

          {/* bottom accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

      </div>
    </div>
  );
}


const STEPS = ["Connect Wallet", "Sign Message", "Access Granted"];

export default function AdminLogin() {
  const { adminWalletLogin } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]         = useState(0); // 0=connect, 1=sign, 2=done
  const [address, setAddress]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // ─── Step 0: Connect MetaMask ─────────────────────────────────────────
  const handleConnect = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask not installed. Please install MetaMask and try again.");
      return;
    }
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      setStep(1);
      toast.success(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 1: Sign & Verify ────────────────────────────────────────────
  const handleSign = async () => {
    setError("");
    setLoading(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();

      // Create a unique timestamped message to prevent replay attacks
      const message = `Pollaris Admin Login\nWallet: ${address}\nTimestamp: ${Date.now()}`;

      const signature = await signer.signMessage(message);

      // Send to backend for verification
      await adminWalletLogin({ address, signature, message });

      setStep(2);
      toast.success("Admin access granted!");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Verification failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fadeInUp">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4">
            <img src="/logo.png" alt="Pollaris" className="w-16 h-16 rounded-2xl object-contain shadow-lg shadow-purple-600/30" />
          </div>
          <h1 className="text-3xl font-bold text-white"><span className="text-purple-400">Pollaris</span> Admin</h1>
          <p className="text-slate-400 mt-1">Verify your identity with MetaMask</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= step ? "opacity-100" : "opacity-30"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < step  ? "bg-green-600/30 border-green-500 text-green-300"
                  : i === step ? "bg-purple-600/30 border-purple-500 text-purple-300 ring-2 ring-purple-500/20"
                  : "bg-slate-800 border-slate-600 text-slate-500"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="text-xs mt-1 text-slate-400 hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-10 mx-1 transition-all ${i < step ? "bg-green-500/60" : "bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 0 — Connect */}
          {step === 0 && (
            <div className="text-center space-y-5">
              <SiEthereum size={48} className="text-purple-400 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
                <p className="text-slate-400 text-sm">
                  Only the authorized admin wallet can access the admin panel.
                  Connect MetaMask to continue.
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading
                  ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><SiEthereum /> Connect MetaMask</>
                }
              </button>
            </div>
          )}

          {/* Step 1 — Sign */}
          {step === 1 && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 bg-purple-600/20 border-2 border-purple-500/40 rounded-full flex items-center justify-center mx-auto">
                <FiShield size={26} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Sign to Authenticate</h2>
                <p className="text-slate-400 text-sm mb-1">Connected as:</p>
                <code className="text-xs text-green-400 bg-slate-900/60 px-3 py-1 rounded-lg break-all">
                  {address}
                </code>
                <p className="text-slate-400 text-sm mt-3">
                  Click below to sign a message. MetaMask will ask you to confirm.
                  This does <strong className="text-white">not</strong> cost any gas.
                </p>
              </div>
              <button
                onClick={handleSign}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  : <><FiShield /> Sign & Verify Identity</>
                }
              </button>
              <button
                onClick={() => { setStep(0); setAddress(""); setError(""); }}
                className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors"
              >
                ← Use different wallet
              </button>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-green-600/20 border-2 border-green-500/40 rounded-full flex items-center justify-center mx-auto">
                <FiCheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Access Granted!</h2>
              <p className="text-slate-400 text-sm">Redirecting to Admin Dashboard…</p>
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                Loading admin panel…
              </div>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-4 p-4 bg-yellow-600/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300/80 text-center">
          🔒 Only the registered admin wallet address can access this panel.
          Regular voters cannot log in here.
        </div>
      </div>
    </div>
  );
}
