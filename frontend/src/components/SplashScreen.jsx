import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState("in"); // "in" → "hold" → "out"

  useEffect(() => {
    // Logo fades in → holds → fades out
    const holdTimer = setTimeout(() => setPhase("out"), 2000);
    const doneTimer = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(holdTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      className="splash-overlay"
      style={{ opacity: phase === "out" ? 0 : 1 }}
    >
      {/* Animated rings behind logo */}
      <div className="splash-ring splash-ring-1" />
      <div className="splash-ring splash-ring-2" />
      <div className="splash-ring splash-ring-3" />

      {/* Logo block */}
      <div
        className="splash-content"
        style={{
          transform: phase === "in" ? "scale(0.85)" : "scale(1)",
          opacity: phase === "in" ? 0 : 1,
        }}
      >
        <img
          src="/logo.png"
          alt="Pollaris"
          className="splash-logo"
        />
        <h1 className="splash-title">Pollaris</h1>
        <p className="splash-tagline">Where Every Voice Finds Direction</p>

        {/* Animated loading bar */}
        <div className="splash-bar-track">
          <div
            className="splash-bar-fill"
            style={{ width: phase === "in" ? "0%" : "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
