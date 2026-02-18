const User = require("../models/User");
const axios = require("axios");

/**
 * Face verification middleware.
 * Expects req.body.faceDescriptor (128-d array from face-api.js on frontend)
 * Compares against stored descriptor using Euclidean distance.
 */
exports.verifyFace = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ success: false, message: "Face descriptor is required" });
    }

    const user = await User.findById(req.user.id).select("+faceDescriptor");

    if (!user.isFaceRegistered || !user.faceDescriptor || user.faceDescriptor.length === 0) {
      return res.status(400).json({ success: false, message: "No face registered for this user" });
    }

    // ─── Euclidean Distance ─────────────────────────────────────────────
    const distance = euclideanDistance(faceDescriptor, user.faceDescriptor);
    const THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || "0.5");

    if (distance > THRESHOLD) {
      return res.status(401).json({
        success: false,
        message: "Face verification failed. Please try again.",
        distance,
      });
    }

    // Optionally call Python Flask microservice for extra validation
    if (process.env.FACE_SERVICE_URL) {
      try {
        const response = await axios.post(`${process.env.FACE_SERVICE_URL}/verify`, {
          descriptor1: faceDescriptor,
          descriptor2: user.faceDescriptor,
        });
        if (!response.data.match) {
          return res.status(401).json({ success: false, message: "Face verification failed (service)" });
        }
      } catch (serviceError) {
        console.warn("Face service unavailable, falling back to local check:", serviceError.message);
      }
    }

    req.faceVerified = true;
    next();
  } catch (error) {
    console.error("faceVerifyMiddleware error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Register face descriptor for a user.
 * @route POST /api/auth/register-face
 */
exports.registerFace = async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: "Valid 128-dimensional face descriptor is required",
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      faceDescriptor,
      isFaceRegistered: true,
    });

    res.status(200).json({ success: true, message: "Face registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function euclideanDistance(desc1, desc2) {
  if (desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}
