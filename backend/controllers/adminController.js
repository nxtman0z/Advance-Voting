/**
 * adminController.js  –  full rebuild
 * Handles: dashboard, elections (MongoDB + blockchain), parties/candidates,
 *          user listing, vote-count sync.
 */

const User = require("../models/User");
const Election = require("../models/Election");
const Party = require("../models/Party");
const {
  createElectionOnChain,
  addCandidateOnChain,
  getResultsOnChain,
} = require("../utils/blockchainService");

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalVoters, totalElections, activeElections, totalParties] =
      await Promise.all([
        User.countDocuments({ role: "voter" }),
        Election.countDocuments(),
        Election.countDocuments({ status: "active" }),
        Party.countDocuments(),
      ]);

    // Aggregate vote counts per election
    const elections = await Election.find()
      .sort({ createdAt: -1 })
      .select("title state status totalVotes onChainId startTime endTime")
      .lean();

    // Attach parties to each election
    const electionIds = elections.map((e) => e._id);
    const parties = await Party.find({ election: { $in: electionIds } })
      .select("election partyName candidateName voteCount partySymbol")
      .lean();

    const partiesMap = {};
    parties.forEach((p) => {
      const key = p.election.toString();
      if (!partiesMap[key]) partiesMap[key] = [];
      partiesMap[key].push(p);
    });

    const electionsWithParties = elections.map((e) => ({
      ...e,
      parties: partiesMap[e._id.toString()] || [],
    }));

    const recentUsers = await User.find({ role: "voter" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("fullName email phone createdAt photo");

    res.status(200).json({
      success: true,
      data: {
        totalVoters,
        totalElections,
        activeElections,
        totalParties,
        elections: electionsWithParties,
        recentUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", gender = "", status = "" } = req.query;
    const query = { role: "voter" };

    // Search by name, email, phone, or voterId
    if (search) {
      query.$or = [
        { fullName:  { $regex: search, $options: "i" } },
        { email:     { $regex: search, $options: "i" } },
        { phone:     { $regex: search, $options: "i" } },
        { voterId:   { $regex: search, $options: "i" } },
      ];
    }
    // Filter by gender
    if (gender && ["male", "female", "other"].includes(gender.toLowerCase())) {
      query.gender = gender.toLowerCase();
    }
    // Filter by account status
    if (status === "active")   query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -faceDescriptor -otp -otpExpires -passwordResetToken -passwordResetExpires")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);
    res.status(200).json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, data: { isActive: user.isActive } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete admin accounts" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Voter deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/elections
 * Creates election in MongoDB AND on-chain in one step.
 * Body: { title, description, state, startTime, endTime }
 */
exports.createElection = async (req, res) => {
  try {
    const { title, description, state, startTime, endTime } = req.body;
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "title, startTime, endTime are required",
      });
    }

    // 1 — Save to MongoDB first (so election is always created)
    const election = await Election.create({
      title,
      description: description || "",
      state: state || "National",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: "upcoming",
      isBlockchainDeployed: false,
      contractAddress: process.env.CONTRACT_ADDRESS,
      createdBy: req.user.id,
    });

    // 2 — Try blockchain deployment (non-blocking on failure)
    try {
      const { electionId: onChainId, txHash: deployTxHash } =
        await createElectionOnChain(title, description || "", startTime, endTime);

      election.onChainId = onChainId;
      election.deployTxHash = deployTxHash;
      election.isBlockchainDeployed = true;
      await election.save();
    } catch (chainErr) {
      console.error("Blockchain deploy failed (election saved without on-chain ID):", chainErr.message);
      // Election is still saved in MongoDB — admin can retry blockchain deployment later
    }

    res.status(201).json({
      success: true,
      message: election.isBlockchainDeployed
        ? "Election created and deployed on blockchain"
        : "Election created (blockchain deployment pending)",
      data: election,
    });
  } catch (err) {
    console.error("createElection error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/elections
 */
exports.getAllElections = async (req, res) => {
  try {
    const elections = await Election.find()
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    // Attach parties
    const electionIds = elections.map((e) => e._id);
    const parties = await Party.find({ election: { $in: electionIds } }).lean();
    const map = {};
    parties.forEach((p) => {
      const k = p.election.toString();
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });

    const data = elections.map((e) => ({
      ...e,
      parties: map[e._id.toString()] || [],
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/admin/elections/:id/status
 */
exports.updateElectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const election = await Election.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!election)
      return res.status(404).json({ success: false, message: "Election not found" });
    res.status(200).json({ success: true, data: election });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/elections/:id
 */
exports.deleteElection = async (req, res) => {
  try {
    const election = await Election.findByIdAndDelete(req.params.id);
    if (!election)
      return res.status(404).json({ success: false, message: "Election not found" });
    await Party.deleteMany({ election: req.params.id });
    res.status(200).json({ success: true, message: "Election deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PARTIES / CANDIDATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/elections/:id/parties
 * Adds a party+candidate to an election (MongoDB + blockchain).
 * Uses multipart/form-data with fields: partyName, candidateName, candidateBio
 * Files: partySymbol (required), partyImage (optional), candidatePhoto (optional)
 */
exports.addParty = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election)
      return res.status(404).json({ success: false, message: "Election not found" });

    const { partyName, candidateName, candidateBio } = req.body;
    if (!partyName || !candidateName) {
      return res.status(400).json({
        success: false,
        message: "partyName and candidateName are required",
      });
    }

    const files = req.files || {};
    if (!files.partySymbol || !files.partySymbol[0]) {
      return res.status(400).json({
        success: false,
        message: "partySymbol image is required",
      });
    }

    const partySymbolFile = files.partySymbol[0].filename;
    const partyImageFile = files.partyImage ? files.partyImage[0].filename : null;
    const candidatePhotoFile = files.candidatePhoto ? files.candidatePhoto[0].filename : null;

    // ── Save to MongoDB first ───────────────────────────────────────────────
    const party = await Party.create({
      election: election._id,
      onChainElectionId: election.onChainId || null,
      partyName,
      partySymbol: partySymbolFile,
      partyImage: partyImageFile,
      candidateName,
      candidateBio: candidateBio || "",
      candidatePhoto: candidatePhotoFile,
    });

    // ── Try blockchain (non-blocking on failure) ────────────────────────────
    if (election.isBlockchainDeployed && election.onChainId != null) {
      try {
        const { candidateId: onChainCandidateId, txHash } = await addCandidateOnChain(
          election.onChainId,
          candidateName,
          partyName,
          partySymbolFile
        );
        party.onChainCandidateId = onChainCandidateId;
        await party.save();

        return res.status(201).json({
          success: true,
          message: `Party "${partyName}" added successfully`,
          data: party,
          txHash,
        });
      } catch (chainErr) {
        console.error("addParty blockchain error (party saved without on-chain ID):", chainErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Party "${partyName}" added successfully`,
      data: party,
    });
  } catch (err) {
    console.error("addParty error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/elections/:id/parties
 */
exports.getPartiesForElection = async (req, res) => {
  try {
    const parties = await Party.find({ election: req.params.id }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: parties.length, data: parties });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/elections/:electionId/parties/:partyId
 */
exports.deleteParty = async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.partyId);
    if (!party)
      return res.status(404).json({ success: false, message: "Party not found" });
    res.status(200).json({ success: true, message: "Party removed from DB (blockchain immutable)" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC VOTE COUNTS from blockchain → MongoDB
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/elections/:id/sync-votes
 * Reads vote counts from blockchain and updates Party.voteCount and Election.totalVotes
 */
exports.syncVoteCounts = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election)
      return res.status(404).json({ success: false, message: "Election not found" });

    if (!election.isBlockchainDeployed || election.onChainId == null)
      return res.status(400).json({ success: false, message: "Election not on blockchain" });

    const { candidates, totalVotes } = await getResultsOnChain(election.onChainId);

    // Update each party's vote count
    const parties = await Party.find({ election: election._id });
    for (const party of parties) {
      const chainCandidate = candidates.find(
        (c) => c.candidateId === party.onChainCandidateId
      );
      if (chainCandidate) {
        party.voteCount = chainCandidate.voteCount;
        await party.save();
      }
    }

    election.totalVotes = totalVotes;
    await election.save();

    res.status(200).json({
      success: true,
      message: "Vote counts synced from blockchain",
      data: { totalVotes, candidates },
    });
  } catch (err) {
    console.error("syncVoteCounts error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Legacy export kept for backward-compat
exports.deployElectionToBlockchain = exports.createElection;
exports.registerVoterForElection = async (req, res) => {
  res.status(410).json({ success: false, message: "Use new castVote flow — voter wallets are automated" });
};
