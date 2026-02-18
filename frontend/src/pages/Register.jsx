import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FaceCapture from "../components/FaceCapture";
import OTPInput from "../components/OTPInput";
import { FiUser, FiMail, FiPhone, FiLock, FiCreditCard, FiCalendar, FiCheckCircle } from "react-icons/fi";

const steps = ["Account", "Identity", "Face", "Verify"];

export default function Register() {
  const { register, verifyAccount, registerFace } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [faceDesc, setFaceDesc]   = useState(null);

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    nationalId: "", dateOfBirth: "", password: "",
    confirmPassword: "", walletAddress: "",
  });

  const update = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  // ─── Step 0: Account Info ─────────────────────────────────────────────
  const handleAccountStep = async () => {
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match"); return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }
    setError("");
    setLoading(true);
    try {
      await register(form);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  // ─── Step 1: OTP Verification ─────────────────────────────────────────
  const handleOTPComplete = async (otp) => {
    setLoading(true);
    try {
      await verifyAccount(otp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally { setLoading(false); }
  };

  // ─── Step 2: Face Capture ─────────────────────────────────────────────
  const handleFaceCapture = async (descriptor) => {
    setFaceDesc(descriptor);
    setLoading(true);
    try {
      await registerFace(descriptor);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Face registration failed");
    } finally { setLoading(false); }
  };

  const InputField = ({ icon: Icon, label, name, type = "text", placeholder, required }) => (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type={type}
          className="input-field pl-10"
          placeholder={placeholder}
          value={form[name]}
          onChange={(e) => update(name, e.target.value)}
          required={required}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-2 ${i <= step ? "text-blue-400" : "text-slate-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                i < step  ? "border-blue-500 bg-blue-600" :
                i === step ? "border-blue-500 text-white" :
                "border-slate-600"
              }`}>
                {i < step ? <FiCheckCircle size={14} /> : i + 1}
              </div>
              <span className="text-xs hidden sm:block">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-16 mx-1 ${i < step ? "bg-blue-500" : "bg-slate-700"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-8 animate-fadeInUp">
        <h1 className="text-2xl font-bold text-white mb-1">
          {step === 0 && "Create Account"}
          {step === 1 && "Verify Identity"}
          {step === 2 && "Register Face"}
          {step === 3 && "All Done!"}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {step === 0 && "Fill in your personal information"}
          {step === 1 && "Enter the OTP sent to your email and phone"}
          {step === 2 && "Capture your face for biometric authentication"}
          {step === 3 && "Your account is fully set up"}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* ─── Step 0: Account Info ─── */}
        {step === 0 && (
          <div className="space-y-4">
            <InputField icon={FiUser}     label="Full Name"      name="fullName"       placeholder="John Doe"         required />
            <InputField icon={FiMail}     label="Email"          name="email"          type="email" placeholder="john@example.com" required />
            <InputField icon={FiPhone}    label="Phone Number"   name="phone"          placeholder="+1234567890"      required />
            <InputField icon={FiCreditCard} label="National ID"  name="nationalId"     placeholder="A12345678"        required />
            <InputField icon={FiCalendar} label="Date of Birth"  name="dateOfBirth"    type="date"                    required />
            <InputField icon={FiLock}     label="Password"       name="password"       type="password" placeholder="Min 8 chars" required />
            <InputField icon={FiLock}     label="Confirm Password" name="confirmPassword" type="password" placeholder="Repeat password" required />
            <button onClick={handleAccountStep} disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Registering..." : "Continue"}
            </button>
          </div>
        )}

        {/* ─── Step 1: OTP ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400 text-center">
              A 6-digit OTP was sent to <span className="text-white font-medium">{form.email}</span>
            </p>
            <OTPInput
              onComplete={handleOTPComplete}
              onResend={() => {}}
              loading={loading}
            />
            {loading && <p className="text-center text-blue-400 text-sm">Verifying...</p>}
          </div>
        )}

        {/* ─── Step 2: Face ─── */}
        {step === 2 && (
          <div>
            <FaceCapture onDescriptorCapture={handleFaceCapture} mode="register" />
            {loading && <p className="text-center text-blue-400 text-sm mt-4">Saving face data...</p>}
          </div>
        )}

        {/* ─── Step 3: Done ─── */}
        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle size={40} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Registration Complete!</h2>
              <p className="text-slate-400 mt-2">Your account is verified and face is registered. You can now vote.</p>
            </div>
            <button onClick={() => navigate("/vote")} className="btn-primary w-full">
              Go to Vote
            </button>
          </div>
        )}

        {step === 0 && (
          <p className="text-center text-slate-400 text-sm mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
