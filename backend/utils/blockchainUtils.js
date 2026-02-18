const { ethers } = require("ethers");
const VotingABI = require("../../smart-contract/artifacts/contracts/Voting.sol/Voting.json");

// ─── Provider & Contract ──────────────────────────────────────────────────────
let provider;
let contract;

const getProvider = () => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  }
  return provider;
};

const getContract = (signerOrProvider = null) => {
  const p = signerOrProvider || getProvider();
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, VotingABI.abi, p);
};

const getAdminSigner = () => {
  const prov = getProvider();
  return new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, prov);
};

// ─────────────────────────────────────────────
//  Verify a vote transaction on-chain
// ─────────────────────────────────────────────
/**
 * @param {string} txHash
 * @param {string} voterAddress
 * @param {number} electionId
 * @param {number} candidateId
 * @returns {boolean}
 */
exports.verifyVoteOnChain = async (txHash, voterAddress, electionId, candidateId) => {
  try {
    const prov = getProvider();
    const receipt = await prov.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) return false;

    const iface = new ethers.Interface(VotingABI.abi);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (
          parsed.name === "VoteCast" &&
          parsed.args.electionId.toString() === String(electionId) &&
          parsed.args.voter.toLowerCase() === voterAddress.toLowerCase() &&
          parsed.args.candidateId.toString() === String(candidateId)
        ) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  } catch (error) {
    console.error("verifyVoteOnChain error:", error);
    return false;
  }
};

// ─────────────────────────────────────────────
//  Get all elections from chain
// ─────────────────────────────────────────────
exports.getAllElectionsFromChain = async () => {
  try {
    const c = getContract();
    const elections = await c.getAllElections();
    return elections.map((e) => ({
      id: Number(e.id),
      title: e.title,
      description: e.description,
      startTime: new Date(Number(e.startTime) * 1000),
      endTime: new Date(Number(e.endTime) * 1000),
      isActive: e.isActive,
      candidateCount: Number(e.candidateCount),
      totalVotes: Number(e.totalVotes),
    }));
  } catch (error) {
    console.error("getAllElectionsFromChain error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  Get candidates for an election from chain
// ─────────────────────────────────────────────
exports.getCandidatesFromChain = async (electionId) => {
  try {
    const c = getContract();
    const candidates = await c.getCandidates(electionId);
    return candidates.map((cand) => ({
      id: Number(cand.id),
      name: cand.name,
      party: cand.party,
      imageHash: cand.imageHash,
      voteCount: Number(cand.voteCount),
    }));
  } catch (error) {
    console.error("getCandidatesFromChain error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  Get voter status from chain
// ─────────────────────────────────────────────
exports.getVoterStatusFromChain = async (electionId, voterAddress) => {
  try {
    const c = getContract();
    const [isRegistered, hasVoted, votedCandidateId] = await c.getVoterStatus(
      electionId,
      voterAddress
    );
    return {
      isRegistered,
      hasVoted,
      votedCandidateId: Number(votedCandidateId),
    };
  } catch (error) {
    console.error("getVoterStatusFromChain error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  Get results from chain
// ─────────────────────────────────────────────
exports.getResultsFromChain = async (electionId) => {
  try {
    const c = getContract();
    const [candidates, totalVotes] = await c.getResults(electionId);
    return {
      candidates: candidates.map((cand) => ({
        id: Number(cand.id),
        name: cand.name,
        party: cand.party,
        voteCount: Number(cand.voteCount),
      })),
      totalVotes: Number(totalVotes),
    };
  } catch (error) {
    console.error("getResultsFromChain error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  Cast vote on chain (admin wallet signs on behalf)
// ─────────────────────────────────────────────
exports.castVoteOnChain = async (electionId, candidateId) => {
  try {
    const signer = getAdminSigner();
    const c = getContract(signer);
    const tx = await c.castVote(electionId, candidateId);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("castVoteOnChain error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  Register voter on chain (admin action)
// ─────────────────────────────────────────────
exports.registerVoterOnChain = async (electionId, voterAddress) => {
  try {
    const signer = getAdminSigner();
    const c = getContract(signer);
    const tx = await c.registerVoter(electionId, voterAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("registerVoterOnChain error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  Format contract address
// ─────────────────────────────────────────────
exports.getContractAddress = () => process.env.CONTRACT_ADDRESS;

exports.getNetworkInfo = async () => {
  const prov = getProvider();
  const network = await prov.getNetwork();
  return { chainId: Number(network.chainId), name: network.name };
};
