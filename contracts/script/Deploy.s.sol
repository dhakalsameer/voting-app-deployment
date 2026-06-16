// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/Election.sol";

contract Deploy is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        Election election = new Election();

        vm.stopBroadcast();

        console2.log("Contract deployed at:", address(election));
    }
}