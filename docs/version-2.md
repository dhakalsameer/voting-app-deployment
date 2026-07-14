# IT Club Election System - Version 2 Documentation

## Version

Version 2 documents the `ElectionV2` contract model. It is a simpler election design with an explicit schedule, admin voter verification, and a single-candidate ballot.

## Purpose

`ElectionV2` is designed to reduce ballot complexity and make the election lifecycle easier to manage.

It supports:

- Scheduled registration and voting windows
- Admin candidate registration
- Admin voter verification
- One vote per verified voter

## Contract

- Contract name: `ElectionV2`
- Solidity version: `^0.8.30`
- License: MIT

## Roles

### Admin

The deployer becomes the admin. The admin can:

- Set the election schedule
- Register candidates during registration
- Verify voters

### Voter

A voter is a wallet address that can:

- Be tracked in the contract
- Be verified by the admin
- Cast one vote during voting

## Election Phases

The contract uses four phases:

| Phase | Meaning |
| --- | --- |
| `Created` | Initial state after deployment. |
| `Registration` | Candidates can be added and voters can be verified. |
| `Voting` | Verified voters can cast a ballot. |
| `Ended` | Election is closed. |

## Data Model

### Candidate

Each candidate stores:

- `id`
- `name`
- `studentId`
- `position`
- `voteCount`
- `exists`

### Voter

Each voter stores:

- `registered`
- `verified`
- `hasVoted`

## Schedule

The contract stores these timestamps:

- `registrationStart`
- `registrationEnd`
- `votingStart`
- `votingEnd`

The admin sets them using `setElectionSchedule(...)`.

## Main Flow

1. Deploy the contract.
2. Admin sets the full election schedule.
3. Contract enters `Registration` when the registration window is active.
4. Admin adds candidates with `addCandidate(...)`.
5. Admin verifies voters with `verifyVoter(address)`.
6. Contract enters `Voting` when the voting window is active.
7. Verified voters cast one vote with `vote(candidateId)`.
8. Contract enters `Ended` after the voting window closes.

## Public Functions

### `setElectionSchedule(uint256 _regStart, uint256 _regEnd, uint256 _voteStart, uint256 _voteEnd)`

Stores the election timeline.

### `updatePhase()`

Updates `phase` based on `block.timestamp`.

### `addCandidate(string _name, string _studentId, Position _position)`

Adds a candidate during the registration phase.

### `verifyVoter(address _voter)`

Marks a voter as registered and verified.

### `vote(uint256 _candidateId)`

Allows one verified voter to cast a single vote.

### `getCandidate(uint256 _id)`

Returns one stored candidate.

### `getVoter(address _voter)`

Returns voter status for one wallet address.

### `getPhase()`

Returns the current election phase.

## Events

| Event | Purpose |
| --- | --- |
| `PhaseUpdated` | Emitted when the phase is refreshed. |
| `CandidateAdded` | Emitted when a candidate is registered. |
| `VoteCast` | Emitted after a vote is recorded. |

## Rules

- Only admin can add candidates.
- Candidate registration only works during registration.
- Voting only works during voting.
- A voter must be verified before voting.
- A voter can vote only once.
- Votes must target existing candidates.

