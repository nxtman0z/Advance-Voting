import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { FiShield, FiEye, FiLock, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { SiEthereum } from "react-icons/si";

const features = [
  { icon: FiShield, title: "Blockchain Security", desc: "Every vote is recorded immutably on the Ethereum blockchain, making tampering impossible." },
  { icon: FiEye,    title: "Face Recognition",    desc: "Advanced face-api.js biometric authentication ensures only you can cast your vote." },
  { icon: FiLock,   title: "OTP Verification",    desc: "Two-factor authentication via email and SMS adds an extra layer of security." },
  { icon: SiEthereum, title: "MetaMask Wallet",   desc: "Your unique Ethereum wallet identity ensures one vote per person, verified on-chain." },
];

const steps = [
  { step: "01", title: "Register",  desc: "Create an account with your national ID and personal details." },
  { step: "02", title: "Verify",    desc: "Register your face and verify your identity via OTP." },
  { step: "03", title: "Connect",   desc: "Link your MetaMask wallet to your voter profile." },
  { step: "04", title: "Vote",      desc: "Cast your vote securely — recorded forever on the blockchain." },
];

export default function Home() {
  const { user } = useAuth();
  const { account, connectWallet } = useWeb3();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="text-center py-20 animate-fadeInUp">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm px-4 py-2 rounded-full mb-6">
          <SiEthereum /> Powered by Ethereum Blockchain
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight">
          The Future of{" "}
          <span className="gradient-text">Secure Voting</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Decentralized, transparent, and tamper-proof elections with facial recognition,{" "}
          OTP 2FA, and MetaMask wallet integration.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Link to="/vote" className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
              Go to Vote <FiArrowRight />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
                Get Started <FiArrowRight />
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-3">
                Sign In
              </Link>
            </>
          )}
          <Link
            to="/admin-login"
            className="flex items-center gap-2 text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 px-6 py-3 rounded-lg transition-colors text-sm font-medium"
          >
            🔒 Admin Login
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-16">
          {[["100%", "Transparent"], ["0", "Fraud Cases"], ["∞", "Immutable Records"]].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold gradient-text">{val}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────────────── */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Why <span className="gradient-text">BlockVote</span>?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 hover:border-blue-500/40 transition-colors">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
                <f.icon size={22} className="text-blue-400" />
              </div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────────────── */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center text-white mb-12">How It Works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              <div className="card p-6 text-center">
                <div className="text-4xl font-black gradient-text mb-3">{s.step}</div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-slate-600 z-10">
                  <FiArrowRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-16 text-center">
        <div className="card p-12 bg-gradient-to-br from-blue-900/40 to-slate-800/60">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Vote?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Join thousands of voters in the most secure and transparent election system ever built.
          </p>
          <Link to={user ? "/vote" : "/register"} className="btn-primary text-lg px-10 py-3 inline-flex items-center gap-2">
            {user ? "Cast Your Vote" : "Register Now"} <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
