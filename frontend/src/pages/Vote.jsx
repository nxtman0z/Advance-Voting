import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import CandidateCard from "../components/CandidateCard";
import FaceCapture from "../components/FaceCapture";
import OTPInput from "../components/OTPInput";
import toast from "react-hot-toast";
import { FiShield, FiCheckCircle, FiAlertCircle, FiArrowRight } from "react-icons/fi";
import { SiEthereum } from "react-icons/si";

const STEPS = ["Connect Wallet", "OTP Verify", "Face Verify", "Cast Vote", "Confirmed"];

export default function Vote() {
  const { user, API, sendOTP, verifyOTP, otpVerified, setOtpVerified, setFaceVerified } = useAuth();
  const { account, connectWallet, castVote, isConnected } = useWeb3();

  const [step, setStep]                 = useState(0);
  const [elections, setElections]       = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [txHash, setTxHash]             = useState(null);
  const [error, setError]               = useState("");

  // ─── Load Elections ───────────────────────────────────────────────────
  useEffect(() => {
    fetchElections();
  }, []);

  // ─── Auto-advance step 0 if wallet connected ──────────────────────────
  useEffect(() => {
    if (isConnected && step === 0) setStep(1);
  }, [isConnected]);

  const fetchElections = async () => {
    try {
      const { data } = await API.get("/vote/elections");
      setElections(data.data);
      if (data.data.length > 0) setSelectedElection(data.data[0]);
    } catch { toast.error("Failed to load elections"); }
  };

  // ─── Step 1: OTP ──────────────────────────────────────────────────────
  const handleOTPVerify = async (otp) => {
    setLoading(true);
    setError("");
    try {
      await verifyOTP(otp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally { setLoading(false); }
  };

  // ─── Step 2: Face ─────────────────────────────────────────────────────
  const handleFaceVerify = (descriptor) => {
    setFaceDescriptor(descriptor);
    setFaceVerified(true);
    setStep(3);
    toast.success("Face verified!");
  };

  // ─── Step 3: Cast Vote ────────────────────────────────────────────────
  const handleCastVote = async () => {
    if (!selectedCandidate || !selectedElection || !faceDescriptor) {
      toast.error("Please complete all verification steps and select a candidate");
      return;
    }
    if (!isConnected) { toast.error("Connect your wallet first"); return; }

    setLoading(true);
    setError("");
    try {
      // Cast vote on blockchain
      const receipt = await castVote(selectedElection.onChainId, selectedCandidate.candidateId);

      // Record on backend
      await API.post("/vote/cast", {
        electionId: selectedElection.onChainId,
        candidateId: selectedCandidate.candidateId,
        txHash: receipt.hash,
        faceDescriptor,
      });

      setTxHash(receipt.hash);
      setStep(4);
      toast.success("Vote cast successfully!");
    } catch (err) {
      const msg = err.reason || err.response?.data?.message || err.message || "Voting failed";
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  // ─── Stepper UI ───────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`flex flex-col items-center ${i <= step ? "text-blue-400" : "text-slate-600"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < step  ? "border-blue-500 bg-blue-600 text-white" :
              i === step ? "border-blue-500 text-white animate-pulse-ring" :
              "border-slate-600 text-slate-600"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className="text-xs mt-1 whitespace-nowrap hidden sm:block">{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-12 mx-1 transition-colors ${i < step ? "bg-blue-500" : "bg-slate-700"}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Cast Your Vote</h1>
        <p className="text-slate-400 mt-2">Complete all verification steps to cast your secure blockchain vote</p>
      </div>

      {/* Verification Steps */}
      <div className="card p-6 mb-8">
        <StepIndicator />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
            <FiAlertCircle /> {error}
          </div>
        )}

        {/* Step 0: Connect Wallet */}
        {step === 0 && (
          <div className="text-center py-8 animate-fadeInUp">
            <SiEthereum size={48} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-slate-400 mb-6">Connect MetaMask to verify your voter identity on-chain</p>
            <button onClick={connectWallet} className="btn-primary flex items-center gap-2 mx-auto">
              <SiEthereum /> Connect MetaMask
            </button>
          </div>
        )}

        {/* Step 1: OTP */}
        {step === 1 && (
          <div className="animate-fadeInUp">
            <h2 className="text-center text-xl font-bold text-white mb-2">OTP Verification</h2>
            <p className="text-center text-slate-400 text-sm mb-6">
              Request and enter your one-time password to proceed
            </p>
            <div className="flex justify-center mb-4">
              <button onClick={sendOTP} className="btn-secondary text-sm flex items-center gap-2">
                <FiShield /> Send OTP to {user?.email}
              </button>
            </div>
            <OTPInput onComplete={handleOTPVerify} onResend={sendOTP} loading={loading} />
          </div>
        )}

        {/* Step 2: Face */}
        {step === 2 && (
          <div className="animate-fadeInUp">
            <h2 className="text-center text-xl font-bold text-white mb-2">Face Verification</h2>
            <p className="text-center text-slate-400 text-sm mb-6">
              Verify your identity before casting your vote
            </p>
            <FaceCapture mode="register" onDescriptorCapture={handleFaceVerify} />
            <p className="text-xs text-slate-500 text-center mt-2">
              * Your face data is only used for verification and never stored unencrypted
            </p>
          </div>
        )}

        {/* Step 3: Cast Vote */}
        {step === 3 && (
          <div className="animate-fadeInUp">
            <h2 className="text-center text-xl font-bold text-white mb-2">Select & Cast Vote</h2>

            {/* Election Selector */}
            {elections.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm text-slate-300 mb-2">Select Election</label>
                <select
                  className="input-field"
                  value={selectedElection?._id || ""}
                  onChange={(e) => setSelectedElection(elections.find((el) => el._id === e.target.value))}
                >
                  {elections.map((el) => <option key={el._id} value={el._id}>{el.title}</option>)}
                </select>
              </div>
            )}

            {selectedElection && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 mb-6 text-sm text-blue-300">
                  <strong>{selectedElection.title}</strong> — ends {new Date(selectedElection.endTime).toLocaleDateString()}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {selectedElection.candidates?.map((c) => (
                    <CandidateCard
                      key={c.candidateId}
                      candidate={{ ...c, id: c.candidateId }}
                      onVote={() => setSelectedCandidate(c)}
                      selected={selectedCandidate?.candidateId === c.candidateId}
                    />
                  ))}
                </div>

                <button
                  onClick={handleCastVote}
                  disabled={!selectedCandidate || loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><FiCheckCircle /> Cast Vote on Blockchain</>
                  )}
                </button>
              </>
            )}

            {elections.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No active elections available at this time.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmed */}
        {step === 4 && (
          <div className="text-center py-8 animate-fadeInUp">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-ring">
              <FiCheckCircle size={40} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Vote Confirmed!</h2>
            <p className="text-slate-400 mb-4">Your vote has been permanently recorded on the blockchain.</p>
            {txHash && (
              <div className="bg-slate-800 rounded-lg px-4 py-3 text-left">
                <p className="text-xs text-slate-400 mb-1">Transaction Hash</p>
                <p className="text-xs font-mono text-blue-400 break-all">{txHash}</p>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-4">
              Your vote is anonymous and immutable. No one can change it.
            </p>
          </div>
        )}
      </div>

      {/* Verified Status Badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Wallet", ok: isConnected },
          { label: "OTP",    ok: otpVerified },
          { label: "Face",   ok: step >= 3 },
        ].map((badge) => (
          <div key={badge.label} className={`card p-3 flex items-center gap-2 text-sm ${badge.ok ? "border-green-500/30" : ""}`}>
            <span className={`w-2 h-2 rounded-full ${badge.ok ? "bg-green-400" : "bg-slate-600"}`} />
            <span className={badge.ok ? "text-green-400" : "text-slate-500"}>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
