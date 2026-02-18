const User = require("../models/User");
const { verifyVoteOnChain, castVoteOnChain } = require("../utils/blockchainUtils");
const Election = require("../models/Election");

// ─────────────────────────────────────────────
// @route   GET /api/vote/elections
// @desc    Get all active elections available to the voter
// @access  Private (voter)
// ─────────────────────────────────────────────
exports.getActiveElections = async (req, res) => {
  try {
    const now = new Date();
    const elections = await Election.find({
      status: "active",
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).select("-registeredVoters");

    res.status(200).json({ success: true, count: elections.length, data: elections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/vote/election/:id
// @desc    Get election details with candidates
// @access  Private (voter)
// ─────────────────────────────────────────────
exports.getElectionById = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id).populate("createdBy", "fullName");

    if (!election) {
      return res.status(404).json({ success: false, message: "Election not found" });
    }

    // Check if voter is registered for this election
    const user = await User.findById(req.user.id);
    const isRegistered = election.registeredVoters.some(
      (rv) => rv.userId.toString() === user._id.toString()
    );

    const hasVoted = user.hasVotedInElection(election.onChainId);

    res.status(200).json({
      success: true,
      data: { ...election.toObject(), isRegistered, hasVoted },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/vote/cast
// @desc    Cast a vote (after face + OTP verification)
// @access  Private (verified voter)
// ─────────────────────────────────────────────
exports.castVote = async (req, res) => {
  try {
    const { electionId, candidateId, txHash } = req.body;

    if (!electionId || !candidateId || !txHash) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const user = await User.findById(req.user.id);

    // Check if already voted
    if (user.hasVotedInElection(electionId)) {
      return res.status(400).json({ success: false, message: "You have already voted in this election" });
    }

    // Verify the transaction on blockchain
    const isValid = await verifyVoteOnChain(txHash, user.walletAddress, electionId, candidateId);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Vote transaction verification failed" });
    }

    // Record the vote in MongoDB
    user.votedElections.push({ electionId, txHash, votedAt: new Date() });
    await user.save({ validateBeforeSave: false });

    // Update election vote count cache
    await Election.findOneAndUpdate(
      { onChainId: electionId, "candidates.candidateId": candidateId },
      {
        $inc: {
          totalVotes: 1,
          "candidates.$.voteCount": 1,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Vote cast successfully and recorded on blockchain",
      data: { txHash, electionId, candidateId },
    });
  } catch (error) {
    console.error("castVote error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/vote/my-votes
// @desc    Get voter's voting history
// @access  Private (voter)
// ─────────────────────────────────────────────
exports.getMyVotes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("votedElections");
    res.status(200).json({ success: true, data: user.votedElections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/vote/results/:electionId
// @desc    Get election results (only after election ends)
// @access  Public
// ─────────────────────────────────────────────
exports.getResults = async (req, res) => {
  try {
    const election = await Election.findOne({ onChainId: req.params.electionId });

    if (!election) {
      return res.status(404).json({ success: false, message: "Election not found" });
    }

    if (!election.resultsPublished && new Date() < election.endTime) {
      return res.status(403).json({
        success: false,
        message: "Results will be available after the election ends",
      });
    }

    const sortedCandidates = [...election.candidates].sort((a, b) => b.voteCount - a.voteCount);

    res.status(200).json({
      success: true,
      data: {
        election: {
          title: election.title,
          endTime: election.endTime,
          totalVotes: election.totalVotes,
        },
        results: sortedCandidates,
        winner: sortedCandidates[0] || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
