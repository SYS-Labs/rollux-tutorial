//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.13;

//console2.sol contains patches to console.sol that allow Forge to decode traces for calls to the console, but it is not compatible with Hardhat.
// import "forge-std/console.sol";
import "forge-std/console2.sol";

contract Greeter {
  string greeting;

  constructor(string memory _greeting) {
   console.log("Deploying a Greeter with greeting:", _greeting);
    greeting = _greeting;
  }

  function greet() public view returns (string memory) {
    return greeting;
  }

  function setGreeting(string memory _greeting) public {
   console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
    greeting = _greeting;
  }
}
