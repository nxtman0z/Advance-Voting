const User = require("../models/User");
const Election = require("../models/Election");
const { ethers } = require("ethers");
const VotingABI = require("../../smart-contract/artifacts/contracts/Voting.sol/Voting.json");

// ─────────────────────────────────────────────
// @route   GET /api/admin/dashboard
// @desc    Admin dashboard stats
// @access  Admin
// ─────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalElections, activeElections, verifiedUsers] = await Promise.all([
      User.countDocuments({ role: "voter" }),
      Election.countDocuments(),
      Election.countDocuments({ status: "active" }),
      User.countDocuments({ isVerified: true }),
    ]);

    const recentUsers = await User.find({ role: "voter" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("fullName email isVerified createdAt");

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalElections,
        activeElections,
        verifiedUsers,
        recentUsers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
// ─────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", isVerified } = req.query;
    const query = { role: "voter" };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }
    if (isVerified !== undefined) query.isVerified = isVerified === "true";

    const users = await User.find(query)
      .select("-faceDescriptor -password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/admin/elections
// @desc    Create a new election
// @access  Admin
// ─────────────────────────────────────────────
exports.createElection = async (req, res) => {
  try {
    const { title, description, electionType, startTime, endTime, candidates } = req.body;

    const election = await Election.create({
      title,
      description,
      electionType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      candidates: candidates || [],
      createdBy: req.user.id,
      status: "upcoming",
    });

    res.status(201).json({ success: true, data: election });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/admin/elections/:id/deploy
// @desc    Deploy election to blockchain
// @access  Admin
// ─────────────────────────────────────────────
exports.deployElectionToBlockchain = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });
    if (election.isBlockchainDeployed)
      return res.status(400).json({ success: false, message: "Already deployed" });

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VotingABI.abi, signer);

    const startTs = Math.floor(new Date(election.startTime).getTime() / 1000);
    const endTs = Math.floor(new Date(election.endTime).getTime() / 1000);

    const tx = await contract.createElection(election.title, election.description, startTs, endTs);
    const receipt = await tx.wait();

    // Extract onChainId from events
    const event = receipt.logs
      .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
      .find((e) => e && e.name === "ElectionCreated");

    const onChainId = event ? Number(event.args.electionId) : null;

    // Add candidates on-chain
    for (const candidate of election.candidates) {
      const ctx = await contract.addCandidate(onChainId, candidate.name, candidate.party, candidate.imageHash || "");
      await ctx.wait();
    }

    election.onChainId = onChainId;
    election.deployTxHash = receipt.hash;
    election.isBlockchainDeployed = true;
    election.contractAddress = process.env.CONTRACT_ADDRESS;
    await election.save();

    res.status(200).json({
      success: true,
      message: "Election deployed to blockchain",
      data: { onChainId, txHash: receipt.hash },
    });
  } catch (error) {
    console.error("deployElectionToBlockchain error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/admin/elections/:id/register-voter
// @desc    Register voter for an election on the blockchain
// @access  Admin
// ─────────────────────────────────────────────
exports.registerVoterForElection = async (req, res) => {
  try {
    const { userId } = req.body;
    const election = await Election.findById(req.params.id);
    const user = await User.findById(userId);

    if (!election || !user) return res.status(404).json({ success: false, message: "Not found" });

    if (!user.walletAddress) {
      return res.status(400).json({ success: false, message: "User has no linked wallet address" });
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, VotingABI.abi, signer);

    const tx = await contract.registerVoter(election.onChainId, user.walletAddress);
    await tx.wait();

    // Record in MongoDB
    const alreadyRegistered = election.registeredVoters.some(
      (rv) => rv.userId.toString() === userId
    );
    if (!alreadyRegistered) {
      election.registeredVoters.push({ userId, walletAddress: user.walletAddress });
      await election.save();
    }

    res.status(200).json({ success: true, message: "Voter registered for election on blockchain" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PATCH /api/admin/users/:id/toggle-status
// @desc    Activate / deactivate a user
// @access  Admin
// ─────────────────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, data: { isActive: user.isActive } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/admin/elections
// @desc    Get all elections
// @access  Admin
// ─────────────────────────────────────────────
exports.getAllElections = async (req, res) => {
  try {
    const elections = await Election.find()
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: elections.length, data: elections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PATCH /api/admin/elections/:id/status
// @desc    Update election status
// @access  Admin
// ─────────────────────────────────────────────
exports.updateElectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const election = await Election.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!election) return res.status(404).json({ success: false, message: "Election not found" });
    res.status(200).json({ success: true, data: election });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
