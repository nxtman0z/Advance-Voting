const User = require("../models/User");
const Election = require("../models/Election");
const Party = require("../models/Party");
const { castVoteOnChain, getResultsOnChain, getVoterStatusOnChain, prepareVoterForElections } = require("../utils/blockchainService");

// ─────────────────────────────────────────────
// @route   GET /api/vote/elections
// @desc    Active elections with their parties (for voters)
// @access  Private (voter)
// ─────────────────────────────────────────────
exports.getActiveElections = async (req, res) => {
  try {
    // Show elections that are "active" or "upcoming" — trust admin-set status
    const elections = await Election.find({
      status: { $in: ["active", "upcoming"] },
    })
      .select("-registeredVoters -candidates")
      .lean();

    // Attach parties + voter status for each election
    const user = await User.findById(req.user.id).select("votedElections");

    const result = await Promise.all(
      elections.map(async (election) => {
        const parties = await Party.find({ election: election._id })
          .select("partyName partySymbol partyImage candidateName candidateBio candidatePhoto onChainCandidateId voteCount")
          .sort({ createdAt: 1 })
          .lean();

        const alreadyVoted = user.votedElections
          ? user.votedElections.some((v) => v.electionId === election.onChainId)
          : false;

        return { ...election, parties, alreadyVoted };
      })
    );

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/vote/prepare
// @desc    Pre-register + pre-fund voter wallet for all elections (call on page load)
// @access  Private (voter)
exports.prepareVoter = async (req, res) => {
  try {
    const Election = require("../models/Election");
    const elections = await Election.find({
      status: { $in: ["active", "upcoming"] },
      isBlockchainDeployed: true,
    }).select("onChainId");

    const ids = elections.map((e) => e.onChainId).filter(Boolean);
    if (ids.length === 0) {
      return res.status(200).json({ success: true, message: "No elections to prepare" });
    }

    // Run in background — respond immediately so UI doesn't wait
    prepareVoterForElections(req.user.id, ids).catch((e) =>
      console.warn("prepareVoter background error:", e.message)
    );

    res.status(200).json({ success: true, message: "Preparation started in background" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route   POST /api/vote/cast
// @desc    Cast a vote (face verified on frontend, OTP verified, blockchain backend cast)
// @access  Private (voter)
// Body: { electionId (MongoDB _id), partyId (MongoDB _id) }
// ─────────────────────────────────────────────
exports.castVote = async (req, res) => {
  try {
    const { electionId, partyId } = req.body;

    if (!electionId || !partyId) {
      return res.status(400).json({ success: false, message: "electionId and partyId are required" });
    }

    const user = await User.findById(req.user.id);

    // ── Check OTP verification ───────────────────────────────────────────
    if (!user.otpVerified) {
      return res.status(403).json({
        success: false,
        message: "OTP verification required before voting",
      });
    }

    // ── Load election + party ────────────────────────────────────────────
    const [election, party] = await Promise.all([
      Election.findById(electionId),
      Party.findById(partyId),
    ]);

    if (!election) return res.status(404).json({ success: false, message: "Election not found" });
    if (!party) return res.status(404).json({ success: false, message: "Party not found" });
    if (party.election.toString() !== electionId) {
      return res.status(400).json({ success: false, message: "Party does not belong to this election" });
    }

    // ── Double-vote check (MongoDB) ──────────────────────────────────────
    const alreadyVoted = user.votedElections &&
      user.votedElections.some((v) => v.electionId === election.onChainId);
    if (alreadyVoted) {
      return res.status(400).json({ success: false, message: "You have already voted in this election" });
    }

    // ── Cast on blockchain (relayer) ─────────────────────────────────────
    const { txHash, voterAddress } = await castVoteOnChain(
      user._id,
      election.onChainId,
      party.onChainCandidateId
    );

    // ── Record in MongoDB ────────────────────────────────────────────────
    user.votedElections = user.votedElections || [];
    user.votedElections.push({
      electionId: election.onChainId,
      partyId: party._id,
      txHash,
      votedAt: new Date(),
    });
    // Clear OTP verified flag
    user.otpVerified = false;
    await user.save({ validateBeforeSave: false });

    // Update cached vote count in party doc
    party.voteCount += 1;
    await party.save();
    election.totalVotes += 1;
    await election.save();

    res.status(200).json({
      success: true,
      message: "Vote cast successfully on blockchain!",
      data: { txHash, voterAddress, partyName: party.partyName, candidateName: party.candidateName },
    });
  } catch (error) {
    console.error("castVote error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/vote/my-votes
// @desc    Voter's own voting history
// @access  Private (voter)
// ─────────────────────────────────────────────
exports.getMyVotes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("votedElections fullName email phone photo");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/vote/results
// @desc    Get results for all elections (or one)
// @access  Public
// ─────────────────────────────────────────────
exports.getResults = async (req, res) => {
  try {
    const elections = await Election.find({ isBlockchainDeployed: true })
      .select("title state status totalVotes onChainId startTime endTime")
      .lean();

    const enriched = await Promise.all(
      elections.map(async (election) => {
        const parties = await Party.find({ election: election._id })
          .select("partyName partySymbol candidateName voteCount onChainCandidateId")
          .sort({ voteCount: -1 })
          .lean();

        // Determine winner (most votes, only if ended)
        let winner = null;
        if (new Date() >= new Date(election.endTime) && parties.length > 0) {
          winner = parties[0]; // already sorted desc
        }

        return { ...election, parties, winner };
      })
    );

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/vote/status/:electionMongoId
// @desc    Get voter's status for a specific election (from blockchain)
// @access  Private
// ─────────────────────────────────────────────
exports.getVoterStatus = async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionMongoId);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });

    const status = await getVoterStatusOnChain(req.user.id, election.onChainId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
