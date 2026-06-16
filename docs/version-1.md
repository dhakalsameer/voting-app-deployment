# IT Club Election System - Version 1 Documentation

## Version

Version 1 documents the current smart contract implementation in `contracts/src/Election.sol`. Version 2 will be documented later after the next contract update.

## Purpose

The Version 1 election contract manages a student election for the IT Club. It supports admin-controlled election phases, candidate registration, voter registration, voter verification, and one complete ballot per verified voter.

Each voter casts one transaction containing:

- 1 President candidate
- 1 Secretary candidate
- 7 General Member candidates

## Contract

- Contract name: `Election`
- Solidity version: `^0.8.30`
- License: MIT
- Source file: `contracts/src/Election.sol`

## Roles

### Admin

The deployer of the contract becomes the admin. The admin can:

- Start candidate and voter registration
- Register candidates
- Verify registered voters
- Start the election
- End the election early

### Voter

A voter is a wallet address that can:

- Register during the registration phase
- Become eligible after admin verification
- Vote once during the voting phase

## Election States

The contract uses four election states:

| State | Meaning |
| --- | --- |
| `Draft` | Initial state after deployment. |
| `Registration` | Candidates and voters can be registered. |
| `Voting` | Verified voters can cast votes. |
| `Ended` | Election is closed. |

## Candidate Positions

Candidates are registered for one of three positions:

| Position | Ballot Requirement |
| --- | --- |
| `President` | Select exactly 1 |
| `Secretary` | Select exactly 1 |
| `GeneralMember` | Select exactly 7 |

## Data Model

### Candidate

Each candidate stores:

- `id`: On-chain candidate ID
- `name`: Candidate name
- `studentId`: Student identifier
- `year`: Student year
- `isFemale`: Female candidate flag
- `imageCID`: IPFS image CID
- `position`: Candidate position
- `voteCount`: Total votes received
- `exists`: Candidate existence flag

### Voter

Each voter stores:

- `registered`: Whether the wallet registered as a voter
- `verified`: Whether admin verified the voter
- `hasVoted`: Whether the voter has already cast a ballot

## Main Flow

1. Deploy the contract.
2. Admin calls `startRegistration()`.
3. Admin registers candidates with `registerCandidate(...)`.
4. Students register with `registerVoter()`.
5. Admin verifies students with `verifyVoter(address)`.
6. Admin starts voting with `startElection(durationMinutes)`.
7. Verified voters call `vote(presidentId, secretaryId, memberIds)`.
8. Admin may close the election with `endElection()`.

## Public Functions

### `startRegistration()`

Admin-only function that moves the election into the `Registration` state.

### `startElection(uint256 durationMinutes)`

Admin-only function that moves the election into the `Voting` state and sets `startTime` and `endTime`.

### `endElection()`

Admin-only function that moves the election into the `Ended` state.

### `registerCandidate(string _name, string _studentId, uint8 _year, bool _isFemale, string _imageCID, Position _position)`

Admin-only function used during registration to add a candidate.

### `registerVoter()`

Allows a wallet to register as a voter during the registration phase. A wallet cannot register twice.

### `verifyVoter(address _voter)`

Admin-only function that verifies a registered voter.

### `vote(uint256 _presidentId, uint256 _secretaryId, uint256[] calldata _memberIds)`

Allows a verified voter to vote during the voting period. The vote must include one president, one secretary, and seven unique general member candidates.

### `getCandidate(uint256 _id)`

Returns all stored details for one candidate.

### `getVoter(address _voter)`

Returns voter status for one wallet address.

## Events

| Event | Purpose |
| --- | --- |
| `CandidateRegistered` | Emitted when admin registers a candidate. |
| `VoterRegistered` | Emitted when a voter registers. |
| `VoterVerified` | Emitted when admin verifies a voter. |
| `VoteCast` | Emitted after a voter casts a full ballot. |
| `VoteUpdated` | Emitted whenever a candidate vote count increases. |
| `ElectionStarted` | Emitted when voting starts. |
| `ElectionEnded` | Emitted when the election ends. |

## Version 1 Rules and Validation

- Only admin can register candidates.
- Candidates can only be registered during `Registration`.
- Voters can only register during `Registration`.
- Only registered voters can be verified.
- Voters must be registered and verified before voting.
- A voter can vote only once.
- Voting only works in the `Voting` state and inside the configured time window.
- A ballot must include exactly seven general member IDs.
- Duplicate general member votes are rejected.
- Candidate IDs must exist and must match the required position.

## Version 1 Known Scope

- Vote counts are public on-chain values.
- Candidate data is stored on-chain, while candidate images are referenced by IPFS CID.
- The contract does not enforce minimum or maximum candidate counts before starting voting.
- The contract tracks counts per position but does not use those counts as hard limits.
- Version 2 documentation will be created after the next contract update.

## Election.sol Code - Version 1

```solidity
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
```
