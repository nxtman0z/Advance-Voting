const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const { uploadParty } = require("../middleware/upload");

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo("admin"));

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", adminController.getDashboardStats);

// ─── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/toggle-status", adminController.toggleUserStatus);
router.delete("/users/:id", adminController.deleteUser);

// ─── Elections ─────────────────────────────────────────────────────────────────
router.get("/elections", adminController.getAllElections);
router.post("/elections", adminController.createElection);
router.patch("/elections/:id/status", adminController.updateElectionStatus);
router.delete("/elections/:id", adminController.deleteElection);
router.post("/elections/:id/sync-votes", adminController.syncVoteCounts);

// ─── Parties / Candidates ──────────────────────────────────────────────────────
router.get("/elections/:id/parties", adminController.getPartiesForElection);
router.post("/elections/:id/parties", uploadParty, adminController.addParty);
router.delete("/elections/:electionId/parties/:partyId", adminController.deleteParty);

module.exports = router;
