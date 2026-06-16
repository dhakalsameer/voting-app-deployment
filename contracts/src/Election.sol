// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract Election {

    // ======================
    // ENUMS
    // ======================
    enum ElectionState {
        Draft,
        Registration,
        Voting,
        Ended
    }

    enum Position {
        President,
        Secretary,
        GeneralMember
    }

    // ======================
    // STRUCTS
    // ======================
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

    struct Voter {
        bool registered;
        bool verified;
        bool hasVoted;
    }

    // ======================
    // STATE
    // ======================
    address public admin;
    ElectionState public electionState;

    uint256 public candidateCount;

    uint256 public startTime;
    uint256 public endTime;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => Voter) public voters;

    // prevent duplicate candidate roles
    uint256 public presidentCount;
    uint256 public secretaryCount;
    uint256 public generalMemberCount;

    // ======================
    // EVENTS
    // ======================
    event CandidateRegistered(uint256 id, string name, Position position);
    event VoterRegistered(address voter);
    event VoterVerified(address voter);
    event VoteCast(address indexed voter, uint256 presidentId, uint256 secretaryId, uint256[] memberIds);
    event ElectionStarted(uint256 startTime, uint256 endTime);
    event ElectionEnded();

    event VoteUpdated(uint256 candidateId, uint256 newVoteCount);

    // ======================
    // MODIFIERS
    // ======================
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier inState(ElectionState _state) {
        require(electionState == _state, "Wrong state");
        _;
    }

    modifier onlyDuringVoting() {
        require(block.timestamp >= startTime, "Voting not started");
        require(block.timestamp <= endTime, "Voting ended");
        _;
    }

    // ======================
    // CONSTRUCTOR
    // ======================
    constructor() {
        admin = msg.sender;
        electionState = ElectionState.Draft;
    }

    // ======================
    // ADMIN: START REGISTRATION
    // ======================
    function startRegistration() external onlyAdmin {
        electionState = ElectionState.Registration;
    }

    // ======================
    // ADMIN: START VOTING
    // ======================
    function startElection(uint256 durationMinutes) external onlyAdmin {
        electionState = ElectionState.Voting;

        startTime = block.timestamp;
        endTime = block.timestamp + (durationMinutes * 1 minutes);

        emit ElectionStarted(startTime, endTime);
    }

    // ======================
    // ADMIN: END EARLY
    // ======================
    function endElection() external onlyAdmin {
        electionState = ElectionState.Ended;
        emit ElectionEnded();
    }

    // ======================
    // CANDIDATE REGISTRATION
    // ======================
    function registerCandidate(
        string memory _name,
        string memory _studentId,
        uint8 _year,
        bool _isFemale,
        string memory _imageCID,
        Position _position
    )
        external
        onlyAdmin
        inState(ElectionState.Registration)
    {
        candidateCount++;

        // ROLE LIMITS (IMPORTANT FIX)
        if (_position == Position.President) {
            presidentCount++;
        } else if (_position == Position.Secretary) {
            secretaryCount++;
        } else {
            generalMemberCount++;
        }

        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            studentId: _studentId,
            year: _year,
            isFemale: _isFemale,
            imageCID: _imageCID,
            position: _position,
            voteCount: 0,
            exists: true
        });

        emit CandidateRegistered(candidateCount, _name, _position);
    }

    // ======================
    // VOTER REGISTRATION
    // ======================
    function registerVoter()
        external
        inState(ElectionState.Registration)
    {
        require(!voters[msg.sender].registered, "Already registered");

        voters[msg.sender].registered = true;

        emit VoterRegistered(msg.sender);
    }

    // ======================
    // VERIFY VOTER
    // ======================
    function verifyVoter(address _voter) external onlyAdmin {
        require(voters[_voter].registered, "Not registered");

        voters[_voter].verified = true;

        emit VoterVerified(_voter);
    }

    // ======================
    // VOTING FUNCTION
    // ======================
    function vote(
        uint256 _presidentId,
        uint256 _secretaryId,
        uint256[] calldata _memberIds
    )
        external
        inState(ElectionState.Voting)
        onlyDuringVoting
    {
        Voter storage sender = voters[msg.sender];

        require(sender.registered, "Not registered");
        require(sender.verified, "Not verified");
        require(!sender.hasVoted, "Already voted");

        require(_memberIds.length == 7, "Must select 7 members");

        // prevent duplicate member votes
        for (uint256 i = 0; i < _memberIds.length; i++) {
            for (uint256 j = i + 1; j < _memberIds.length; j++) {
                require(_memberIds[i] != _memberIds[j], "Duplicate member vote");
            }
        }

        // PRESIDENT
        require(candidates[_presidentId].exists, "Invalid president");
        require(candidates[_presidentId].position == Position.President, "Not president");
        candidates[_presidentId].voteCount++;
        emit VoteUpdated(_presidentId, candidates[_presidentId].voteCount);

        // SECRETARY
        require(candidates[_secretaryId].exists, "Invalid secretary");
        require(candidates[_secretaryId].position == Position.Secretary, "Not secretary");
        candidates[_secretaryId].voteCount++;
        emit VoteUpdated(_secretaryId, candidates[_secretaryId].voteCount);

        // MEMBERS
        for (uint256 i = 0; i < 7; i++) {
            uint256 id = _memberIds[i];

            require(candidates[id].exists, "Invalid member");
            require(candidates[id].position == Position.GeneralMember, "Not member");

            candidates[id].voteCount++;
            emit VoteUpdated(id, candidates[id].voteCount);
        }

        sender.hasVoted = true;

        emit VoteCast(msg.sender, _presidentId, _secretaryId, _memberIds);
    }

    // ======================
    // VIEW FUNCTIONS
    // ======================
    function getCandidate(uint256 _id)
        external
        view
        returns (Candidate memory)
    {
        return candidates[_id];
    }

    function getVoter(address _voter)
        external
        view
        returns (Voter memory)
    {
        return voters[_voter];
    }
}