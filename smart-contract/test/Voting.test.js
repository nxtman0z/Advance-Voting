const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
  let voting;
  let admin, voter1, voter2, voter3, nonVoter;

  const now = Math.floor(Date.now() / 1000);
  const future = now + 86400; // 1 day later
  const past = now - 86400;   // 1 day ago

  beforeEach(async function () {
    [admin, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();
    await voting.waitForDeployment();
  });

  // ─────────────────────────────────────────────
  //  Deployment
  // ─────────────────────────────────────────────
  describe("Deployment", function () {
    it("Should set the correct admin", async function () {
      expect(await voting.admin()).to.equal(admin.address);
    });

    it("Should start with 0 elections", async function () {
      expect(await voting.electionCount()).to.equal(0);
    });
  });

  // ─────────────────────────────────────────────
  //  Election Management
  // ─────────────────────────────────────────────
  describe("Election Management", function () {
    it("Should allow admin to create an election", async function () {
      await expect(voting.createElection("Test Election", "Description", now, future))
        .to.emit(voting, "ElectionCreated")
        .withArgs(1, "Test Election", now, future);

      expect(await voting.electionCount()).to.equal(1);
    });

    it("Should reject election creation from non-admin", async function () {
      await expect(
        voting.connect(voter1).createElection("Test", "Desc", now, future)
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should reject election with past end time", async function () {
      await expect(
        voting.createElection("Test", "Desc", past - 1, past)
      ).to.be.revertedWith("End time must be in the future");
    });

    it("Should toggle election status", async function () {
      await voting.createElection("Test", "Desc", now, future);
      await voting.toggleElectionStatus(1);

      const election = await voting.getElection(1);
      expect(election.isActive).to.equal(false);
    });
  });

  // ─────────────────────────────────────────────
  //  Candidate Management
  // ─────────────────────────────────────────────
  describe("Candidate Management", function () {
    beforeEach(async function () {
      await voting.createElection("Test Election", "Desc", now, future);
    });

    it("Should allow admin to add a candidate", async function () {
      await expect(voting.addCandidate(1, "Alice", "Party A", "QmHash"))
        .to.emit(voting, "CandidateAdded")
        .withArgs(1, 1, "Alice", "Party A");

      const election = await voting.getElection(1);
      expect(election.candidateCount).to.equal(1);
    });

    it("Should get all candidates", async function () {
      await voting.addCandidate(1, "Alice", "Party A", "QmHash1");
      await voting.addCandidate(1, "Bob", "Party B", "QmHash2");

      const candidates = await voting.getCandidates(1);
      expect(candidates.length).to.equal(2);
      expect(candidates[0].name).to.equal("Alice");
      expect(candidates[1].name).to.equal("Bob");
    });
  });

  // ─────────────────────────────────────────────
  //  Voter Registration
  // ─────────────────────────────────────────────
  describe("Voter Registration", function () {
    beforeEach(async function () {
      await voting.createElection("Test Election", "Desc", now, future);
    });

    it("Should register a voter", async function () {
      await expect(voting.registerVoter(1, voter1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(1, voter1.address);

      const [isRegistered] = await voting.getVoterStatus(1, voter1.address);
      expect(isRegistered).to.equal(true);
    });

    it("Should batch register voters", async function () {
      await voting.batchRegisterVoters(1, [voter1.address, voter2.address, voter3.address]);

      const [r1] = await voting.getVoterStatus(1, voter1.address);
      const [r2] = await voting.getVoterStatus(1, voter2.address);
      const [r3] = await voting.getVoterStatus(1, voter3.address);

      expect(r1).to.equal(true);
      expect(r2).to.equal(true);
      expect(r3).to.equal(true);
    });

    it("Should not allow duplicate registration", async function () {
      await voting.registerVoter(1, voter1.address);
      await expect(voting.registerVoter(1, voter1.address)).to.be.revertedWith(
        "Voter already registered"
      );
    });
  });

  // ─────────────────────────────────────────────
  //  Voting
  // ─────────────────────────────────────────────
  describe("Voting", function () {
    beforeEach(async function () {
      await voting.createElection("Test Election", "Desc", now, future);
      await voting.addCandidate(1, "Alice", "Party A", "QmHash1");
      await voting.addCandidate(1, "Bob", "Party B", "QmHash2");
      await voting.registerVoter(1, voter1.address);
      await voting.registerVoter(1, voter2.address);
    });

    it("Should allow a registered voter to cast a vote", async function () {
      await expect(voting.connect(voter1).castVote(1, 1))
        .to.emit(voting, "VoteCast")
        .withArgs(1, voter1.address, 1);

      const [, hasVoted, candidateId] = await voting.getVoterStatus(1, voter1.address);
      expect(hasVoted).to.equal(true);
      expect(candidateId).to.equal(1);
    });

    it("Should not allow double voting", async function () {
      await voting.connect(voter1).castVote(1, 1);
      await expect(voting.connect(voter1).castVote(1, 2)).to.be.revertedWith(
        "You have already voted"
      );
    });

    it("Should not allow unregistered voter to vote", async function () {
      await expect(voting.connect(nonVoter).castVote(1, 1)).to.be.revertedWith(
        "You are not registered to vote in this election"
      );
    });

    it("Should not allow voting for invalid candidate", async function () {
      await expect(voting.connect(voter1).castVote(1, 99)).to.be.revertedWith(
        "Invalid candidate"
      );
    });

    it("Should update vote counts correctly", async function () {
      await voting.connect(voter1).castVote(1, 1);
      await voting.connect(voter2).castVote(1, 1);

      const [candidates, total] = await voting.getResults(1);
      expect(candidates[0].voteCount).to.equal(2);
      expect(candidates[1].voteCount).to.equal(0);
      expect(total).to.equal(2);
    });
  });

  // ─────────────────────────────────────────────
  //  Results
  // ─────────────────────────────────────────────
  describe("Results", function () {
    it("Should return correct results after voting", async function () {
      await voting.createElection("Test", "Desc", now, future);
      await voting.addCandidate(1, "Alice", "Party A", "QmHash1");
      await voting.addCandidate(1, "Bob", "Party B", "QmHash2");
      await voting.registerVoter(1, voter1.address);
      await voting.registerVoter(1, voter2.address);
      await voting.registerVoter(1, voter3.address);

      await voting.connect(voter1).castVote(1, 1);
      await voting.connect(voter2).castVote(1, 2);
      await voting.connect(voter3).castVote(1, 1);

      const [candidates, total] = await voting.getResults(1);
      expect(candidates[0].voteCount).to.equal(2); // Alice
      expect(candidates[1].voteCount).to.equal(1); // Bob
      expect(total).to.equal(3);
    });
  });

  // ─────────────────────────────────────────────
  //  Admin Transfer
  // ─────────────────────────────────────────────
  describe("Admin Transfer", function () {
    it("Should allow admin to transfer ownership", async function () {
      await voting.transferAdmin(voter1.address);
      expect(await voting.admin()).to.equal(voter1.address);
    });

    it("Should not allow non-admin to transfer ownership", async function () {
      await expect(voting.connect(voter1).transferAdmin(voter2.address)).to.be.revertedWith(
        "Only admin can perform this action"
      );
    });
  });
});
