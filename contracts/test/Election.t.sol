// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/Election.sol";

contract ElectionTest is Test {

    Election election;

    address student1 = address(2);

    address admin; // will be set from contract

    // ======================
    // SETUP
    // ======================
    function setUp() public {
        election = new Election();

        // 🔥 CRITICAL: read real admin from contract
        admin = election.admin();
    }

    // ======================
    // 1. VOTER REGISTRATION
    // ======================
    function testVoterRegistration() public {

        vm.prank(admin);
        election.startRegistration();

        vm.prank(student1);
        election.registerVoter();

        Election.Voter memory v = election.getVoter(student1);

        assertTrue(v.registered);
        assertFalse(v.verified);
        assertFalse(v.hasVoted);
    }

    // ======================
    // 2. CANDIDATE REGISTRATION
    // ======================
    function testCandidateRegistration() public {

        vm.prank(admin);
        election.startRegistration();

        vm.prank(admin);
        election.registerCandidate(
            "John",
            "S001",
            3,
            true,
            "ipfs://image",
            Election.Position.President
        );

        Election.Candidate memory c = election.getCandidate(1);

        assertEq(c.name, "John");
        assertTrue(c.exists);
        assertEq(c.voteCount, 0);
    }

    // ======================
    // 3. VERIFY VOTER
    // ======================
    function testVerifyVoter() public {

        vm.prank(admin);
        election.startRegistration();

        vm.prank(student1);
        election.registerVoter();

        vm.prank(admin);
        election.verifyVoter(student1);

        Election.Voter memory v = election.getVoter(student1);

        assertTrue(v.verified);
    }

    // ======================
    // 4. FULL VOTING FLOW (BULLETPROOF)
    // ======================
    function testVoteFlow() public {

        // ======================
        // REGISTRATION PHASE (ADMIN)
        // ======================
        vm.startPrank(admin);

        election.startRegistration();

        assertEq(
            uint256(election.electionState()),
            uint256(Election.ElectionState.Registration)
        );

        election.registerCandidate("President 1", "P1", 3, true, "ipfs", Election.Position.President);
        election.registerCandidate("President 2", "P2", 3, false, "ipfs", Election.Position.President);
        election.registerCandidate("Secretary 1", "S1", 3, true, "ipfs", Election.Position.Secretary);
        election.registerCandidate("Secretary 2", "S2", 3, false, "ipfs", Election.Position.Secretary);

        for (uint256 i = 0; i < 10; i++) {
            election.registerCandidate(
                string(abi.encodePacked("Member", vm.toString(i))),
                "M",
                3,
                false,
                "ipfs",
                Election.Position.GeneralMember
            );
        }

        vm.stopPrank();

        // ======================
        // VOTER SETUP (Must happen in Registration state)
        // ======================
        vm.prank(student1);
        election.registerVoter();

        vm.prank(admin);
        election.verifyVoter(student1);

        // ======================
        // MOVE TO VOTING STATE (ADMIN)
        // ======================
        vm.prank(admin);
        election.startElection(30);

        // 🔥 HARD ASSERT (this isolates your bug instantly if it fails)
        assertEq(
            uint256(election.electionState()),
            uint256(Election.ElectionState.Voting)
        );

        // ======================
        // VOTE PHASE
        // ======================
        uint256[] memory members = new uint256[](7);

        for (uint256 i = 0; i < 7; i++) {
            members[i] = i + 5; // Candidate IDs 5 to 11 are general members
        }

        vm.prank(student1);
        election.vote(1, 3, members); // Vote for President 1 (ID 1), Secretary 1 (ID 3), and members 5-11

        // ======================
        // ASSERT RESULTS
        // ======================
        Election.Candidate memory president = election.getCandidate(1);

        assertEq(president.voteCount, 1);
    }
}