const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerFace } = require("../middleware/faceVerifyMiddleware");
const upload = require("../middleware/upload");

// ─── Public Routes ───────────────────────────────────────────────────────────
router.post("/register", upload.upload.single("photo"), authController.register);
router.post("/login", authController.login);
router.post("/admin-wallet-login", authController.adminWalletLogin);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.use(protect); // All routes below require authentication

router.get("/me", authController.getMe);
router.post("/logout", authController.logout);
router.post("/verify-account", authController.verifyAccount);
router.post("/verify-face", authController.verifyFace);
router.patch("/update-wallet", authController.updateWallet);
router.post("/register-face", registerFace);

module.exports = router;
