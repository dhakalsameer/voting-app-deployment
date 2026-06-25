// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/Election3.sol";

contract Election3Test is Test {

    Election3 election;

    address admin = address(this);
    address student1 = address(0x1234);
    address student2 = address(0x5678);
    address student3 = address(0x9ABC);
    address student4 = address(0xDEF0);

    bytes32 voterRoot;
    bytes32 identityRoot;

    function setUp() public {
        // Single-leaf voter tree: leaf = keccak256(address(this)) == root
        voterRoot = keccak256(abi.encodePacked(student1));

        // Single-leaf identity tree for student1 (year 4 for President)
        identityRoot = keccak256(
            abi.encodePacked(student1, "Alice", uint8(4), true)
        );

        election = new Election3(voterRoot);
        election.setIdentityMerkleRoot(identityRoot);
    }

    // =========================
    // CONSTRUCTOR
    // =========================

    function testConstructor() public view {
        assertEq(election.admin(), admin);
        assertEq(uint256(election.getPhase()), uint256(Election3.Phase.Created));
        assertEq(election.voterMerkleRoot(), voterRoot);
        assertEq(election.currentElectionId(), 1);
    }

    // =========================
    // MERKLE ROOT MANAGEMENT
    // =========================

    function testSetMerkleRoot() public {
        bytes32 newRoot = bytes32(uint256(1));
        election.setMerkleRoot(newRoot);
        assertEq(election.voterMerkleRoot(), newRoot);
    }

    function testSetIdentityMerkleRoot() public {
        bytes32 newRoot = bytes32(uint256(2));
        election.setIdentityMerkleRoot(newRoot);
        assertEq(election.identityMerkleRoot(), newRoot);
    }

    function testNonAdminCannotSetMerkleRoot() public {
        vm.prank(student1);
        vm.expectRevert("Not admin");
        election.setMerkleRoot(bytes32(0));
    }

    // =========================
    // PHASE CONTROL
    // =========================

    function testStartRegistration() public {
        uint256 end = block.timestamp + 1 hours;
        election.startRegistration(end);

        assertEq(uint256(election.getPhase()), uint256(Election3.Phase.Registration));
        assertEq(election.registrationEnd(), end);
    }

    function testStartVoting() public {
        uint256 regEnd = block.timestamp + 1 hours;
        uint256 voteEnd = regEnd + 2 hours;

        election.startRegistration(regEnd);
        vm.warp(regEnd + 1);
        election.startVoting(voteEnd);

        assertEq(uint256(election.getPhase()), uint256(Election3.Phase.Voting));
        assertEq(election.votingEnd(), voteEnd);
    }

    function testEndElection() public {
        uint256 regEnd = block.timestamp + 1 hours;
        uint256 voteEnd = regEnd + 2 hours;

        election.startRegistration(regEnd);
        vm.warp(regEnd + 1);
        election.startVoting(voteEnd);
        election.endElection();

        assertEq(uint256(election.getPhase()), uint256(Election3.Phase.Ended));
    }

    function testCannotStartVotingWithoutRegistration() public {
        vm.expectRevert("Not ready");
        election.startVoting(block.timestamp + 1 hours);
    }

    function testCannotEndElectionWithoutVoting() public {
        vm.expectRevert("Not in voting");
        election.endElection();
    }

    function testNonAdminCannotStartRegistration() public {
        vm.prank(student1);
        vm.expectRevert("Not admin");
        election.startRegistration(block.timestamp + 1 hours);
    }

    // =========================
    // CANDIDATE REGISTRATION
    // =========================

    function testRegisterCandidate() public {
        uint256 regEnd = block.timestamp + 1 hours;
        election.startRegistration(regEnd);

        vm.prank(student1);
        election.registerCandidate(
            "ST-001",
            "Alice",
            4,
            true,
            "ipfs://img",
            Election3.Position.President,
            new bytes32[](0)
        );

        assertEq(election.candidateCount(), 1);

        Election3.Candidate memory c = election.getCandidate(1);
        assertEq(c.name, "Alice");
        assertEq(c.studentId, "ST-001");
        assertEq(c.year, 4);
        assertTrue(c.isFemale);
        assertEq(c.imageCID, "ipfs://img");
        assertEq(uint256(c.position), uint256(Election3.Position.President));
        assertEq(c.voteCount, 0);
        assertTrue(c.exists);
    }

    function testCannotRegisterOutsideRegistrationPhase() public {
        vm.prank(student1);
        vm.expectRevert("Wrong phase");
        election.registerCandidate(
            "ST-001", "Alice", 3, true, "ipfs://img",
            Election3.Position.President, new bytes32[](0)
        );
    }

    function testCannotRegisterAfterEnd() public {
        uint256 regEnd = block.timestamp + 1 hours;
        election.startRegistration(regEnd);

        vm.warp(regEnd + 1);

        vm.prank(student1);
        vm.expectRevert("Registration ended");
        election.registerCandidate(
            "ST-001", "Alice", 4, true, "ipfs://img",
            Election3.Position.President, new bytes32[](0)
        );
    }

    function testCannotRegisterWithInvalidProof() public {
        uint256 regEnd = block.timestamp + 1 hours;
        election.startRegistration(regEnd);

        // student2 is not in the identity tree
        vm.prank(student2);
        vm.expectRevert("Identity not verified");
        election.registerCandidate(
            "ST-002", "Bob", 3, false, "ipfs://img",
            Election3.Position.Secretary, new bytes32[](0)
        );
    }

    function testCannotRegisterTwice() public {
        uint256 regEnd = block.timestamp + 1 hours;
        election.startRegistration(regEnd);

        vm.startPrank(student1);
        election.registerCandidate(
            "ST-001", "Alice", 4, true, "ipfs://img",
            Election3.Position.President, new bytes32[](0)
        );

        vm.expectRevert("Already registered");
        election.registerCandidate(
            "ST-001", "Alice", 4, true, "ipfs://img",
            Election3.Position.Secretary, new bytes32[](0)
        );
        vm.stopPrank();
    }

    function testMultipleCandidatesCanRegister() public {
        // Build a 2-leaf identity tree
        bytes32 leaf1 = keccak256(abi.encodePacked(student1, "Alice", uint8(4), true));
        bytes32 leaf2 = keccak256(abi.encodePacked(student2, "Bob", uint8(3), false));

        bytes32 node;
        if (leaf1 < leaf2) {
            node = keccak256(abi.encodePacked(leaf1, leaf2));
        } else {
            node = keccak256(abi.encodePacked(leaf2, leaf1));
        }

        election.setIdentityMerkleRoot(node);

        uint256 regEnd = block.timestamp + 1 hours;
        election.startRegistration(regEnd);

        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;

        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = leaf1;

        vm.prank(student1);
        election.registerCandidate(
            "ST-001", "Alice", 4, true, "ipfs://img",
            Election3.Position.President, proof1
        );

        vm.prank(student2);
        election.registerCandidate(
            "ST-002", "Bob", 3, false, "ipfs://img",
            Election3.Position.Secretary, proof2
        );

        assertEq(election.candidateCount(), 2);
    }

    // =========================
    // VOTING
    // =========================

    function _setupForVoting() internal {
        // Register one candidate
        uint256 regEnd = block.timestamp + 1 hours;
        uint256 voteEnd = regEnd + 2 hours;

        election.startRegistration(regEnd);

        vm.prank(student1);
        election.registerCandidate(
            "ST-001", "Alice", 4, true, "ipfs://img",
            Election3.Position.President, new bytes32[](0)
        );

        vm.warp(regEnd + 1);
        election.startVoting(voteEnd);
        vm.warp(regEnd + 2);
    }

    function testVote() public {
        _setupForVoting();

        vm.prank(student1);
        election.vote(1, new bytes32[](0));

        Election3.Candidate memory c = election.getCandidate(1);
        assertEq(c.voteCount, 1);
        assertTrue(election.hasVoted(student1));
    }

    function testCannotVoteTwice() public {
        _setupForVoting();

        vm.startPrank(student1);
        election.vote(1, new bytes32[](0));

        vm.expectRevert("Already voted");
        election.vote(1, new bytes32[](0));
        vm.stopPrank();
    }

    function testCannotVoteForInvalidCandidate() public {
        _setupForVoting();

        vm.prank(student1);
        vm.expectRevert("Invalid candidate");
        election.vote(99, new bytes32[](0));
    }

    function testCannotVoteWithInvalidProof() public {
        _setupForVoting();

        // student2 is not in the voter tree
        vm.prank(student2);
        vm.expectRevert("Not eligible voter");
        election.vote(1, new bytes32[](0));
    }

    function testCannotVoteOutsideVotingPhase() public {
        vm.prank(student1);
        vm.expectRevert("Wrong phase");
        election.vote(1, new bytes32[](0));
    }

    // =========================
    // NEW ELECTION / HISTORY
    // =========================

    function _setupEndedElection() internal {
        // Build a 2-leaf voter tree so two people can vote
        bytes32 vLeaf1 = keccak256(abi.encodePacked(student1));
        bytes32 vLeaf2 = keccak256(abi.encodePacked(student2));
        bytes32 voterNode;
        if (vLeaf1 < vLeaf2) {
            voterNode = keccak256(abi.encodePacked(vLeaf1, vLeaf2));
        } else {
            voterNode = keccak256(abi.encodePacked(vLeaf2, vLeaf1));
        }
        election.setMerkleRoot(voterNode);

        // Build a 2-leaf identity tree
        bytes32 idLeaf1 = keccak256(abi.encodePacked(student1, "Alice", uint8(4), true));
        bytes32 idLeaf2 = keccak256(abi.encodePacked(student2, "Bob", uint8(3), false));
        bytes32 idNode;
        if (idLeaf1 < idLeaf2) {
            idNode = keccak256(abi.encodePacked(idLeaf1, idLeaf2));
        } else {
            idNode = keccak256(abi.encodePacked(idLeaf2, idLeaf1));
        }
        election.setIdentityMerkleRoot(idNode);

        uint256 regEnd = block.timestamp + 1 hours;
        uint256 voteEnd = regEnd + 2 hours;

        election.startRegistration(regEnd);

        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = idLeaf2;
        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = idLeaf1;

        vm.prank(student1);
        election.registerCandidate("ST-001", "Alice", 4, true, "ipfs://a",
            Election3.Position.President, proof1);

        vm.prank(student2);
        election.registerCandidate("ST-002", "Bob", 3, false, "ipfs://b",
            Election3.Position.Secretary, proof2);

        vm.warp(regEnd + 1);
        election.startVoting(voteEnd);
        vm.warp(regEnd + 2);

        bytes32[] memory vproof1 = new bytes32[](1);
        vproof1[0] = vLeaf2;
        bytes32[] memory vproof2 = new bytes32[](1);
        vproof2[0] = vLeaf1;

        // Both vote for candidate 1 (President)
        vm.prank(student1);
        election.vote(1, vproof1);

        vm.prank(student2);
        election.vote(1, vproof2);

        election.endElection();
    }

    function testStartNewElection() public {
        _setupEndedElection();

        uint256 oldElectionId = election.currentElectionId();
        assertEq(oldElectionId, 1);

        election.startNewElection();

        assertEq(election.currentElectionId(), 2);
        assertEq(uint256(election.getPhase()), uint256(Election3.Phase.Created));
        assertEq(election.candidateCount(), 0);
        assertEq(election.historyCount(), 1);
        assertFalse(election.hasVoted(student1));
        assertFalse(election.hasVoted(student2));

        Election3.ElectionResult memory result = election.getElectionResult(0);
        assertEq(result.presidentWinnerId, 1); // Alice won with 2 votes
        assertEq(result.secretaryWinnerId, 2); // Bob is the only secretary
        assertEq(result.generalMemberWinnerId1, 0); // No general member registered
        assertEq(result.generalMemberWinnerId2, 0);
        assertEq(result.totalCandidates, 2);
        assertTrue(result.timestamp > 0);
    }

    function testStartNewElectionResetsRegistration() public {
        _setupEndedElection();
        election.startNewElection();

        uint256 regEnd = block.timestamp + 3 hours;
        election.startRegistration(regEnd);

        // Identity tree still valid (student1 year 4, student2 year 3), so student1 can register again
        bytes32[] memory idProof = new bytes32[](1);
        idProof[0] = keccak256(abi.encodePacked(student2, "Bob", uint8(3), false));

        vm.prank(student1);
        election.registerCandidate("ST-001", "Alice", 4, true, "ipfs://a",
            Election3.Position.President, idProof);

        assertEq(election.candidateCount(), 1);
    }

    function testCannotStartNewElectionWithoutEndedPhase() public {
        vm.expectRevert("Wrong phase");
        election.startNewElection();
    }

    function testCannotStartNewElectionWithNoCandidates() public {
        election.startRegistration(block.timestamp + 1 hours);
        vm.warp(block.timestamp + 2 hours);
        election.startVoting(block.timestamp + 3 hours);
        vm.warp(block.timestamp + 4 hours);
        election.endElection();

        vm.expectRevert("No candidates");
        election.startNewElection();
    }

    function testElectionResultView() public {
        _setupEndedElection();
        election.startNewElection();

        Election3.ElectionResult memory r = election.getElectionResult(0);
        assertEq(r.presidentWinnerId, 1);
        assertEq(r.secretaryWinnerId, 2);
        assertEq(r.generalMemberWinnerId1, 0);
        assertEq(r.generalMemberWinnerId2, 0);
    }

    // =========================
    // WINNER SELECTION EDGE CASES
    // =========================

    function testWinnerTiebreakerUsesLowestId() public {
        // Build 2-leaf identity tree for 2 presidents (both year 4)
        bytes32 idLeaf1 = keccak256(abi.encodePacked(student1, "Alice", uint8(4), true));
        bytes32 idLeaf2 = keccak256(abi.encodePacked(student2, "Bob", uint8(4), false));
        bytes32 idNode;
        if (idLeaf1 < idLeaf2) {
            idNode = keccak256(abi.encodePacked(idLeaf1, idLeaf2));
        } else {
            idNode = keccak256(abi.encodePacked(idLeaf2, idLeaf1));
        }
        election.setIdentityMerkleRoot(idNode);

        uint256 regEnd = block.timestamp + 1 hours;
        election.startRegistration(regEnd);

        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = idLeaf2;
        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = idLeaf1;

        vm.prank(student1);
        election.registerCandidate("ST-001", "Alice", 4, true, "ipfs://a",
            Election3.Position.President, proof1);

        vm.prank(student2);
        election.registerCandidate("ST-002", "Bob", 4, false, "ipfs://b",
            Election3.Position.President, proof2);

        vm.warp(regEnd + 1);
        election.startVoting(block.timestamp + 2 hours);
        vm.warp(block.timestamp + 1);

        // No votes cast — both have 0 votes. Lowest ID should win.
        election.endElection();
        election.startNewElection();

        Election3.ElectionResult memory r = election.getElectionResult(0);
        assertEq(r.presidentWinnerId, 1); // Alice (ID 1) wins tie
    }
}
