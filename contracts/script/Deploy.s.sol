// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Backr} from "../src/Backr.sol";

contract DeployScript is Script {
    function run() external returns (Backr backr) {
        vm.startBroadcast();
        backr = new Backr();
        vm.stopBroadcast();

        console.log("Backr deployed at:", address(backr));
    }
}
