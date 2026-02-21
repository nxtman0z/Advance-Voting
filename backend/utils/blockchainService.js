/**
 * blockchainService.js
 * All on-chain interactions for the voting system.
 * Uses ethers v6 + a single admin relayer wallet.
 * Each voter gets a deterministic wallet derived from their userId.
 */

const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// ─── ABI ─────────────────────────────────────────────────────────────────────
// Re-use the same ABI that lives in frontend/src/utils/VotingABI.json
const ABI_PATH = path.join(
  __dirname,
  "../../frontend/src/utils/VotingABI.json"
);
const votingArtifact = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
const VOTING_ABI = votingArtifact.abi;

// ─── Provider & relayer ───────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const relayerWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  VOTING_ABI,
  relayerWallet
);

// ─── Gas speed helper ────────────────────────────────────────────────────────
// Use higher priority fee so txs get mined faster on Sepolia
async function fastGasOpts() {
  try {
    const feeData = await provider.getFeeData();
    const tip = ethers.parseUnits("3", "gwei"); // 3 gwei tip
    const maxFee = (feeData.maxFeePerGas || ethers.parseUnits("30", "gwei")) + tip;
    return { maxPriorityFeePerGas: tip, maxFeePerGas: maxFee };
  } catch {
    return {}; // fallback to default
  }
}

// ─── Voter deterministic wallet ───────────────────────────────────────────────
/**
 * Derive a deterministic private key for a voter using:
 *   keccak256(userId + VOTER_WALLET_SECRET)
 */
function getVoterWallet(userId) {
  const secret = process.env.VOTER_WALLET_SECRET || "default_secret";
  const raw = `${userId.toString()}${secret}`;
  const privateKey = ethers.keccak256(ethers.toUtf8Bytes(raw));
  return new ethers.Wallet(privateKey, provider);
}

// ─── Election functions ───────────────────────────────────────────────────────

/**
 * Create an election on-chain.
 * @returns {number} on-chain election ID (1-based)
 */
async function createElectionOnChain(title, description, startTime, endTime) {
  const startTs = Math.floor(new Date(startTime).getTime() / 1000);
  const endTs = Math.floor(new Date(endTime).getTime() / 1000);

  const tx = await contract.createElection(title, description, startTs, endTs);
  const receipt = await tx.wait();

  // Parse ElectionCreated event to get electionId
  const iface = contract.interface;
  let electionId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "ElectionCreated") {
        electionId = Number(parsed.args.electionId);
        break;
      }
    } catch (_) {}
  }

  if (electionId === null) throw new Error("Could not parse ElectionCreated event");
  return { electionId, txHash: receipt.hash };
}

// ─── Candidate (party) functions ──────────────────────────────────────────────

/**
 * Add a candidate to an on-chain election.
 * @returns {number} on-chain candidateId
 */
async function addCandidateOnChain(electionId, candidateName, partyName, imageHash) {
  const tx = await contract.addCandidate(electionId, candidateName, partyName, imageHash || "");
  const receipt = await tx.wait();

  const iface = contract.interface;
  let candidateId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === "CandidateAdded") {
        candidateId = Number(parsed.args.candidateId);
        break;
      }
    } catch (_) {}
  }

  if (candidateId === null) throw new Error("Could not parse CandidateAdded event");
  return { candidateId, txHash: receipt.hash };
}

// ─── Voter registration ───────────────────────────────────────────────────────

/**
 * Register a voter wallet on-chain for a given election.
 * Called by relayer (admin wallet).
 */
async function registerVoterOnChain(electionId, voterAddress) {
  const gas = await fastGasOpts();
  const tx = await contract.registerVoter(electionId, voterAddress, gas);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Batch register multiple voter wallets.
 */
async function batchRegisterVotersOnChain(electionId, voterAddresses) {
  const tx = await contract.batchRegisterVoters(electionId, voterAddresses);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

// ─── Vote casting ─────────────────────────────────────────────────────────────

/**
 * Cast a vote on behalf of a voter.
 * 1. Derives voter's deterministic wallet
 * 2. Ensures voter is registered on-chain
 * 3. Funds voter wallet if balance too low
 * 4. Submits castVote from voter's wallet
 */
async function castVoteOnChain(userId, onChainElectionId, onChainCandidateId) {
  const voterWallet = getVoterWallet(userId);
  const voterAddress = voterWallet.address;

  // ── Check voter status on-chain ─────────────────────────────────────────────
  const [isRegistered, hasVoted] = await contract.getVoterStatus(
    onChainElectionId,
    voterAddress
  );

  if (hasVoted) {
    throw new Error("Already voted on blockchain");
  }

  // ── Register voter if not registered ───────────────────────────────────────
  if (!isRegistered) {
    await registerVoterOnChain(onChainElectionId, voterAddress);
  }

  // ── Fund voter wallet (needs gas) ─────────────────────────────────────────
  const balance = await provider.getBalance(voterAddress);
  const minBalance = ethers.parseEther("0.002"); // 0.002 Sepolia ETH
  if (balance < minBalance) {
    const gas = await fastGasOpts();
    const fundTx = await relayerWallet.sendTransaction({
      to: voterAddress,
      value: ethers.parseEther("0.005"),
      ...gas,
    });
    await fundTx.wait();
  }

  // ── Cast vote from voter's wallet ──────────────────────────────────────────
  const voterContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    VOTING_ABI,
    voterWallet
  );

  const gas = await fastGasOpts();
  const voteTx = await voterContract.castVote(onChainElectionId, onChainCandidateId, gas);
  const voteReceipt = await voteTx.wait();

  return {
    txHash: voteReceipt.hash,
    voterAddress,
  };
}

// ─── Results ──────────────────────────────────────────────────────────────────

/**
 * Fetch vote results from on-chain.
 * @returns { candidates: [{candidateId, name, party, voteCount}], totalVotes }
 */
async function getResultsOnChain(electionId) {
  const [candidates, totalVotes] = await contract.getResults(electionId);
  return {
    candidates: candidates.map((c) => ({
      candidateId: Number(c.id),
      name: c.name,
      party: c.party,
      voteCount: Number(c.voteCount),
    })),
    totalVotes: Number(totalVotes),
  };
}

/**
 * Get all elections from blockchain.
 */
async function getAllElectionsOnChain() {
  const elections = await contract.getAllElections();
  return elections.map((e) => ({
    id: Number(e.id),
    title: e.title,
    description: e.description,
    startTime: Number(e.startTime),
    endTime: Number(e.endTime),
    isActive: e.isActive,
    totalVotes: Number(e.totalVotes),
  }));
}

/**
 * Get voter status from blockchain.
 */
async function getVoterStatusOnChain(userId, electionId) {
  const voterWallet = getVoterWallet(userId);
  const [isRegistered, hasVoted, votedCandidateId] = await contract.getVoterStatus(
    electionId,
    voterWallet.address
  );
  return {
    isRegistered,
    hasVoted,
    votedCandidateId: Number(votedCandidateId),
    voterAddress: voterWallet.address,
  };
}

/**
 * Pre-register + pre-fund a voter for ALL active/upcoming elections.
 * Called when voter opens the voting page — runs in background.
 * By the time they actually vote, registration + funding are already done.
 */
async function prepareVoterForElections(userId, onChainElectionIds) {
  const voterWallet = getVoterWallet(userId);
  const voterAddress = voterWallet.address;

  for (const electionId of onChainElectionIds) {
    try {
      const [isRegistered] = await contract.getVoterStatus(electionId, voterAddress);
      if (!isRegistered) {
        await registerVoterOnChain(electionId, voterAddress);
      }
    } catch (e) {
      console.warn(`prepareVoter: register failed for election ${electionId}:`, e.message);
    }
  }

  // Fund once for all elections
  try {
    const balance = await provider.getBalance(voterAddress);
    const minBalance = ethers.parseEther("0.002");
    if (balance < minBalance) {
      const gas = await fastGasOpts();
      const fundTx = await relayerWallet.sendTransaction({
        to: voterAddress,
        value: ethers.parseEther("0.01"),
        ...gas,
      });
      await fundTx.wait();
    }
  } catch (e) {
    console.warn("prepareVoter: fund failed:", e.message);
  }

  return { voterAddress };
}

module.exports = {
  getVoterWallet,
  createElectionOnChain,
  addCandidateOnChain,
  registerVoterOnChain,
  batchRegisterVotersOnChain,
  castVoteOnChain,
  prepareVoterForElections,
  getResultsOnChain,
  getAllElectionsOnChain,
  getVoterStatusOnChain,
};
