# Appendix

## Appendix A: Version 1 and Version 2 Contracts

The complete source code and documentation for the Version 1 (`Election.sol`) and Version 2 (`ElectionV2.sol`) smart contracts are provided in separate documents:

- `docs/version-1.md` — Election.sol architecture, functions, and limitations
- `docs/version-2.md` — ElectionV2.sol architecture, functions, and limitations

These earlier versions document the iterative development process that led to the final Election3.sol contract described in this report.

---

## Appendix B: Election3.sol — Complete Smart Contract

The full source code of the final smart contract deployed on Sepolia testnet at address `0x8084eDB9D79aD595933Ac81F923AA7e7bBE2d2A6`:

File: `contracts/src/Election3.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Election3 {

    enum Phase { Created, Registration, Voting, Ended }
    enum Position { President, Secretary, GeneralMember }

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

    address public admin;
    Phase public phase;
    uint256 public registrationEnd;
    uint256 public votingEnd;
    uint256 public currentElectionId;
    bytes32 public voterMerkleRoot;
    bytes32 public identityMerkleRoot;
    bytes32 public regCodeMerkleRoot;

    mapping(uint256 => uint256) public electionCandidateCount;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(address => uint256) public votedInElection;
    mapping(address => uint256) public candidateRegisteredInElection;
    mapping(uint256 => ElectionResult) public electionHistory;
    uint256 public historyCount;

    event CandidateRegistered(uint256 indexed id, address indexed candidate, string name, Position position, string imageCID);
    event VoteCast(address indexed voter, uint256 candidateId);
    event BallotCast(address indexed voter, uint256 presId, uint256 secId, uint256[] gmIds);
    event PhaseChanged(Phase newPhase);
    event MerkleRootUpdated(bytes32 newRoot);
    event IdentityMerkleRootUpdated(bytes32 newRoot);
    event RegCodeMerkleRootUpdated(bytes32 newRoot);
    event NewElectionStarted(uint256 indexed electionId);

    modifier onlyAdmin() { require(msg.sender == admin, "Not admin"); _; }
    modifier inPhase(Phase _phase) { require(phase == _phase, "Wrong phase"); _; }

    constructor(bytes32 _merkleRoot) {
        admin = msg.sender;
        voterMerkleRoot = _merkleRoot;
        currentElectionId = 1;
        phase = Phase.Created;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyAdmin {
        require(phase <= Phase.Registration, "Root frozen during voting");
        voterMerkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    function setIdentityMerkleRoot(bytes32 _root) external onlyAdmin {
        require(phase <= Phase.Registration, "Root frozen during voting");
        identityMerkleRoot = _root;
        emit IdentityMerkleRootUpdated(_root);
    }

    function setRegCodeMerkleRoot(bytes32 _root) external onlyAdmin {
        require(phase <= Phase.Registration, "Root frozen during voting");
        regCodeMerkleRoot = _root;
        emit RegCodeMerkleRootUpdated(_root);
    }

    function verifyRegCode(string calldata studentId, string calldata code, bytes32[] calldata proof)
        external view returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(studentId, code));
        return MerkleProof.verify(proof, regCodeMerkleRoot, leaf);
    }

    function startRegistration(uint256 _end) external onlyAdmin {
        require(phase == Phase.Created, "Must start new election first");
        require(_end > block.timestamp, "End must be in future");
        emit NewElectionStarted(currentElectionId);
        phase = Phase.Registration;
        registrationEnd = _end;
        emit PhaseChanged(Phase.Registration);
    }

    function startVoting(uint256 _end) external onlyAdmin {
        require(phase == Phase.Registration, "Not ready");
        require(block.timestamp >= registrationEnd, "Registration period not over");
        require(_end > block.timestamp, "End must be in future");
        phase = Phase.Voting;
        votingEnd = _end;
        emit PhaseChanged(Phase.Voting);
    }

    function endElection() external onlyAdmin {
        require(phase == Phase.Voting, "Not in voting");
        require(block.timestamp >= votingEnd, "Voting period not over");
        phase = Phase.Ended;
        emit PhaseChanged(Phase.Ended);
    }

    function registerCandidate(
        string memory _guid, string memory _name, uint8 _year, bool _isFemale,
        string memory _imageCID, Position _position, bytes32[] calldata _proof
    ) external inPhase(Phase.Registration) {
        require(block.timestamp <= registrationEnd, "Registration ended");
        require(candidateRegisteredInElection[msg.sender] != currentElectionId, "Already registered");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _name, _year, _isFemale));
        require(MerkleProof.verify(_proof, identityMerkleRoot, leaf), "Identity not verified");

        if (_position == Position.President) require(_year == 4, "President must be 4th year");
        else if (_position == Position.Secretary) require(_year >= 3 && _year <= 4, "Secretary must be 3rd or 4th year");

        electionCandidateCount[currentElectionId]++;
        uint256 id = electionCandidateCount[currentElectionId];

        candidates[currentElectionId][id] = Candidate(id, _name, _guid, _year, _isFemale, _imageCID, _position, 0, true);
        candidateRegisteredInElection[msg.sender] = currentElectionId;
        emit CandidateRegistered(id, msg.sender, _name, _position, _imageCID);
    }

    function castVote(
        uint256 _presidentId, uint256 _secretaryId, uint256[] calldata _gmIds, bytes32[] calldata _proof
    ) external inPhase(Phase.Voting) {
        require(block.timestamp <= votingEnd, "Voting ended");
        require(votedInElection[msg.sender] != currentElectionId, "Already voted");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_proof, voterMerkleRoot, leaf), "Not eligible voter");

        uint256 votedCount;
        if (_presidentId > 0) {
            Candidate storage pres = candidates[currentElectionId][_presidentId];
            require(pres.exists && pres.position == Position.President, "Invalid president");
            pres.voteCount++; emit VoteCast(msg.sender, _presidentId); votedCount++;
        }
        if (_secretaryId > 0) {
            Candidate storage sec = candidates[currentElectionId][_secretaryId];
            require(sec.exists && sec.position == Position.Secretary, "Invalid secretary");
            sec.voteCount++; emit VoteCast(msg.sender, _secretaryId); votedCount++;
        }

        require(_gmIds.length <= GENERAL_MEMBERS_ELECTED, "Too many GM votes");
        uint256 femaleCount;
        for (uint256 i = 0; i < _gmIds.length; i++) {
            uint256 gid = _gmIds[i]; require(gid > 0, "Invalid GM ID");
            Candidate storage gm = candidates[currentElectionId][gid];
            require(gm.exists && gm.position == Position.GeneralMember, "Invalid GM");
            if (gm.isFemale) femaleCount++;
            gm.voteCount++; emit VoteCast(msg.sender, gid); votedCount++;
        }
        if (_gmIds.length > 0) require(femaleCount >= 2, "Need at least 2 female GM votes");
        require(votedCount > 0, "No candidates selected");

        votedInElection[msg.sender] = currentElectionId;
        emit BallotCast(msg.sender, _presidentId, _secretaryId, _gmIds);
    }

    function startNewElection() external onlyAdmin inPhase(Phase.Ended) {
        require(electionCandidateCount[currentElectionId] > 0, "No candidates");

        uint256 presWinner = _findWinner(Position.President);
        uint256 secWinner = _findWinner(Position.Secretary);

        uint256 gmCount; uint256 femaleGMCount;
        uint256 ec = electionCandidateCount[currentElectionId];
        for (uint256 i = 1; i <= ec; i++) {
            if (candidates[currentElectionId][i].exists && candidates[currentElectionId][i].position == Position.GeneralMember) {
                gmCount++;
                if (candidates[currentElectionId][i].isFemale) femaleGMCount++;
            }
        }
        if (gmCount > 0) {
            require(gmCount >= GENERAL_MEMBERS_ELECTED, "Need at least 5 GM candidates");
            require(femaleGMCount >= 2, "Need at least 2 female GM candidates");
        }

        uint256[GENERAL_MEMBERS_ELECTED] memory gmWinners = _selectGMWinners();

        electionHistory[historyCount] = ElectionResult(presWinner, secWinner, gmWinners, ec, block.timestamp);
        historyCount++;
        currentElectionId++;
        phase = Phase.Created;
        registrationEnd = 0; votingEnd = 0;
        emit NewElectionStarted(currentElectionId);
    }

    function _findWinner(Position _position) private view returns (uint256 winnerId) {
        uint256 maxVotes;
        uint256 ec = electionCandidateCount[currentElectionId];
        for (uint256 i = 1; i <= ec; i++) {
            Candidate storage c = candidates[currentElectionId][i];
            if (!c.exists || c.position != _position) continue;
            if (c.voteCount > maxVotes || (c.voteCount == maxVotes && (winnerId == 0 || c.id < winnerId))) {
                maxVotes = c.voteCount; winnerId = c.id;
            }
        }
    }

    function _selectGMWinners() private view returns (uint256[GENERAL_MEMBERS_ELECTED] memory winners) {
        uint256 count; uint256 ec = electionCandidateCount[currentElectionId];

        for (uint256 f = 0; f < 2; f++) {
            uint256 bestId; uint256 bestVotes;
            for (uint256 i = 1; i <= ec; i++) {
                Candidate storage c = candidates[currentElectionId][i];
                if (!c.exists || c.position != Position.GeneralMember || !c.isFemale) continue;
                bool already; for (uint256 j = 0; j < count; j++) { if (winners[j] == c.id) { already = true; break; } }
                if (already) continue;
                if (c.voteCount > bestVotes || (c.voteCount == bestVotes && (bestId == 0 || c.id < bestId))) {
                    bestVotes = c.voteCount; bestId = c.id;
                }
            }
            if (bestId != 0) winners[count++] = bestId;
        }

        for (uint256 r = 0; r < 3; r++) {
            uint256 bestId; uint256 bestVotes;
            for (uint256 i = 1; i <= ec; i++) {
                Candidate storage c = candidates[currentElectionId][i];
                if (!c.exists || c.position != Position.GeneralMember) continue;
                bool already; for (uint256 j = 0; j < count; j++) { if (winners[j] == c.id) { already = true; break; } }
                if (already) continue;
                if (c.voteCount > bestVotes || (c.voteCount == bestVotes && (bestId == 0 || c.id < bestId))) {
                    bestVotes = c.voteCount; bestId = c.id;
                }
            }
            if (bestId != 0) winners[count++] = bestId;
        }
    }

    function getCandidate(uint256 _id) external view returns (Candidate memory) { return candidates[currentElectionId][_id]; }
    function getHistoricalCandidate(uint256 _electionId, uint256 _candidateId) external view returns (Candidate memory) { return candidates[_electionId][_candidateId]; }
    function candidateCount() external view returns (uint256) { return electionCandidateCount[currentElectionId]; }
    function getPhase() external view returns (Phase) { return phase; }
    function hasVoted(address _voter) external view returns (bool) { return votedInElection[_voter] == currentElectionId; }
    function getElectionResult(uint256 _index) external view returns (ElectionResult memory) { return electionHistory[_index]; }
}
```

---

## Appendix C: Key Backend Services

### C.1 Merkle Service

The Merkle service manages three distinct Merkle trees: voter eligibility (address-only leaves), identity verification (address + name + year + gender leaves), and registration codes (student ID + code leaves).

File: `backend/src/services/merkleService.js`

```javascript
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";

export function generateMerkleRoot(wallets) {
  if (!wallets || wallets.length === 0) return ethers.ZeroHash;
  const leaves = wallets.map(addr =>
    keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(addr)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}

export function generateMerkleProof(allWallets, targetWallet) {
  const leaves = allWallets.map(addr =>
    keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(addr)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(targetWallet)]));
  return tree.getHexProof(leaf);
}

export function generateIdentityMerkleRoot(identities) {
  if (!identities || identities.length === 0) return ethers.ZeroHash;
  const leaves = identities.map(id =>
    keccak256(ethers.solidityPacked(["address", "string", "uint8", "bool"],
      [ethers.getAddress(id.address), id.name, id.year, id.isFemale]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}

export function generateIdentityMerkleProof(allIdentities, targetIdentity) {
  const leaves = allIdentities.map(id =>
    keccak256(ethers.solidityPacked(["address", "string", "uint8", "bool"],
      [ethers.getAddress(id.address), id.name, id.year, id.isFemale]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(ethers.solidityPacked(["address", "string", "uint8", "bool"],
    [ethers.getAddress(targetIdentity.address), targetIdentity.name, targetIdentity.year, targetIdentity.isFemale]));
  return tree.getHexProof(leaf);
}

function normalizeCode(code) { return code.replace(/-/g, "").toUpperCase(); }

export function generateRegCodeMerkleRoot(regCodes) {
  if (!regCodes || regCodes.length === 0) return ethers.ZeroHash;
  const leaves = regCodes.map(({ student_id, code }) =>
    keccak256(ethers.solidityPacked(["string", "string"], [student_id, normalizeCode(code)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}

export function generateRegCodeMerkleProof(allRegCodes, targetStudentId, targetCode) {
  const leaves = allRegCodes.map(({ student_id, code }) =>
    keccak256(ethers.solidityPacked(["string", "string"], [student_id, normalizeCode(code)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(ethers.solidityPacked(["string", "string"], [targetStudentId, normalizeCode(targetCode)]));
  return tree.getHexProof(leaf);
}
```

### C.2 Sync Engine (Core Poll Loop)

The sync engine polls Sepolia every 10 seconds, fetches on-chain events in batched queries, deduplicates by transaction hash and log index, persists to PostgreSQL, and broadcasts via Socket.IO.

File: `backend/src/blockchain/sync.js` (abbreviated — full file is 671 lines)

```javascript
const POLL_MS = 10000;
const MAX_BLOCK_RANGE = 10;
const processedKeys = new Set();
let lastProcessedBlock = 0;

export function startBlockchainSync(io) {
  let prevVotes = {}, prevPhase = null, prevElectionId = 0;
  let minCandidateId = 1, snapshotInProgress = false;

  async function queryLogsBatched(filter, fromBlock, toBlock) {
    const allLogs = [];
    for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
      const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlock);
      try {
        const logs = await electionContractV3.queryFilter(filter, start, end);
        allLogs.push(...logs);
      } catch (err) { /* skip failed ranges */ }
    }
    return allLogs;
  }

  async function fetchAndEmitOnChainEvents() {
    const currentBlock = await provider.getBlockNumber();
    if (currentBlock <= lastProcessedBlock) return;

    // Fetch and process CandidateRegistered, VoteCast, PhaseChanged,
    // NewElectionStarted, MerkleRootUpdated events
    // Each event: dedup → persist → emit via Socket.IO
  }

  async function syncAll() {
    await fetchAndEmitOnChainEvents();
    // Poll-based candidate/vote detection as fallback
    for (let i = minCandidateId; i <= candidateCount; i++) {
      const cand = await electionContractV3.getCandidate(i);
      if (!cand.exists) continue;
      // Upsert candidate, detect vote changes, broadcast
    }
  }

  async function checkPhase() {
    const phase = await electionContractV3.getPhase();
    // Detect transitions: snapshot on end, rebuild Merkle on voting start
  }

  setInterval(syncAll, POLL_MS);
  setInterval(checkPhase, POLL_MS);
}
```

---

## Appendix D: Database Schema

### D.1 students

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `student_id` | TEXT | PRIMARY KEY | University-assigned ID |
| `name` | TEXT | NOT NULL | Full name |
| `wallet_address` | TEXT | UNIQUE | MetaMask address |
| `year` | TEXT | | Academic year |
| `gender` | TEXT | | Gender |
| `email` | TEXT | | Email for code distribution |
| `password_hash` | TEXT | | bcrypt hash |
| `image_cid` | TEXT | | IPFS CID of profile photo |
| `eligible_to_vote` | BOOLEAN | DEFAULT false | Admin verification flag |
| `wallet_verified` | BOOLEAN | DEFAULT false | Wallet signature verified |
| `registered` | BOOLEAN | DEFAULT false | Portal registration complete |
| `created_at` | TIMESTAMP | | Auto-generated |
| `updated_at` | TIMESTAMP | | Auto-generated |

### D.2 registration_codes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment |
| `student_id` | TEXT | FOREIGN KEY → students | Linked student |
| `code` | TEXT | UNIQUE | XXXX-XXXX-XXXX format |
| `used` | BOOLEAN | DEFAULT false | Whether code was consumed |
| `used_at` | TIMESTAMP | | When code was used |
| `email` | TEXT | | Delivery email |

### D.3 candidates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment |
| `blockchain_id` | INT | UNIQUE | On-chain candidate ID |
| `name` | TEXT | | Candidate name |
| `position` | TEXT | | President/Secretary/General Member |
| `vote_count` | INT | DEFAULT 0 | Current vote tally |
| `year` | TEXT | | Academic year |
| `gender` | TEXT | | Gender |
| `image_cid` | TEXT | | Profile photo CID |
| `status` | TEXT | | approved/pending/rejected |
| `wallet_address` | TEXT | | Linked wallet |

### D.4 election_history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment |
| `election_number` | INT | | Which election |
| `candidate_name` | TEXT | | Name |
| `candidate_position` | TEXT | | Position |
| `vote_count` | INT | | Final votes |
| `blockchain_id` | INT | UNIQUE | On-chain ID |
| `is_winner` | BOOLEAN | | Winner flag |
| `wallet_address` | TEXT | | Linked wallet |

### D.5 events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment |
| `event_name` | TEXT | | CandidateRegistered, VoteCast, etc. |
| `tx_hash` | TEXT | | Transaction hash |
| `block_number` | INT | | Block number |
| `from_address` | TEXT | | Sender address |
| `election_id` | INT | | Election context |
| `args` | JSONB | | Event arguments |
| `timestamp` | TIMESTAMPTZ | | Recorded at |

### D.6 distribution_log

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment |
| `student_id` | TEXT | | Recipient |
| `wallet_address` | TEXT | | Destination wallet |
| `amount_eth` | TEXT | | Amount in ETH |
| `tx_hash` | TEXT | | Distribution tx |
| `status` | TEXT | | pending/sent/failed |

---

## Appendix E: Frontend Key Components

### E.1 AuthContext (State Management)

File: `election-frontend/src/context/AuthContext.jsx`

```javascript
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [student, setStudent] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voterStatus, setVoterStatus] = useState(null);
  const [provider, setProvider] = useState(null);

  async function connectWallet() {
    if (!window.ethereum) { alert("MetaMask not found!"); return; }
    const accounts = await provider.send("eth_requestAccounts", []);
    setWallet(ethers.getAddress(accounts[0]));
    await checkVoterStatus(accounts[0]);
  }

  async function checkVoterStatus(address) {
    const admin = await contract.admin();
    setIsAdmin(address.toLowerCase() === admin.toLowerCase());
    const res = await fetch(`/api/voters/me?wallet=${address}`);
    setVoterStatus(await res.json());
  }

  return (
    <AuthContext.Provider value={{ wallet, student, isAdmin, voterStatus, connectWallet, disconnectWallet }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### E.2 Vote Casting Flow

File: `election-frontend/src/components/VotingPanelV3.jsx` (abbreviated)

```javascript
async function handleCastVote() {
  const res = await fetch(`/api/voters/proof?wallet=${wallet}`);
  const { proof } = await res.json();

  const tx = await contract.castVote(
    selectedPresident || 0,
    selectedSecretary || 0,
    selectedGMs.map(gm => gm.id),
    proof
  );
  await tx.wait();
  toast.success("Vote cast successfully!");
}
```
