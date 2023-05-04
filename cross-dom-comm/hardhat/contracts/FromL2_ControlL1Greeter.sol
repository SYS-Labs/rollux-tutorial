//SPDX-License-Identifier: Unlicense
// This contracts runs on L2, and controls a Greeter on L1.
// The greeter address is specific to Syscoin Tanenbaum (L1).
pragma solidity ^0.8.0;

import { ICrossDomainMessenger } from 
    "@eth-optimism/contracts/libraries/bridge/ICrossDomainMessenger.sol";
    
contract FromL2_ControlL1Greeter {
    // Should be the same on all Rollux networks
    address crossDomainMessengerAddr = 0x4200000000000000000000000000000000000007;

    address greeterL1Addr = 0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD;

    function setGreeting(string calldata _greeting) public {
        bytes memory message;
            
        message = abi.encodeWithSignature("setGreeting(string,address)", 
            _greeting, msg.sender);

        ICrossDomainMessenger(crossDomainMessengerAddr).sendMessage(
            greeterL1Addr,
            message,
            1000000   // irrelevant here
        );
    }      // function setGreeting 

}          // contract FromL2_ControlL1Greeter
