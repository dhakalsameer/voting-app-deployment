# System Flowcharts — Decentralized Voting System

## 1. Voter Registration & Verification Flow

```mermaid
flowchart TD
    A[Student visits platform] --> B{Has MetaMask installed?}
    B -->|No| C[Install MetaMask browser extension]
    C --> D[Create wallet + back up seed phrase]
    B -->|Yes| D
    D --> E[Switch MetaMask to Sepolia test network]
    E --> F[Request free SepoliaETH from faucet]
    F --> G[Click Register / Open Student Portal]
    G --> H[Enter: name, student ID, year, gender, photo]
    H --> I[Submit registration code provided by admin]
    I --> J[Set account password]
    J --> K[Connect MetaMask wallet to platform]
    K --> L[Sign message to prove wallet ownership]
    L --> M[Status changes to: Awaiting Verification]
    M --> N[Admin reviews submitted student details]
    N --> O{Does admin approve?}
    O -->|Yes| P[Student added to Merkle whitelist]
    O -->|No| Q[Application rejected — contact admin]
    P --> R[Admin submits updated Merkle root to contract]
    R --> S[Status changes to: Ready to Vote]
```

---

## 2. Ballot Casting Flow

```mermaid
flowchart TD
    A[Contract phase changes to Voting] --> B{Is voter eligible?}
    B -->|No| C[Show: You are not eligible to vote]
    B -->|Yes| D[Candidate grid is displayed]
    D --> E[Select one President candidate]
    E --> F[Select one Secretary candidate]
    F --> G[Select up to 5 General Member candidates]
    G --> H{At least 2 female GMs selected?}
    H -->|No| I[Show: Select at least 2 female candidates]
    I --> G
    H -->|Yes| J[Ballot Summary section updates]
    J --> K[Click: Cast 7 Votes button]
    K --> L[Confirmation modal opens]
    L --> M[Review all selections]
    M --> N[Click: Confirm & Submit]
    N --> O[MetaMask transaction popup appears]
    O --> P[User clicks Confirm in MetaMask]
    P --> Q{Transaction mined on blockchain?}
    Q -->|Success| R[Green toast: Vote recorded successfully]
    Q -->|Failed| S[Red toast: Transaction failed]
    R --> T[Contract emits BallotCast event]
    T --> U[Sync engine detects new event]
    U --> V[Increment vote count in database]
    V --> W[Live results updated via Socket.IO]
```

---

## 3. Election Lifecycle Flow

```mermaid
flowchart LR
    A[Phase 0: Created] -->|Admin calls startRegistration| B[Phase 1: Registration]
    B -->|Students register and get verified| C{Registration deadline reached?}
    C -->|Yes| D[Admin rebuilds Merkle trees]
    D --> E[Admin submits Merkle root hash on-chain]
    E -->|Admin calls startVoting| F[Phase 2: Voting]
    F -->|Voters cast their ballots| G{Voting deadline reached?}
    G -->|Yes| H[Admin calls endElection]
    H --> I[Phase 3: Ended]
    I --> J[Results are finalized on-chain]
    J --> K[Admin calls startNewElection]
    K --> L[Winners stored in election history]
    L --> A
```

---

## 4. Smart Contract Phase State Machine

```mermaid
flowchart TD
    Created -->|startRegistration| Registration
    Registration -->|startVoting| Voting
    Voting -->|endElection| Ended
    Ended -->|startNewElection| Created
    
    Created -.->|setMerkleRoot / setIdentityMerkleRoot| Created
    Registration -.->|registerCandidate / setMerkleRoot| Registration
    Voting -.->|castVote| Voting
```

---

## 5. Blockchain Sync Engine Data Flow

```mermaid
flowchart TD
    subgraph "Sync Engine runs every 10 seconds"
        A[fetchAndEmitOnChainEvents] --> B[Query contract event logs in batches]
        B --> C{Which event?}
        C -->|CandidateRegistered| D[Upsert candidate in PostgreSQL]
        C -->|BallotCast| E[Increment vote_count in DB]
        C -->|PhaseChanged| F[Update cached phase value]
        C -->|MerkleRootUpdated| G[Emit event to connected clients]
        C -->|NewElectionStarted| H[Snapshot previous election results]
        H --> I[Delete all rows from candidates table]
        
        J[syncAll - State Polling] --> K[Read candidateCount from contract]
        K --> L[Iterate over all candidate IDs]
        L --> M{Vote count changed?}
        M -->|Yes| N[Broadcast voteUpdate via Socket.IO]
        M -->|No| O[Skip]
        
        P[checkPhase] --> Q[Read current phase from contract]
        Q --> R{Phase transition detected?}
        R -->|Phase 3 -> 0| H
        R -->|Phase -> 2 Voting| S[Auto-rebuild Merkle trees]
    end
    
    D --> T[(PostgreSQL)]
    E --> T
    H --> U[(election_history table)]
    N --> V[Socket.IO emits to Frontend]
```

---

## 6. Winner Selection & Result Declaration Flow

```mermaid
flowchart TD
    A[Admin calls endElection] --> B[Contract phase = Ended]
    B --> C[Contract internally determines winners]
    
    C --> D[President: candidate with highest vote count in President position]
    C --> E[Secretary: candidate with highest vote count in Secretary position]
    C --> F[General Members: two-pass algorithm]
    
    F --> G[Pass 1: Select top 2 female GMs by vote count]
    G --> H[Pass 2: Select top 3 remaining GMs by vote count]
    H --> I[Total: 5 General Member winners]
    
    D --> J[Admin calls startNewElection]
    E --> J
    I --> J
    
    J --> K[Winner IDs written to electionResults mapping]
    K --> L[currentElectionId incremented by 1]
    L --> M[Phase reset back to Created]
    
    M --> N[Sync engine detects NewElectionStarted event]
    N --> O[snapshotResults function runs]
    O --> P[All candidates saved to election_history table]
    P --> Q[is_winner = true for blockchain_ids matching contract winners]
    
    Q --> R[Frontend WinnerBanner component checks /api/candidates/by-wallet]
    R --> S{Is connected wallet a winner?}
    S -->|Yes| T[Display congratulations banner with vote count]
    S -->|No| U[No banner shown]
```

---

## 7. Merkle Proof Verification Flow

```mermaid
flowchart TD
    subgraph "Off-chain Setup"
        A[Admin collects all verified voter wallet addresses]
        B[merkleService.js generates Merkle tree from addresses]
        C[Root hash extracted from tree]
        D[Admin submits root hash to contract]
    end
    
    subgraph "On-chain Voting"
        E[Voter connects wallet]
        F[Merkle proof = array of sibling hashes]
        G[Voter submits: candidate IDs + Merkle proof]
        H[Contract recomputes root: hash proof + voter address]
        I{Computed root == stored root?}
    end
    
    subgraph "Result"
        J[Vote accepted and recorded]
        K[Vote rejected]
    end
    
    A --> B --> C --> D
    C --> H
    D --> I
    E --> F --> G --> H
    H --> I
    I -->|Yes| J
    I -->|No| K
```

---

## 8. System Architecture Overview

```mermaid
flowchart TB
    subgraph "Presentation Layer"
        direction LR
        A1[Vote Page] 
        A2[Results Page]
        A3[Activity Page]
        A4[Docs Page]
    end
    
    subgraph "Application Layer"
        B1[Express REST API]
        B2[Socket.IO Server]
        B3[Sync Engine]
        B4[Merkle Service]
    end
    
    subgraph "Data Layer"
        C1[(PostgreSQL)]
        C2[(Sepolia Blockchain)]
        C3[(IPFS / Pinata)]
    end
    
    A1 -->|fetch / Socket.IO| B1
    A1 -->|ethers.js + MetaMask| C2
    A2 --> B1
    A3 --> B2
    A4 --> B1
    
    B1 --> C1
    B3 -->|poll every 10s| C2
    B3 --> C1
    B3 -->|broadcast| B2
    B4 --> C2
    
    C2 -->|events| B3
```

---

*Generated for the Decentralized Voting System — IT Club Election*
