// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Blockchain-Based Voting System
/// @author Advanced Voting Team
/// @notice This contract manages elections, candidates, and votes on-chain

contract Voting {
    // ─────────────────────────────────────────────
    //  Structs
    // ─────────────────────────────────────────────
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string imageHash; // IPFS hash or URL
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 candidateCount;
        uint256 totalVotes;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
        uint256 electionId;
    }

    // ─────────────────────────────────────────────
    //  State Variables
    // ─────────────────────────────────────────────
    address public admin;
    uint256 public electionCount;

    // electionId => Election
    mapping(uint256 => Election) public elections;

    // electionId => candidateId => Candidate
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;

    // electionId => voterAddress => Voter
    mapping(uint256 => mapping(address => Voter)) public voters;

    // electionId => list of candidate ids
    mapping(uint256 => uint256[]) public candidateIds;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────
    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name, string party);
    event VoterRegistered(uint256 indexed electionId, address indexed voter);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 indexed candidateId);
    event ElectionStatusChanged(uint256 indexed electionId, bool isActive);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= electionCount, "Election does not exist");
        _;
    }

    modifier electionActive(uint256 _electionId) {
        Election storage e = elections[_electionId];
        require(e.isActive, "Election is not active");
        require(block.timestamp >= e.startTime, "Election has not started yet");
        require(block.timestamp <= e.endTime, "Election has ended");
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ─────────────────────────────────────────────
    //  Admin: Election Management
    // ─────────────────────────────────────────────

    /// @notice Create a new election
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin returns (uint256) {
        require(_startTime < _endTime, "Start time must be before end time");
        require(_endTime > block.timestamp, "End time must be in the future");

        electionCount++;
        elections[electionCount] = Election({
            id: electionCount,
            title: _title,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            candidateCount: 0,
            totalVotes: 0
        });

        emit ElectionCreated(electionCount, _title, _startTime, _endTime);
        return electionCount;
    }

    /// @notice Toggle election active status
    function toggleElectionStatus(uint256 _electionId)
        external
        onlyAdmin
        electionExists(_electionId)
    {
        elections[_electionId].isActive = !elections[_electionId].isActive;
        emit ElectionStatusChanged(_electionId, elections[_electionId].isActive);
    }

    // ─────────────────────────────────────────────
    //  Admin: Candidate Management
    // ─────────────────────────────────────────────

    /// @notice Add a candidate to an election
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _party,
        string memory _imageHash
    ) external onlyAdmin electionExists(_electionId) returns (uint256) {
        elections[_electionId].candidateCount++;
        uint256 candidateId = elections[_electionId].candidateCount;

        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            party: _party,
            imageHash: _imageHash,
            voteCount: 0
        });

        candidateIds[_electionId].push(candidateId);

        emit CandidateAdded(_electionId, candidateId, _name, _party);
        return candidateId;
    }

    // ─────────────────────────────────────────────
    //  Voter Registration
    // ─────────────────────────────────────────────

    /// @notice Admin registers a voter for a specific election
    function registerVoter(uint256 _electionId, address _voter)
        external
        onlyAdmin
        electionExists(_electionId)
    {
        require(!voters[_electionId][_voter].isRegistered, "Voter already registered");
        voters[_electionId][_voter] = Voter({
            isRegistered: true,
            hasVoted: false,
            votedCandidateId: 0,
            electionId: _electionId
        });

        emit VoterRegistered(_electionId, _voter);
    }

    /// @notice Batch register multiple voters
    function batchRegisterVoters(uint256 _electionId, address[] calldata _voters)
        external
        onlyAdmin
        electionExists(_electionId)
    {
        for (uint256 i = 0; i < _voters.length; i++) {
            if (!voters[_electionId][_voters[i]].isRegistered) {
                voters[_electionId][_voters[i]] = Voter({
                    isRegistered: true,
                    hasVoted: false,
                    votedCandidateId: 0,
                    electionId: _electionId
                });
                emit VoterRegistered(_electionId, _voters[i]);
            }
        }
    }

    // ─────────────────────────────────────────────
    //  Voting
    // ─────────────────────────────────────────────

    /// @notice Cast a vote for a candidate in an election
    function castVote(uint256 _electionId, uint256 _candidateId)
        external
        electionExists(_electionId)
        electionActive(_electionId)
    {
        Voter storage voter = voters[_electionId][msg.sender];
        require(voter.isRegistered, "You are not registered to vote in this election");
        require(!voter.hasVoted, "You have already voted");
        require(
            _candidateId > 0 && _candidateId <= elections[_electionId].candidateCount,
            "Invalid candidate"
        );

        voter.hasVoted = true;
        voter.votedCandidateId = _candidateId;

        candidates[_electionId][_candidateId].voteCount++;
        elections[_electionId].totalVotes++;

        emit VoteCast(_electionId, msg.sender, _candidateId);
    }

    // ─────────────────────────────────────────────
    //  View Functions
    // ─────────────────────────────────────────────

    /// @notice Get all candidates of an election
    function getCandidates(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (Candidate[] memory)
    {
        uint256 count = elections[_electionId].candidateCount;
        Candidate[] memory result = new Candidate[](count);
        for (uint256 i = 1; i <= count; i++) {
            result[i - 1] = candidates[_electionId][i];
        }
        return result;
    }

    /// @notice Get voter status in an election
    function getVoterStatus(uint256 _electionId, address _voter)
        external
        view
        returns (bool isRegistered, bool hasVoted, uint256 votedCandidateId)
    {
        Voter storage v = voters[_electionId][_voter];
        return (v.isRegistered, v.hasVoted, v.votedCandidateId);
    }

    /// @notice Get election details
    function getElection(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (Election memory)
    {
        return elections[_electionId];
    }

    /// @notice Get all elections
    function getAllElections() external view returns (Election[] memory) {
        Election[] memory result = new Election[](electionCount);
        for (uint256 i = 1; i <= electionCount; i++) {
            result[i - 1] = elections[i];
        }
        return result;
    }

    /// @notice Get election results
    function getResults(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (Candidate[] memory, uint256 totalVotes)
    {
        uint256 count = elections[_electionId].candidateCount;
        Candidate[] memory result = new Candidate[](count);
        for (uint256 i = 1; i <= count; i++) {
            result[i - 1] = candidates[_electionId][i];
        }
        return (result, elections[_electionId].totalVotes);
    }

    /// @notice Check if an address is admin
    function isAdmin(address _addr) external view returns (bool) {
        return _addr == admin;
    }

    /// @notice Transfer admin rights
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}
