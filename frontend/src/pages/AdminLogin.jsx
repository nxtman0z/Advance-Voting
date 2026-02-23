/**
 * AdminLogin.jsx
 * Admin authentication via MetaMask wallet signature.
 * Flow: Connect Wallet → Sign Message → Backend verifies → Admin Dashboard
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SiEthereum } from "react-icons/si";
import { FiShield, FiCheckCircle, FiAlertCircle, FiArrowRight } from "react-icons/fi";
import toast from "react-hot-toast";

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
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-600/30">
            <FiShield size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Login</h1>
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
