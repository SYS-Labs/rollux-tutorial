//SPDX-License-Identifier: Unlicense
// This contracts runs on L1, and controls a Greeter on L2.
// The greeter address is specific to Rollux Tanenbaum.
pragma solidity ^0.8.0;

import { ICrossDomainMessenger } from 
    "@eth-optimism/contracts/libraries/bridge/ICrossDomainMessenger.sol";
    
contract FromL1_ControlL2Greeter {

    address crossDomainMessengerAddr = 0x51ac8093D762BBD17C8d898634916dAc14e1BCC1;

    address greeterL2Addr = 0x2316EEbB361d13b0BB091B7C3533079c0f2a229A;

    function setGreeting(string calldata _greeting) public {
        bytes memory message;
            
        message = abi.encodeWithSignature("setGreeting(string,address)", 
            _greeting, msg.sender);

        ICrossDomainMessenger(crossDomainMessengerAddr).sendMessage(
            greeterL2Addr,
            message,
            1000000   // within the free gas limit amount
        );
    }      // function setGreeting 

}          // contract FromL1_ControlL2Greeter
