const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Protect Routes ──────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-faceDescriptor -password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Restrict to Roles ───────────────────────────────────────────────────────
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

// ─── Require Verified Account ────────────────────────────────────────────────
exports.requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your account before proceeding",
    });
  }
  next();
};

// ─── Require Face Registration ───────────────────────────────────────────────
exports.requireFaceRegistered = (req, res, next) => {
  if (!req.user.isFaceRegistered) {
    return res.status(403).json({
      success: false,
      message: "Please register your face before voting",
    });
  }
  next();
};

// ─── Require OTP Verified (for voting) ───────────────────────────────────────
exports.requireOTPVerified = async (req, res, next) => {
  const user = await require("../models/User").findById(req.user.id); 
  if (!user.otpVerified) {
    return res.status(403).json({
      success: false,
      message: "Please complete OTP verification before voting",
    });
  }
  next();
};
