import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiUser, FiMail, FiPhone, FiCamera, FiCheckCircle,
  FiArrowRight, FiLock, FiEye, FiEyeOff, FiCreditCard,
  FiShield, FiZap, FiAward,
} from "react-icons/fi";

// ─── Reusable text-input component ───────────────────────────────────────────
function InputField({ icon: Icon, label, type = "text", placeholder, value, onChange, rightSlot, hint }) {
  return (
    <div className="group">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
          <Icon size={14} />
        </div>
        <input
          type={type}
          className="w-full bg-slate-900/60 border border-slate-700 text-white placeholder-slate-600
                     rounded-xl pl-9 pr-9 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                     hover:border-slate-500 transition-all duration-200"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        {rightSlot && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {hint && <p className="text-slate-600 text-xs mt-1 pl-1">{hint}</p>}
    </div>
  );
}

// ─── Gender selector ─────────────────────────────────────────────────────────
function GenderField({ value, onChange }) {
  const opts = [
    { val: "male",   label: "Male",   icon: "♂" },
    { val: "female", label: "Female", icon: "♀" },
    { val: "other",  label: "Other",  icon: "⚧" },
  ];
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        Gender <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(o.val)}
            className={`py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5
              ${value === o.val
                ? "bg-blue-600/20 border-blue-500 text-blue-300"
                : "bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
              }`}
          >
            <span className="text-base">{o.icon}</span> {o.label}
          </button>
        ))}
      </div>
      {!value && (
        <p className="text-slate-600 text-xs mt-1 pl-1">Select one option above</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Register() {
  const { register } = useAuth();
  const navigate      = useNavigate();
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [showCpwd, setShowCpwd] = useState(false);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    voterId: "", gender: "",
    password: "", confirmPassword: "",
  });
  const [photo,   setPhoto]   = useState(null);
  const [preview, setPreview] = useState(null);

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Photo must be under 5 MB."); return; }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const { fullName, email, phone, voterId, gender, password, confirmPassword } = form;
    if (!fullName || !email || !phone || !voterId || !gender || !password || !confirmPassword) {
      setError("All fields are required."); return;
    }
    if (!photo) { setError("Please upload a profile photo."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("fullName",  fullName);
      fd.append("email",     email);
      fd.append("phone",     phone);
      fd.append("voterId",   voterId);
      fd.append("gender",    gender);
      fd.append("password",  password);
      fd.append("photo",     photo);
      await register(fd);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  /* ── Success Screen ──────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-12 shadow-2xl">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500/30 to-emerald-500/20 rounded-full
                              flex items-center justify-center border border-green-500/30">
                <FiCheckCircle size={44} className="text-green-400" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Welcome to Pollaris!</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Your voter account has been created.<br />
              You can now log in and participate in elections.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400
                         text-white font-bold py-3.5 rounded-2xl transition-all duration-200
                         flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              Go to Login <FiArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Registration Form ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-[calc(100vh-4rem)] flex">

      {/* ── LEFT PANEL — Branding ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 flex-col justify-between p-10
                      bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950
                      border-r border-slate-700/40 relative overflow-hidden">

        {/* BG glow effects */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl pointer-events-none" />

        {/* Logo + brand */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.png" alt="Pollaris" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-blue-600/30" />
            <span className="text-xl font-black gradient-text">Pollaris</span>
          </div>

          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Your Voice.<br />
            <span className="gradient-text">Your Vote.</span><br />
            Secured Forever.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Register once and participate in elections that matter — verified, transparent, and powered by blockchain.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-4">
          {[
            { icon: FiShield, title: "Identity Verified", desc: "Face recognition ensures only you can vote" },
            { icon: FiZap, title: "Blockchain Secured", desc: "Every vote recorded immutably on Sepolia" },
            { icon: FiAward, title: "Tamper Proof Results", desc: "Zero manipulation, 100% transparent" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-slate-600 text-xs">
          © 2026 Pollaris. Blockchain Voting Platform.
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-md">

            {/* Mobile header (hidden on lg+) */}
            <div className="lg:hidden text-center mb-8">
              <img src="/logo.png" alt="Pollaris" className="w-12 h-12 rounded-2xl object-contain mx-auto mb-3 shadow-lg shadow-blue-600/30" />
              <h1 className="text-2xl font-black text-white">Join <span className="gradient-text">Pollaris</span></h1>
              <p className="text-slate-400 text-sm mt-1">Transparent Voting, Trusted Results</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-3xl font-black text-white">Create Account</h1>
              <p className="text-slate-400 text-sm mt-1">Fill in your details to register as a voter</p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">

              {/* ── Photo Upload ──────────────────────────────────────── */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                <SectionLabel label="Profile Photo" />
                <div className="flex items-center gap-5 mt-4">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className={`relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-200 group cursor-pointer
                      ${photo
                        ? "ring-2 ring-blue-500 shadow-lg shadow-blue-600/20"
                        : "bg-slate-900 border-2 border-dashed border-slate-600 hover:border-blue-500"
                      }`}
                  >
                    {preview ? (
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full gap-1.5">
                        <FiCamera size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <span className="text-[9px] text-slate-600 group-hover:text-slate-400 font-bold tracking-wide">UPLOAD</span>
                      </div>
                    )}
                    {preview && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <FiCamera size={20} className="text-white" />
                      </div>
                    )}
                  </button>
                  <div>
                    <p className="text-white text-sm font-semibold mb-1">
                      {photo ? photo.name : "Upload your photo"}
                    </p>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Used for face verification during voting.<br />
                      JPG or PNG · max 5 MB
                    </p>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="mt-2.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      {photo ? "Change photo →" : "Browse files →"}
                    </button>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>
              </div>

              {/* ── Personal Info ─────────────────────────────────────── */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                <SectionLabel label="Personal Info" />
                <InputField
                  icon={FiUser} label="Full Name" placeholder="Enter your full name"
                  value={form.fullName} onChange={update("fullName")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    icon={FiMail} label="Email" type="email" placeholder="your@email.com"
                    value={form.email} onChange={update("email")}
                  />
                  <InputField
                    icon={FiPhone} label="Phone" placeholder="+91 99999 99999"
                    value={form.phone} onChange={update("phone")}
                  />
                </div>
                <InputField
                  icon={FiCreditCard} label="Voter ID" placeholder="e.g. VTR-2024-000123"
                  value={form.voterId} onChange={update("voterId")}
                  hint="Government-issued voter identification number"
                />
                <GenderField value={form.gender} onChange={(g) => setForm((p) => ({ ...p, gender: g }))} />
              </div>

              {/* ── Security ──────────────────────────────────────────── */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                <SectionLabel label="Security" />
                <InputField
                  icon={FiLock} label="Password" type={showPwd ? "text" : "password"}
                  placeholder="Min. 6 characters" value={form.password} onChange={update("password")}
                  rightSlot={
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  }
                />
                <InputField
                  icon={FiLock} label="Confirm Password" type={showCpwd ? "text" : "password"}
                  placeholder="Re-enter your password" value={form.confirmPassword} onChange={update("confirmPassword")}
                  rightSlot={
                    <button type="button" onClick={() => setShowCpwd(!showCpwd)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showCpwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  }
                />
              </div>

              {/* ── Submit ────────────────────────────────────────────── */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500
                           hover:from-blue-500 hover:to-cyan-400
                           disabled:opacity-50 disabled:cursor-not-allowed
                           text-white font-bold py-4 rounded-2xl
                           transition-all duration-200 shadow-xl shadow-blue-600/25
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...</>
                ) : (
                  <>Register as Voter <FiArrowRight size={16} /></>
                )}
              </button>

              <p className="text-center text-slate-500 text-sm pb-4">
                Already registered?{" "}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Sign in →</Link>
              </p>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-1 h-4 bg-blue-500 rounded-full" />
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}


