import { useState, useRef, useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";

/**
 * OTPInput component
 * Props:
 *  - length: number (default 6)
 *  - onComplete(otp: string) — called when all digits are filled
 *  - onResend() — called when resend is clicked
 *  - cooldown: number (seconds, default 60)
 *  - loading: boolean
 */
export default function OTPInput({ length = 6, onComplete, onResend, cooldown = 60, loading = false }) {
  const [digits, setDigits]         = useState(Array(length).fill(""));
  const [timer, setTimer]           = useState(cooldown);
  const [canResend, setCanResend]   = useState(false);
  const inputRefs                   = useRef([]);
  const timerRef                    = useRef(null);

  // ─── Timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = () => {
    setTimer(cooldown);
    setCanResend(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── Handle Input ─────────────────────────────────────────────────────
  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);

    // Auto-focus next
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger onComplete when all filled
    if (updated.every((d) => d !== "") && updated.join("").length === length) {
      onComplete && onComplete(updated.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted.length > 0) {
      const updated = [...digits];
      pasted.split("").forEach((char, i) => { if (i < length) updated[i] = char; });
      setDigits(updated);
      inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
      if (pasted.length === length) onComplete && onComplete(pasted);
    }
    e.preventDefault();
  };

  const handleResend = () => {
    setDigits(Array(length).fill(""));
    resetTimer();
    onResend && onResend();
    inputRefs.current[0]?.focus();
  };

  const isComplete = digits.every((d) => d !== "");

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Digit boxes */}
      <div className="flex gap-3">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={loading}
            className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all duration-200 bg-slate-800 text-white focus:outline-none ${
              digit
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-600 focus:border-blue-400"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Status */}
      {isComplete && (
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fadeInUp">
          <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-xs">✓</span>
          OTP Complete
        </div>
      )}

      {/* Resend */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={loading}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <FiRefreshCw size={14} /> Resend OTP
          </button>
        ) : (
          <span>
            Resend in{" "}
            <span className="font-mono text-blue-400 font-semibold">
              {String(Math.floor(timer / 60)).padStart(2, "0")}:
              {String(timer % 60).padStart(2, "0")}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
