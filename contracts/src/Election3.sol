// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Election3 {

    // =========================
    // 📌 ENUMS
    // =========================

    enum Phase {
        Created,
        Registration,
        Voting,
        Ended
    }

    enum Position {
        President,
        Secretary,
        GeneralMember
    }

    // =========================
    // 📌 STRUCTS
    // =========================

    struct Candidate {
        uint256 id;
        string name;
        string studentId;
        uint8 year;
        bool isFemale;
        string imageCID;
        Position position;
        uint256 voteCount;
        bool exists;
    }

    uint256 public constant GENERAL_MEMBERS_ELECTED = 5;

    struct ElectionResult {
        uint256 presidentWinnerId;
        uint256 secretaryWinnerId;
        uint256[GENERAL_MEMBERS_ELECTED] generalMemberWinnerIds;
        uint256 totalCandidates;
        uint256 timestamp;
    }

    // =========================
    // 📌 STATE
    // =========================

    address public admin;
    Phase public phase;

    uint256 public registrationEnd;
    uint256 public votingEnd;

    uint256 public candidateCount;
    uint256 public currentElectionId;

    bytes32 public voterMerkleRoot;
    bytes32 public identityMerkleRoot;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => uint256) public votedInElection;
    mapping(address => uint256) public candidateRegisteredInElection;

    mapping(uint256 => ElectionResult) public electionHistory;
    uint256 public historyCount;

    // =========================
    // 📌 EVENTS
    // =========================

    event CandidateRegistered(
        uint256 indexed id,
        address indexed candidate,
        string name,
        Position position
    );
    event VoteCast(address indexed voter, uint256 candidateId);
    event PhaseChanged(Phase newPhase);
    event MerkleRootUpdated(bytes32 newRoot);
    event IdentityMerkleRootUpdated(bytes32 newRoot);
    event NewElectionStarted(uint256 indexed electionId);

    // =========================
    // 📌 MODIFIERS
    // =========================

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier inPhase(Phase _phase) {
        require(phase == _phase, "Wrong phase");
        _;
    }

    // =========================
    // 📌 CONSTRUCTOR
    // =========================

    constructor(bytes32 _merkleRoot) {
        admin = msg.sender;
        voterMerkleRoot = _merkleRoot;
        currentElectionId = 1;
        phase = Phase.Created;
    }

    // =========================
    // 📌 ADMIN: MERKLE ROOTS
    // =========================

    function setMerkleRoot(bytes32 _merkleRoot) external onlyAdmin {
        voterMerkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    function setIdentityMerkleRoot(bytes32 _root) external onlyAdmin {
        identityMerkleRoot = _root;
        emit IdentityMerkleRootUpdated(_root);
    }

    // =========================
    // 📌 ADMIN: PHASE CONTROL
    // =========================

    function startRegistration(uint256 _end) external onlyAdmin {
        require(phase == Phase.Created || phase == Phase.Ended, "Invalid phase");
        require(_end > block.timestamp, "End must be in future");
        phase = Phase.Registration;
        registrationEnd = _end;
        emit PhaseChanged(Phase.Registration);
    }

    function startVoting(uint256 _end) external onlyAdmin {
        require(phase == Phase.Registration, "Not ready");
        require(_end > block.timestamp, "End must be in future");
        phase = Phase.Voting;
        votingEnd = _end;
        emit PhaseChanged(Phase.Voting);
    }

    function endElection() external onlyAdmin {
        require(phase == Phase.Voting, "Not in voting");
        phase = Phase.Ended;
        emit PhaseChanged(Phase.Ended);
    }

    // =========================
    // 📌 USER: CANDIDATE REGISTRATION (MERKLE VERIFIED)
    // =========================

    function registerCandidate(
        string memory _guid,
        string memory _name,
        uint8 _year,
        bool _isFemale,
        string memory _imageCID,
        Position _position,
        bytes32[] calldata _proof
    )
        external
        inPhase(Phase.Registration)
    {
        require(block.timestamp <= registrationEnd, "Registration ended");
        require(
            candidateRegisteredInElection[msg.sender] != currentElectionId,
            "Already registered"
        );

        // 🔐 Verify identity using Merkle Proof (address + name + year + gender)
        bytes32 leaf = keccak256(
            abi.encodePacked(msg.sender, _name, _year, _isFemale)
        );
        require(
            MerkleProof.verify(_proof, identityMerkleRoot, leaf),
            "Identity not verified"
        );

        if (_position == Position.President) {
            require(_year == 4, "President must be 4th year");
        } else if (_position == Position.Secretary) {
            require(_year >= 3 && _year <= 4, "Secretary must be 3rd or 4th year");
        }

        candidateCount++;

        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            studentId: _guid,
            year: _year,
            isFemale: _isFemale,
            imageCID: _imageCID,
            position: _position,
            voteCount: 0,
            exists: true
        });

        candidateRegisteredInElection[msg.sender] = currentElectionId;

        emit CandidateRegistered(
            candidateCount,
            msg.sender,
            _name,
            _position
        );
    }

    // =========================
    // 📌 VOTING (MERKLE VERIFIED)
    // =========================

    function vote(uint256 _candidateId, bytes32[] calldata _proof)
        external
        inPhase(Phase.Voting)
    {
        require(block.timestamp <= votingEnd, "Voting ended");
        require(
            votedInElection[msg.sender] != currentElectionId,
            "Already voted"
        );
        require(candidates[_candidateId].exists, "Invalid candidate");

        // 🔐 Verify voter using Merkle Proof (address only)
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(_proof, voterMerkleRoot, leaf),
            "Not eligible voter"
        );

        votedInElection[msg.sender] = currentElectionId;
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId);
    }

    // =========================
    // 📌 ADMIN: START NEW ELECTION
    // =========================

    function startNewElection() external onlyAdmin inPhase(Phase.Ended) {
        require(candidateCount > 0, "No candidates");

        uint256 presWinner = _findWinner(Position.President);
        uint256 secWinner = _findWinner(Position.Secretary);

        // Count GM candidates — enforce 5-minimum and 2-female if any GMs exist
        uint256 gmCount;
        uint256 femaleGMCount;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].exists && candidates[i].position == Position.GeneralMember) {
                gmCount++;
                if (candidates[i].isFemale) femaleGMCount++;
            }
        }
        if (gmCount > 0) {
            require(gmCount >= GENERAL_MEMBERS_ELECTED, "Need at least 5 GM candidates");
            require(femaleGMCount >= 2, "Need at least 2 female GM candidates");
        }

        uint256[GENERAL_MEMBERS_ELECTED] memory gmWinners = _selectGMWinners();

        electionHistory[historyCount] = ElectionResult({
            presidentWinnerId: presWinner,
            secretaryWinnerId: secWinner,
            generalMemberWinnerIds: gmWinners,
            totalCandidates: candidateCount,
            timestamp: block.timestamp
        });
        historyCount++;

        currentElectionId++;
        candidateCount = 0;

        phase = Phase.Created;
        registrationEnd = 0;
        votingEnd = 0;

        emit NewElectionStarted(currentElectionId);
    }

    // =========================
    // 📌 INTERNAL: WINNER SELECTION
    // =========================

    function _findWinner(Position _position)
        private
        view
        returns (uint256 winnerId)
    {
        uint256 maxVotes;

        for (uint256 i = 1; i <= candidateCount; i++) {
            Candidate storage c = candidates[i];

            if (!c.exists || c.position != _position) continue;

            if (
                c.voteCount > maxVotes
                    || (
                        c.voteCount == maxVotes
                            && (winnerId == 0 || c.id < winnerId)
                    )
            ) {
                maxVotes = c.voteCount;
                winnerId = c.id;
            }
        }

        return winnerId;
    }

    function _selectGMWinners()
        private
        view
        returns (uint256[GENERAL_MEMBERS_ELECTED] memory winners)
    {
        uint256 count;

        // Pass 1: select top 2 female GM candidates
        for (uint256 f = 0; f < 2; f++) {
            uint256 bestId;
            uint256 bestVotes;
            for (uint256 i = 1; i <= candidateCount; i++) {
                Candidate storage c = candidates[i];
                if (!c.exists || c.position != Position.GeneralMember || !c.isFemale) continue;

                bool already;
                for (uint256 j = 0; j < count; j++) {
                    if (winners[j] == c.id) { already = true; break; }
                }
                if (already) continue;

                if (c.voteCount > bestVotes || (c.voteCount == bestVotes && (bestId == 0 || c.id < bestId))) {
                    bestVotes = c.voteCount;
                    bestId = c.id;
                }
            }
            if (bestId != 0) winners[count++] = bestId;
        }

        // Pass 2: select top 3 remaining GM candidates (any gender)
        for (uint256 r = 0; r < 3; r++) {
            uint256 bestId;
            uint256 bestVotes;
            for (uint256 i = 1; i <= candidateCount; i++) {
                Candidate storage c = candidates[i];
                if (!c.exists || c.position != Position.GeneralMember) continue;

                bool already;
                for (uint256 j = 0; j < count; j++) {
                    if (winners[j] == c.id) { already = true; break; }
                }
                if (already) continue;

                if (c.voteCount > bestVotes || (c.voteCount == bestVotes && (bestId == 0 || c.id < bestId))) {
                    bestVotes = c.voteCount;
                    bestId = c.id;
                }
            }
            if (bestId != 0) winners[count++] = bestId;
        }
    }

    // =========================
    // 📌 VIEW
    // =========================

    function getCandidate(uint256 _id)
        external
        view
        returns (Candidate memory)
    {
        return candidates[_id];
    }

    function getPhase() external view returns (Phase) {
        return phase;
    }

    function hasVoted(address _voter) external view returns (bool) {
        return votedInElection[_voter] == currentElectionId;
    }

    function getElectionResult(uint256 _index)
        external
        view
        returns (ElectionResult memory)
    {
        return electionHistory[_index];
    }
}
