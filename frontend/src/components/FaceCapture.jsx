import { useRef, useEffect, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import { FiCamera, FiCheck, FiAlertCircle, FiRefreshCw } from "react-icons/fi";

/**
 * FaceCapture component
 * Props:
 *  - onDescriptorCapture(descriptor: Float32Array) — called when face is detected
 *  - mode: "register" | "verify"
 *  - referenceDescriptor: Float32Array (required in verify mode)
 */
export default function FaceCapture({ onDescriptorCapture, mode = "register", referenceDescriptor }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const intervalRef = useRef(null);

  const [modelsLoaded, setModelsLoaded]   = useState(false);
  const [cameraActive, setCameraActive]   = useState(false);
  const [faceDetected, setFaceDetected]   = useState(false);
  const [capturing, setCapturing]         = useState(false);
  const [status, setStatus]               = useState("idle"); // idle | loading | active | success | error
  const [message, setMessage]             = useState("Click 'Start Camera' to begin");
  const [distance, setDistance]           = useState(null);

  const MODEL_URL = "/models"; // face-api models must be in /public/models

  // ─── Load Models ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadModels = async () => {
      setStatus("loading");
      setMessage("Loading face recognition models...");
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setStatus("idle");
        setMessage("Models loaded. Click 'Start Camera' to begin.");
      } catch (err) {
        setStatus("error");
        setMessage("Failed to load face models. Check network.");
        console.error("Model load error:", err);
      }
    };
    loadModels();
    return () => stopCamera();
  }, []);

  // ─── Start Camera ─────────────────────────────────────────────────────
  const startCamera = async () => {
    if (!modelsLoaded) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatus("active");
      setMessage("Position your face in the frame");
      startDetection();
    } catch (err) {
      setStatus("error");
      setMessage("Cannot access camera. Check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setFaceDetected(false);
  };

  // ─── Continuous Detection ─────────────────────────────────────────────
  const startDetection = () => {
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      const canvas = canvasRef.current;
      const dims = faceapi.matchDimensions(canvas, videoRef.current, true);
      faceapi.draw.drawDetections(canvas, faceapi.resizeResults(detection ? [detection] : [], dims));

      if (detection) {
        setFaceDetected(true);
        setMessage(
          mode === "register" ? "Face detected! Click 'Capture'" : "Face detected! Verifying..."
        );

        if (mode === "verify" && referenceDescriptor) {
          const dist = faceapi.euclideanDistance(detection.descriptor, referenceDescriptor);
          setDistance(dist.toFixed(4));
          if (dist < 0.5) {
            setMessage("✅ Face match successful!");
            setStatus("success");
            onDescriptorCapture && onDescriptorCapture(Array.from(detection.descriptor));
            stopCamera();
          } else {
            setMessage(`Face mismatch (distance: ${dist.toFixed(3)}). Try again.`);
          }
        }
      } else {
        setFaceDetected(false);
        setMessage("No face detected. Adjust position.");
      }
    }, 200);
  };

  // ─── Capture Descriptor (register mode) ──────────────────────────────
  const captureDescriptor = async () => {
    if (!videoRef.current || !faceDetected) return;
    setCapturing(true);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage("No face found. Try again.");
        setCapturing(false);
        return;
      }

      setStatus("success");
      setMessage("Face captured successfully!");
      onDescriptorCapture && onDescriptorCapture(Array.from(detection.descriptor));
      stopCamera();
    } catch (err) {
      setMessage("Capture failed. Please retry.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status Banner */}
      <div
        className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
          status === "success"  ? "bg-green-500/20 text-green-400 border border-green-500/30" :
          status === "error"    ? "bg-red-500/20 text-red-400 border border-red-500/30" :
          status === "loading"  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                                  "bg-blue-500/20 text-blue-400 border border-blue-500/30"
        }`}
      >
        {status === "success"  && <FiCheck />}
        {status === "error"    && <FiAlertCircle />}
        {status === "loading"  && <FiRefreshCw className="animate-spin" />}
        {status === "active"   && <FiCamera />}
        {message}
      </div>

      {/* Video + Canvas */}
      <div className="relative w-full max-w-md aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-700">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ display: cameraActive ? "block" : "none" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ display: cameraActive ? "block" : "none" }}
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <FiCamera size={48} className="text-slate-500" />
            <p className="text-slate-400 text-sm">Camera inactive</p>
          </div>
        )}

        {/* Live face indicator */}
        {cameraActive && (
          <div
            className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
              faceDetected ? "bg-green-400 animate-pulse" : "bg-red-500"
            }`}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded || status === "success"}
            className="btn-primary flex items-center gap-2"
          >
            <FiCamera /> Start Camera
          </button>
        ) : (
          <>
            <button onClick={stopCamera} className="btn-secondary">Stop Camera</button>
            {mode === "register" && (
              <button
                onClick={captureDescriptor}
                disabled={!faceDetected || capturing}
                className="btn-primary flex items-center gap-2"
              >
                {capturing ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                {capturing ? "Capturing..." : "Capture Face"}
              </button>
            )}
          </>
        )}
      </div>

      {distance !== null && mode === "verify" && (
        <p className="text-xs text-slate-400">
          Euclidean distance: <span className="font-mono text-blue-400">{distance}</span> (threshold: 0.5)
        </p>
      )}
    </div>
  );
}
