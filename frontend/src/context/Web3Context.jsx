import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import VotingABI from "../utils/VotingABI.json";

const Web3Context = createContext(null);

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export function Web3Provider({ children }) {
  const [provider, setProvider]           = useState(null);
  const [signer, setSigner]               = useState(null);
  const [account, setAccount]             = useState(null);
  const [contract, setContract]           = useState(null);
  const [chainId, setChainId]             = useState(null);
  const [isConnecting, setIsConnecting]   = useState(false);
  const [networkError, setNetworkError]   = useState(null);

  const SUPPORTED_CHAIN_IDS = [31337, 11155111, 80001]; // localhost, sepolia, mumbai

  // ─── Connect MetaMask ─────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not detected. Please install MetaMask.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer   = await web3Provider.getSigner();
      const network      = await web3Provider.getNetwork();
      const cId          = Number(network.chainId);

      // Auto-switch to Sepolia if on wrong network
      if (!SUPPORTED_CHAIN_IDS.includes(cId)) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }], // Sepolia
          });
        } catch (switchErr) {
          setNetworkError("Please switch MetaMask to Sepolia testnet.");
          toast.error("Please switch to Sepolia testnet in MetaMask.");
        }
      } else {
        setNetworkError(null);
      }

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0].toLowerCase());
      setChainId(cId);

      if (CONTRACT_ADDRESS) {
        const votingContract = new ethers.Contract(CONTRACT_ADDRESS, VotingABI, web3Signer);
        setContract(votingContract);
      }

      toast.success(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
    } catch (err) {
      console.error("connectWallet error:", err);
      toast.error(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ─── Disconnect ───────────────────────────────────────────────────────
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setContract(null);
    setChainId(null);
    toast.success("Wallet disconnected");
  };

  // ─── Listen to MetaMask events ────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0].toLowerCase());
        toast.info("Account changed");
      }
    };

    const handleChainChanged = (chainIdHex) => {
      setChainId(parseInt(chainIdHex, 16));
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // ─── Auto-reconnect if previously connected ───────────────────────────
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts.length > 0) connectWallet();
      });
    }
  }, []);

  // ─── Cast Vote via Smart Contract ─────────────────────────────────────
  const castVote = async (electionId, candidateId) => {
    if (!contract || !signer) throw new Error("Wallet not connected");
    const tx = await contract.castVote(electionId, candidateId);
    const receipt = await tx.wait();
    return receipt;
  };

  // ─── Get Results from Chain ───────────────────────────────────────────
  const getResultsFromChain = async (electionId) => {
    if (!contract) throw new Error("Contract not initialized");
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

  // ─── Get Voter Status from Chain ──────────────────────────────────────
  const getVoterStatus = async (electionId, address) => {
    if (!contract) return null;
    const [isRegistered, hasVoted, votedCandidateId] = await contract.getVoterStatus(
      electionId,
      address
    );
    return { isRegistered, hasVoted, votedCandidateId: Number(votedCandidateId) };
  };

  const formatAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  return (
    <Web3Context.Provider
      value={{
        provider, signer, account, contract, chainId,
        isConnecting, networkError,
        connectWallet, disconnectWallet,
        castVote, getResultsFromChain, getVoterStatus,
        formatAddress,
        isConnected: !!account,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used inside Web3Provider");
  return ctx;
};
