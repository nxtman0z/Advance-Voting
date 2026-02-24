const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const voteController = require("../controllers/voteController");
const otpController = require("../controllers/otpController");
const { protect } = require("../middleware/authMiddleware");

// Strict limiter only on the cast endpoint (10 attempts / hour per IP)
const castLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many vote attempts. Please try again later." },
});

// ─── Public routes (no auth needed) ───────────────────────────────────────────
router.get("/results", voteController.getResults);

// All other vote routes require authentication
router.use(protect);

// ─── Elections with parties ────────────────────────────────────────────────────
router.get("/elections", voteController.getActiveElections);

// ─── OTP (send before voting, verify before cast) ─────────────────────────────
router.post("/otp/send", otpController.sendOtp);
router.post("/otp/verify", otpController.verifyOtp);
router.get("/otp/status", otpController.getOtpStatus);

// ─── Pre-register + pre-fund voter wallet (fire-and-forget, call on page load) ─
router.post("/prepare", voteController.prepareVoter);

// ─── Cast vote (face verified on frontend, OTP verified in DB) ──────────────────
// Body: { electionId, partyId }
router.post("/cast", castLimiter, voteController.castVote);

// ─── Voter history / dashboard ─────────────────────────────────────────────────
router.get("/my-votes", voteController.getMyVotes);

// ─── Voter blockchain status for an election ───────────────────────────────────
router.get("/status/:electionMongoId", voteController.getVoterStatus);


module.exports = router;
