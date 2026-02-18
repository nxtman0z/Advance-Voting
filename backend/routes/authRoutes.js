const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerFace } = require("../middleware/faceVerifyMiddleware");

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post("/register", authController.register);
router.post("/login", authController.login);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.use(protect); // All routes below require authentication

router.get("/me", authController.getMe);
router.post("/logout", authController.logout);
router.post("/verify-account", authController.verifyAccount);
router.patch("/update-wallet", authController.updateWallet);
router.post("/register-face", registerFace);

module.exports = router;
