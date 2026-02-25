/**
 * AdminLogin.jsx - Admin authentication via MetaMask wallet signature.
 * Flow: Connect Wallet -> Sign Message -> Backend verifies -> Admin Dashboard
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
    setLoading(true);

    // MetaMask sometimes injects window.ethereum slightly after page load — retry briefly
    let ethereum = window.ethereum;
    if (!ethereum) {
      await new Promise((r) => setTimeout(r, 500));
      ethereum = window.ethereum;
    }

    if (!ethereum) {
      setLoading(false);
      setError(
        "MetaMask not detected. Make sure: (1) MetaMask extension is installed in this browser, (2) the extension is enabled, (3) try refreshing the page."
      );
      return;
    }

    try {
      // Always force MetaMask approval popup — never silently reconnect
      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) throw new Error("No account selected.");
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


        {/* â”€â”€ Header â”€â”€ */}
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

        {/* â”€â”€ Step bar â”€â”€ */}
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

        {/* â”€â”€ Main card â”€â”€ */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-xl shadow-2xl">
          {/* top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          <div className="p-8">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
                <FiAlertCircle size={15} className="mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <span>{error}</span>
                  {error.includes("not detected") && (
                    <div className="flex gap-2 flex-wrap">
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:text-orange-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        <SiEthereum size={11} /> Install MetaMask
                      </a>
                      <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-1 text-xs bg-slate-700/60 border border-slate-600/40 text-slate-300 hover:text-white px-2 py-1 rounded-lg transition-colors"
                      >
                        Refresh Page
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* â”€â”€ Step 0: Connect â”€â”€ */}
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

            {/* â”€â”€ Step 1: Sign â”€â”€ */}
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

                <button
                  onClick={handleSign}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:-translate-y-0.5"
                >
                  {loading
                    ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
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

            {/* â”€â”€ Step 2: Done â”€â”€ */}
            {step === 2 && (
              <div className="text-center space-y-5 py-4">
                <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                  <FiCheckCircle size={38} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Access Granted</h2>
                  <p className="text-slate-400 text-sm mt-1">Identity verified. Redirecting to Admin Dashboard...</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                  <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                  Loading dashboard...
                </div>
              </div>
            )}
          </div>

          {/* bottom accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        {/* Back to Home */}
        <div className="text-center mt-5">
          <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            <FiArrowLeft size={14} /> Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}


