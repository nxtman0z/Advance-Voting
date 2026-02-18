const express = require("express");
const router = express.Router();
const voteController = require("../controllers/voteController");
const otpController = require("../controllers/otpController");
const { protect, requireVerified, requireFaceRegistered } = require("../middleware/authMiddleware");
const { verifyFace } = require("../middleware/faceVerifyMiddleware");

// All vote routes require authentication and verified account
router.use(protect);
router.use(requireVerified);

// ─── Elections ─────────────────────────────────────────────────────────────────
router.get("/elections", voteController.getActiveElections);
router.get("/elections/:id", voteController.getElectionById);

// ─── Voting ────────────────────────────────────────────────────────────────────
// Cast vote requires: verified + face registered + OTP verified + face check
router.post(
  "/cast",
  requireFaceRegistered,
  verifyFace,
  voteController.castVote
);

// ─── Voter History ─────────────────────────────────────────────────────────────
router.get("/my-votes", voteController.getMyVotes);

// ─── Results (public-ish, still auth protected) ────────────────────────────────
router.get("/results/:electionId", voteController.getResults);

// ─── OTP ───────────────────────────────────────────────────────────────────────
router.post("/otp/send", otpController.sendOtp);
router.post("/otp/verify", otpController.verifyOtp);
router.get("/otp/status", otpController.getOtpStatus);

module.exports = router;
