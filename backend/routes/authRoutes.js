const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerFace } = require("../middleware/faceVerifyMiddleware");
const upload = require("../middleware/upload");
const rateLimit = require("express-rate-limit");

// ─── Rate Limiters ────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // max 10 login attempts per IP per window
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                   // max 5 registrations per IP per hour
  message: { success: false, message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.post("/register", registerLimiter, upload.upload.single("photo"), authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/admin-wallet-login", loginLimiter, authController.adminWalletLogin);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.use(protect); // All routes below require authentication

router.get("/me", authController.getMe);
router.post("/logout", authController.logout);
router.post("/verify-account", authController.verifyAccount);
router.post("/verify-face", authController.verifyFace);
router.patch("/update-wallet", authController.updateWallet);
router.post("/register-face", registerFace);

module.exports = router;
