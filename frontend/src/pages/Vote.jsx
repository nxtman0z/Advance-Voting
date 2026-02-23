/**
 * Vote.jsx  -  complete voting flow
 * Step 1: Choose election + party
 * Step 2: Face verification (compare webcam with stored photo)
 * Step 3: Email OTP
 * Step 4: Confirm + blockchain cast
 * Step 5: Success + tx hash
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const UPLOADS_BASE = API_BASE.replace("/api", "") + "/uploads";

// --- Step labels -------------------------------------------------------------
const STEPS = ["Choose Party", "Face Verify", "Email OTP", "Confirm Vote", "Done!"];

// --- Face models loaded flag -------------------------------------------------
let faceModelsLoaded = false;
async function loadFaceModels() {
  if (faceModelsLoaded) return;
  const MODEL_URL = "/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  faceModelsLoaded = true;
}

// Module-level cache: avoids re-fetching stored photo on every attempt
const storedDescCache = {};

export default function Vote() {
  const { user, API, sendOTP, verifyOTP } = useAuth();

  const [step, setStep] = useState(0);
  const [elections, setElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(true);

  // Selected items
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  // Face verify
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const [faceStatus,  setFaceStatus]  = useState("idle");
  const [faceMessage, setFaceMessage] = useState("");
  const [snapDataUrl, setSnapDataUrl] = useState(null);
  const [faceScore,   setFaceScore]   = useState(null);

  // OTP
  const [otp,             setOtp]             = useState("");
  const [otpSent,         setOtpSent]         = useState(false);
  const [otpSending,      setOtpSending]      = useState(false);
  const [otpVerifiedLocal, setOtpVerifiedLocal] = useState(false);
  const [otpVerifying,    setOtpVerifying]    = useState(false);

  // Cast vote
  const [casting, setCasting] = useState(false);
  const [txHash,  setTxHash]  = useState("");

  // Pre-load models silently as soon as component mounts
  useEffect(() => { loadFaceModels().catch(() => {}); }, []);

  // Ref callback: fires the moment React mounts/unmounts the <video> element.
  // If the stream is already acquired, attach it immediately.
  const videoRefCallback = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      // Attach to video element if it's already mounted, else videoRefCallback will attach it
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      toast.error("Camera access denied. Please allow camera access and refresh.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // --- Load active elections on mount -----------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function fetchElections() {
      setLoadingElections(true);
      try {
        const { data } = await API.get("/vote/elections");
        if (!cancelled) {
          setElections(data.data || []);
          setLoadingElections(false);

          // Fire-and-forget: pre-register + pre-fund voter wallet so blockchain
          // registration is done before they hit "Cast Vote" -> much faster.
          API.post("/vote/prepare").catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || "Could not load elections.");
          setLoadingElections(false);
        }
      }
    }
    fetchElections();
    return () => { cancelled = true; };
  }, []);

  // Auto-send OTP when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    // Reset OTP state on re-entry
    setOtp("");
    setOtpSent(false);
    setOtpVerifiedLocal(false);
    // Auto-send OTP
    (async () => {
      setOtpSending(true);
      try {
        await sendOTP();
        setOtpSent(true);
        toast.success("OTP sent to your email! Check inbox.");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to send OTP. Click 'Resend'.");
      } finally {
        setOtpSending(false);
      }
    })();
  }, [step]);

  // Enter / leave face step
  useEffect(() => {
    if (step !== 1) { stopCamera(); return; }
    setFaceStatus("idle");
    setFaceMessage("Position your face in the frame and click Capture & Verify.");
    setSnapDataUrl(null);
    setFaceScore(null);
    startCamera();
    // Pre-cache registered photo descriptor in background
    if (user?.photo && !storedDescCache[user.photo]) {
      loadFaceModels().then(async () => {
        try {
          const img = await faceapi.fetchImage(`${UPLOADS_BASE}/photos/${user.photo}`);
          const det = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 }))
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (det) storedDescCache[user.photo] = det.descriptor;
        } catch { /* silent */ }
      }).catch(() => {});
    }
    return () => stopCamera();
  }, [step]);

  // Capture photo from webcam and verify against registered photo
  const handleCapture = useCallback(async () => {
    if (!user?.photo) return;
    const video = videoRef.current;
    if (!video) { toast.error("Camera not ready."); return; }

    setFaceStatus("loading");
    setSnapDataUrl(null);
    setFaceScore(null);
    setFaceMessage("Loading AI models...");

    try {
      // 1 - ensure models ready (cached after first call)
      await loadFaceModels();

      // 2 - ensure video is playing and has a real frame
      setFaceMessage("Waiting for camera frame...");
      if (video.paused || video.srcObject === null) {
        // Re-attach stream if needed
        if (streamRef.current) { video.srcObject = streamRef.current; }
        video.play().catch(() => {});
      }
      // Wait until video has real frames (currentTime > 0 means at least one frame decoded)
      for (let i = 0; i < 100; i++) {
        if (video.currentTime > 0 && video.videoWidth > 0) break;
        await new Promise(r => setTimeout(r, 100));
      }
      if (video.videoWidth === 0) {
        setFaceStatus("fail");
        setFaceMessage("Camera did not start. Please refresh and allow camera access.");
        return;
      }

      // 3 - use requestAnimationFrame to grab a frame guaranteed to be on screen
      setFaceMessage("Capturing photo...");
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const w = video.videoWidth;
      const h = video.videoHeight;
      const cnv = document.createElement("canvas");
      cnv.width = w; cnv.height = h;
      cnv.getContext("2d").drawImage(video, 0, 0, w, h);
      setSnapDataUrl(cnv.toDataURL("image/jpeg", 0.92));

      // 4 - detect face in captured canvas
      setFaceMessage("Detecting face...");
      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.15 });
      const liveResult = await faceapi
        .detectSingleFace(cnv, opts)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!liveResult) {
        setFaceStatus("fail");
        setFaceMessage("No face detected. Ensure your face is well-lit and centred, then retry.");
        return;
      }

      // 5 - get registered photo descriptor (cached)
      setFaceMessage("Matching with registered photo...");
      let storedDesc = storedDescCache[user.photo];
      if (!storedDesc) {
        const storedImg = await faceapi.fetchImage(`${UPLOADS_BASE}/photos/${user.photo}`);
        const storedRes = await faceapi
          .detectSingleFace(storedImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.15 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!storedRes) {
          setFaceStatus("fail");
          setFaceMessage("Could not detect face in registered photo. Contact admin.");
          return;
        }
        storedDescCache[user.photo] = storedRes.descriptor;
        storedDesc = storedRes.descriptor;
      }

      // 6 - compare
      const distance  = faceapi.euclideanDistance(storedDesc, liveResult.descriptor);
      const threshold = parseFloat(import.meta.env.VITE_FACE_THRESHOLD || "0.65");
      const score     = Math.round((1 - distance) * 100);
      setFaceScore(score);

      if (distance <= threshold) {
        setFaceStatus("success");
        setFaceMessage(`Face matched! Similarity: ${score}%`);
        toast.success("Identity verified!");
        setTimeout(() => { stopCamera(); setStep(2); }, 1500);
      } else {
        setFaceStatus("fail");
        setFaceMessage(`No match (${score}% similarity). Try better lighting, remove glasses, or move closer.`);
      }
    } catch (err) {
      console.error("handleCapture error:", err);
      setFaceStatus("fail");
      setFaceMessage("Error: " + err.message);
    }
  }, [user, stopCamera]);

  // --- OTP handling ---------------------------------------------------------
  const handleSendOTP = async () => {
    setOtpSending(true);
    setOtpSent(false);
    setOtp("");
    try {
      await sendOTP();
      setOtpSent(true);
      toast.success("OTP sent! Check your email inbox.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Enter a 6-digit OTP");
      return;
    }
    setOtpVerifying(true);
    try {
      await verifyOTP(otp);
      setOtpVerifiedLocal(true);
      toast.success("OTP verified!");
      setTimeout(() => setStep(3), 800);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setOtpVerifying(false);
    }
  };

  // --- Cast vote -------------------------------------------------------------
  const handleCastVote = async () => {
    if (!selectedElection || !selectedParty) return;
    setCasting(true);
    try {
      const { data } = await API.post("/vote/cast", {
        electionId: selectedElection._id,
        partyId: selectedParty._id,
      });
      setTxHash(data.data.txHash);
      setStep(4);
      toast.success("Vote cast on blockchain!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Vote failed. Try again.");
    } finally {
      setCasting(false);
    }
  };

  // --- Step 0: Choose party -------------------------------------------------
  function StepChooseParty() {
    if (loadingElections)
      return (
        <div className="text-center text-slate-400 py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading elections...
        </div>
      );

    if (elections.length === 0)
      return (
        <div className="text-center text-slate-400 py-16">
          No active elections available right now.
        </div>
      );

    return (
      <div className="space-y-8">
        {elections.map((election) => (
          <div key={election._id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white">{election.title}</h3>
              <p className="text-slate-400 text-sm">{election.state} | Ends {new Date(election.endTime).toLocaleDateString()}</p>
              {election.alreadyVoted && (
                <span className="mt-2 inline-block text-xs bg-green-600/20 border border-green-500/40 text-green-300 px-3 py-1 rounded-full">
                  v You already voted in this election
                </span>
              )}
            </div>

            {election.alreadyVoted ? null : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(election.parties || []).map((party) => (
                  <button
                    key={party._id}
                    onClick={() => {
                      setSelectedElection(election);
                      setSelectedParty(party);
                      setStep(1);
                      setFaceStatus("idle");
                      setFaceMessage("");
                    }}
                    className={`group p-4 rounded-xl border text-left transition-all ${
                      selectedParty?._id === party._id
                        ? "border-blue-500 bg-blue-600/20"
                        : "border-slate-600/50 bg-slate-700/30 hover:border-blue-500/50 hover:bg-slate-700/60"
                    }`}
                  >
                    {/* Party symbol */}
                    {party.partySymbol && (
                      <img
                        src={`${UPLOADS_BASE}/parties/${party.partySymbol}`}
                        alt={party.partyName + " symbol"}
                        className="w-16 h-16 object-contain mx-auto mb-3 rounded-lg bg-white/5 p-1"
                      />
                    )}
                    <p className="font-semibold text-white text-center">{party.partyName}</p>
                    <p className="text-slate-400 text-xs text-center mt-1">{party.candidateName}</p>
                    {party.candidateBio && (
                      <p className="text-slate-500 text-xs text-center mt-1 line-clamp-2">{party.candidateBio}</p>
                    )}
                    {party.candidatePhoto && (
                      <img
                        src={`${UPLOADS_BASE}/parties/${party.candidatePhoto}`}
                        alt={party.candidateName}
                        className="w-10 h-10 rounded-full object-cover mx-auto mt-3"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function StepFaceVerify() {
    const busy    = faceStatus === "loading";
    const failed  = faceStatus === "fail";
    const success = faceStatus === "success";

    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-1">Identity Verification</h3>
          <p className="text-slate-400 text-sm">
            Voting for: <span className="text-white font-semibold">{selectedParty?.partyName}</span>
          </p>
        </div>

        {/* Side-by-side: live camera + captured snapshot */}
        <div className="grid grid-cols-2 gap-3">
          {/* Live camera */}
          <div className="space-y-1">
            <p className="text-xs text-slate-500 text-center"> Live Camera</p>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-square border-2 border-slate-700">
              <video ref={videoRefCallback} autoPlay muted playsInline className="w-full h-full object-cover" />
              {/* Face guide oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-36 rounded-full border-2 border-blue-400/50 border-dashed" />
              </div>
            </div>
          </div>

          {/* Snapshot / placeholder */}
          <div className="space-y-1">
            <p className="text-xs text-slate-500 text-center"> Captured</p>
            <div className="rounded-xl overflow-hidden bg-slate-900 aspect-square border-2 border-slate-700 flex items-center justify-center">
              {snapDataUrl ? (
                <img src={snapDataUrl} alt="snapshot" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-600 text-3xl"></span>
              )}
            </div>
          </div>
        </div>

        {/* Registered photo preview */}
        {user?.photo && (
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/50">
            <img
              src={`${UPLOADS_BASE}/photos/${user?.photo}`}
              alt="registered"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-600 flex-shrink-0"
              onError={(e) => { e.target.style.display="none"; }}
            />
            <div>
              <p className="text-xs text-slate-500">Registered photo</p>
              <p className="text-sm text-white font-medium">{user?.fullName}</p>
            </div>
            {faceScore !== null && (
              <div className={`ml-auto text-lg font-bold ${success ? "text-green-400" : "text-red-400"}`}>
                {faceScore}%
              </div>
            )}
          </div>
        )}

        {/* Status message */}
        {faceMessage && (
          <div className={`p-3 rounded-xl text-sm text-center font-medium border ${
            success ? "bg-green-600/15 border-green-500/40 text-green-300" :
            failed  ? "bg-red-600/15 border-red-500/40 text-red-300" :
            busy    ? "bg-yellow-600/15 border-yellow-500/40 text-yellow-300" :
                      "bg-blue-600/15 border-blue-500/40 text-blue-300"
          }`}>
            {busy && <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 align-middle" />}
            {faceMessage}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setStep(0); stopCamera(); }}
            disabled={busy || success}
            className="px-4 py-2.5 rounded-xl border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={handleCapture}
            disabled={busy || success}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              success
                ? "bg-green-600 text-white cursor-default"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            }`}
          >
            {busy    ? "Verifying..."  :
             success ? " Verified!" :
             failed  ? " Retake & Verify" :
                       " Capture & Verify"}
          </button>
        </div>

        <p className="text-xs text-slate-600 text-center">
          Tip: good lighting, face the camera directly, remove glasses if needed.
        </p>
      </div>
    );
  }
  // --- Step 2: Email OTP ----------------------------------------------------
  function StepOTP() {
    return (
      <div className="max-w-sm mx-auto space-y-5">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-1">Email OTP</h3>
          <p className="text-slate-400 text-sm">
            We'll send a one-time code to <span className="text-white">{user?.email}</span>
          </p>
        </div>

        {!otpSent ? (
          <div className="text-center space-y-3">
            {otpSending ? (
              <div className="flex items-center justify-center gap-2 text-blue-300 text-sm">
                <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Sending OTP to your email...
              </div>
            ) : (
              <button
                onClick={handleSendOTP}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
              >
                Send OTP to Email
              </button>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Enter 6-digit OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="------"
                className="w-full text-center text-2xl tracking-[0.5em] bg-slate-800 border border-slate-600/50 rounded-xl py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleVerifyOTP}
              disabled={otpVerifying || otp.length !== 6}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {otpVerifying ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              onClick={handleSendOTP}
              disabled={otpSending}
              className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              {otpSending ? "Sending..." : " Resend OTP"}
            </button>
          </>
        )}

        <button
          onClick={() => setStep(1)}
          className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors"
        >
          Back to face verification
        </button>
      </div>
    );
  }

  // --- Step 3: Confirm vote -------------------------------------------------
  function StepConfirm() {
    return (
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-1">Confirm Your Vote</h3>
          <p className="text-slate-400 text-sm">This action is permanent and recorded on blockchain</p>
        </div>

        {/* Summary card */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Election</span>
            <span className="text-white font-medium">{selectedElection?.title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Party</span>
            <span className="text-white font-medium">{selectedParty?.partyName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Candidate</span>
            <span className="text-white font-medium">{selectedParty?.candidateName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Voter</span>
            <span className="text-white font-medium">{user?.fullName}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep(0)}
            className="flex-1 py-2.5 rounded-lg border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm"
          >
            Change Vote
          </button>
          <button
            onClick={handleCastVote}
            disabled={casting}
            className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
          >
            {casting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Casting...
              </span>
            ) : (
              "Cast Vote on Blockchain"
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Step 4: Done ---------------------------------------------------------
  function StepDone() {
    return (
      <div className="max-w-sm mx-auto text-center space-y-5">
        <div className="w-20 h-20 bg-green-600/20 border-2 border-green-500/40 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">v</span>
        </div>
        <h3 className="text-2xl font-bold text-white">Vote Cast Successfully!</h3>
        <p className="text-slate-400 text-sm">
          Your vote for <span className="text-white font-medium">{selectedParty?.partyName}</span> has been
          permanently recorded on the Sepolia blockchain.
        </p>

        {txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="block p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-blue-400 hover:text-blue-300 text-xs break-all transition-colors"
          >
            - View transaction on Etherscan
            <br />
            <span className="text-slate-500">{txHash}</span>
          </a>
        )}

        <button
          onClick={() => window.location.reload()}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          Back to Elections
        </button>
      </div>
    );
  }

  const stepComponents = [
    <StepChooseParty key="s0" />,
    <StepFaceVerify key="s1" />,
    <StepOTP key="s2" />,
    <StepConfirm key="s3" />,
    <StepDone key="s4" />,
  ];

  return (
    <div className="min-h-screen px-4 py-10 max-w-4xl mx-auto">
      {/* Title */}
      <h1 className="text-3xl font-bold text-white text-center mb-2">Cast Your Vote</h1>
      <p className="text-slate-400 text-center mb-8">Secure | Verified | Blockchain-Recorded</p>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10 gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`flex flex-col items-center ${i <= step ? "opacity-100" : "opacity-40"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < step
                    ? "bg-green-600/30 border-green-500 text-green-300"
                    : i === step
                    ? "bg-blue-600/30 border-blue-500 text-blue-300 ring-2 ring-blue-500/30"
                    : "bg-slate-800 border-slate-600 text-slate-500"
                }`}
              >
                {i < step ? "v" : i + 1}
              </div>
              <span className="text-xs mt-1 text-slate-400 hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mx-1 transition-all ${
                  i < step ? "bg-green-500/60" : "bg-slate-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6">
        {stepComponents[step]}
      </div>
    </div>
  );
}
