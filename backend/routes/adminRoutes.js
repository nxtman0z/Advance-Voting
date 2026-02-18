const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo("admin"));

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", adminController.getDashboardStats);

// ─── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/toggle-status", adminController.toggleUserStatus);

// ─── Elections ─────────────────────────────────────────────────────────────────
router.get("/elections", adminController.getAllElections);
router.post("/elections", adminController.createElection);
router.post("/elections/:id/deploy", adminController.deployElectionToBlockchain);
router.patch("/elections/:id/status", adminController.updateElectionStatus);
router.post("/elections/:id/register-voter", adminController.registerVoterForElection);

module.exports = router;
