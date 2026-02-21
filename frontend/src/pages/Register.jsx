import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiUser, FiMail, FiPhone, FiCamera, FiCheckCircle,
  FiArrowRight, FiLock, FiEye, FiEyeOff, FiCreditCard,
} from "react-icons/fi";
import { SiEthereum } from "react-icons/si";

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
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-10 text-center shadow-2xl">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500/30 to-emerald-500/20 rounded-full
                              flex items-center justify-center border border-green-500/30">
                <FiCheckCircle size={42} className="text-green-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Registered!</h2>
            <p className="text-slate-400 mb-8">
              Your voter account is ready.<br />You can now log in with your credentials.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500
                         text-white font-semibold py-3 rounded-xl transition-all duration-200
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-gradient-to-br from-blue-600 to-blue-700 shadow-xl shadow-blue-600/40 mb-4">
            <SiEthereum size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Voter Registration</h1>
          <p className="text-slate-400 mt-1 text-sm">Create your secure blockchain voting identity</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />

          <div className="p-7 space-y-5">

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ── Section: Photo Upload ──────────────────────────────── */}
            <div>
              <SectionDivider label="Profile Photo" />
              <div className="flex flex-col items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className={`relative w-28 h-28 rounded-full overflow-hidden transition-all duration-200 group cursor-pointer bg-slate-800
                    ${photo ? "ring-2 ring-blue-500" : "ring-2 ring-dashed ring-slate-600 hover:ring-blue-500"}`}
                >
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                      <FiCamera size={28} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[10px] text-slate-600 group-hover:text-slate-400 font-medium">CLICK TO ADD</span>
                    </div>
                  )}
                  {preview && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiCamera size={22} className="text-white" />
                    </div>
                  )}
                </button>
                <p className="text-xs text-slate-500">
                  {photo
                    ? <span className="text-blue-400 font-medium">{photo.name}</span>
                    : <span>JPG / PNG · max 5 MB <span className="text-red-400">*</span></span>
                  }
                </p>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
            </div>

            {/* ── Section: Personal Info ─────────────────────────────── */}
            <div className="space-y-4">
              <SectionDivider label="Personal Info" />
              <InputField
                icon={FiUser} label="Full Name" placeholder="Enter your full name"
                value={form.fullName} onChange={update("fullName")}
              />
              <InputField
                icon={FiMail} label="Email Address" type="email" placeholder="your@email.com"
                value={form.email} onChange={update("email")}
              />
              <InputField
                icon={FiPhone} label="Phone Number" placeholder="+91 99999 99999"
                value={form.phone} onChange={update("phone")}
              />
              <InputField
                icon={FiCreditCard} label="Voter ID" placeholder="e.g. VTR-2024-000123"
                value={form.voterId} onChange={update("voterId")}
                hint="Government-issued voter identification number"
              />
              <GenderField value={form.gender} onChange={(g) => setForm((p) => ({ ...p, gender: g }))} />
            </div>

            {/* ── Section: Security ──────────────────────────────────── */}
            <div className="space-y-4">
              <SectionDivider label="Security" />
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
                placeholder="Re-enter password" value={form.confirmPassword} onChange={update("confirmPassword")}
                rightSlot={
                  <button type="button" onClick={() => setShowCpwd(!showCpwd)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    {showCpwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                }
              />
            </div>

            {/* ── Submit ─────────────────────────────────────────────── */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500
                         hover:from-blue-500 hover:to-cyan-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold py-3.5 rounded-xl
                         transition-all duration-200 shadow-lg shadow-blue-600/25
                         flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...</>
              ) : (
                <>Register as Voter <FiArrowRight size={16} /></>
              )}
            </button>

            <p className="text-center text-slate-500 text-sm pt-1">
              Already registered?{" "}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-700/60" />
      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-slate-700/60" />
    </div>
  );
}


