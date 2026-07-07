// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/Election3.sol";

contract DeployElection3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        bytes32 voterRoot = vm.envOr("VOTER_MERKLE_ROOT", bytes32(0));
        bytes32 identityRoot = vm.envOr("IDENTITY_MERKLE_ROOT", bytes32(0));
        bytes32 regCodeRoot = vm.envOr("REG_CODE_MERKLE_ROOT", bytes32(0));

        vm.startBroadcast(deployerPrivateKey);

        Election3 election = new Election3(voterRoot);
        election.setIdentityMerkleRoot(identityRoot);
        election.setRegCodeMerkleRoot(regCodeRoot);

        vm.stopBroadcast();

        console2.log("Election3 deployed at:", address(election));
        console2.log("  Voter Merkle Root:", vm.toString(voterRoot));
        console2.log("  Identity Merkle Root:", vm.toString(identityRoot));
        console2.log("  Reg Code Merkle Root:", vm.toString(regCodeRoot));
        console2.log("  Admin:", election.admin());
    }
}
