import { ethers } from "ethers";
import VotingABI from "./VotingABI.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

/**
 * Get a read-only contract instance (no wallet required)
 */
export const getReadContract = async () => {
  const provider = new ethers.JsonRpcProvider(
    import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545"
  );
  return new ethers.Contract(CONTRACT_ADDRESS, VotingABI, provider);
};

/**
 * Get a write contract instance (requires MetaMask)
 */
export const getWriteContract = async () => {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer   = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, VotingABI, signer);
};

/**
 * Get all elections
 */
export const getAllElections = async () => {
  const contract = await getReadContract();
  const elections = await contract.getAllElections();
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
};

/**
 * Get candidates for an election
 */
export const getCandidates = async (electionId) => {
  const contract = await getReadContract();
  const candidates = await contract.getCandidates(electionId);
  return candidates.map((c) => ({
    id: Number(c.id),
    name: c.name,
    party: c.party,
    imageHash: c.imageHash,
    voteCount: Number(c.voteCount),
  }));
};

/**
 * Get election results
 */
export const getResults = async (electionId) => {
  const contract = await getReadContract();
  const [candidates, totalVotes] = await contract.getResults(electionId);
  return {
    candidates: candidates.map((c) => ({
      id: Number(c.id),
      name: c.name,
      party: c.party,
      voteCount: Number(c.voteCount),
    })),
    totalVotes: Number(totalVotes),
  };
};

/**
 * Cast a vote
 */
export const castVote = async (electionId, candidateId) => {
  const contract = await getWriteContract();
  const tx = await contract.castVote(electionId, candidateId);
  return tx.wait();
};

/**
 * Get voter status
 */
export const getVoterStatus = async (electionId, voterAddress) => {
  const contract = await getReadContract();
  const [isRegistered, hasVoted, votedCandidateId] = await contract.getVoterStatus(
    electionId,
    voterAddress
  );
  return { isRegistered, hasVoted, votedCandidateId: Number(votedCandidateId) };
};
