# Communication between contracts on Rollux and Syscoin

[![Discord](https://img.shields.io/discord/1087373765014454322)](https://discord.gg/rollux)
[![Twitter Follow](https://img.shields.io/twitter/follow/RolluxL2?style=social)](https://twitter.com/RolluxL2)

This tutorial teaches you how to do interlayer communication.
You will learn how to run a contract on Syscoin NEVM that runs another contract on Rollux, and also how to run a contract on Rollux that calls a contract on Syscoin NEVM.

[You can read more details about this process here](https://community.rollux.com/docs/developers/bridge/messaging/).

This tutorial focuses on sending and receiving messages.
If you want to trace transactions, [see the tracing tutorial](../sdk-trace-tx/).


**Note:** This tutorial is for the Bedrock release, which is currently running on the Rollux Tanenbaum test network.

## Seeing it in action

To show how this works we installed [a slightly modified version of HardHat's `Greeter.sol`](hardhat/contracts/Greeter.sol) on both Syscoin Tanenbaum and Rollux Tanenbaum.


| Network | Greeter address  |
| ------- | ---------------- |
| Syscoin Tanenbaum (L1) | [0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD](https://tanenbaum.io/address/0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD) |
| Rollux Tanenbaum (L2) | [0x2316EEbB361d13b0BB091B7C3533079c0f2a229A](https://rollux.tanenbaum.io/address/0x2316EEbB361d13b0BB091B7C3533079c0f2a229A) |

#### What if somebody else uses the same contracts at the same time?

If somebody else uses these contracts while you are going through the tutorial, they might update the greeting after you.
In that case you'll see the wrong greeting when you call the `Greeter` contract.
However, you can still verify your controller works in one of these ways:

- Find the transaction on either [Syscoin Tanenbaum Blockscout](https://tanenbaum.io/address/0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD/internal-transactions#address-tabs) or [Rollux Tanenbaum Blockscout](https://rollux.tanenbaum.io/address/0x2316EEbB361d13b0BB091B7C3533079c0f2a229A/internal-transactions#address-tabs).
  In either case, it will be an internal transaction because the contract called directly is the cross domain messenger.
- Just try again.


### Hardhat

This is how you can see communication between domains work in hardhat.

#### Setup

This setup assumes you already have [Node.js](https://nodejs.org/en/) and [yarn](https://classic.yarnpkg.com/) installed on your system.

1. Copy `.env.example` to `.env` and edit it:

   1. Set `MNEMONIC` to point to an account that has SYS on the Tanenbaum test network and the Rollux Tanenbaum test network.
   1. Set `SYSCOIN_TANENBAUM_URL` to the URL of your Syscoin NEVM RPC provider.
   1. Set `ROLLUX_TANENBAUM_URL` to the URL of your Rollux RPC provider.

1. Install the necessary packages.

   ```sh
   yarn
   ```

#### Syscoin message to Rollux (deposit)

1. Connect the Hardhat console to Rollux Tanenbaum (L2):

   ```sh
   yarn hardhat console --network rollux_tanenbaum
   ```

1. Connect to the greeter on L2:

   ```js
   Greeter = await ethers.getContractFactory("Greeter")
   greeter = await Greeter.attach("0x2316EEbB361d13b0BB091B7C3533079c0f2a229A")
   await greeter.greet()
   ```


1. In a separatate terminal window connect the Hardhat console to Syscoin Tanenbaum (L1):

   ```sh
   yarn hardhat console --network syscoin_tanenbaum
   ```

1. Connect and call the `FromL1_ControlL2Greeter` contract.

   ```js
   Controller = await ethers.getContractFactory("FromL1_ControlL2Greeter")
   controller = await Controller.attach("0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD")
   tx = await controller.setGreeting(`Hardhat hello from L1 ${Date()}`)
   rcpt = await tx.wait()
   ```

1. Make a note of the address of the L1 controller.

   ```js
   controller.address
   ```

1. Back in the L2 console, see the new greeting.
   Note that it may take a few minutes to update after the transaction is processed on L1.

   ```js
   await greeter.greet()
   ```

1. In the block explorer, [view the event log](https://rollux.tanenbaum.io/address/0x2316EEbB361d13b0BB091B7C3533079c0f2a229A/logs#address-tabs).
   Notice that the `xorigin` value is the controller address.
   The `user` value is your user's address, but that one is provided as part of the message.

#### Rollux message to Syscoin (withdrawal)

##### Send the message

1. Get the current L1 greeting. There are two ways to do that:

   - [Browse to the Greeter contract on Syscoin Tanenbaum Blockscout](https://tanenbaum.io/address/0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD/read-contract#address-tabs) to see the current greeting.

   - Run these commands in the Hardhat console connected to Syscoin Tanenbaum (L1):

     ```js
     Greeter = await ethers.getContractFactory("Greeter")
     greeter = await Greeter.attach("0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD")
     await greeter.greet()
     ```

1. Connect the Hardhat console to Rollux Tanenbaum (L2):

   ```sh
   yarn hardhat console --network rollux_tanenbaum
   ```

1. Connect and call the `FromL2_ControlL1Greeter` contract.

   ```js
   Controller = await ethers.getContractFactory("FromL2_ControlL1Greeter")
   controller = await Controller.attach("0x2316EEbB361d13b0BB091B7C3533079c0f2a229A")
   tx = await controller.setGreeting(`Hardhat hello from L2 ${Date()}`)
   rcpt = await tx.wait()
   ```

1. Make a note of the address of `FromL2_ControlL1Greeter`.

   ```js
   controller.address
   ```

1. Keep a copy of the transaction hash.

   ```js
   tx.hash
   ```

##### Submit the Merkle proof

Once the state root is published on L1, we can present the [Merkle proof](https://medium.com/crypto-0-nite/merkle-proofs-explained-6dd429623dc5) for the withdrawal.
The fault challenge window starts after you do this, so it's best to do it as early as possible. [You can read more about this in the documentation](https://community.rollux.com/docs/developers/bedrock/how-is-bedrock-different/#two-phase-withdrawals).

1. Connect the Hardhat console to Syscoin Tanenbaum (L1):

   ```sh
   yarn hardhat console --network syscoin_tanenbaum
   ```

1. Get the SDK (it is already in `node_modules`).

   ```js
   sdk = require("@eth-optimism/sdk")
   ```
1. Get the Syscoin Networks library.

   ```
   syscoinNetworks = require('syscoin-networks')
   ```

1. Configure a `CrossChainMessenger` object:

   ```js
   l1ChainId = 5700
   l2ChainId = 57000
   l1Network = syscoinNetworks.getNetworkByChainId(l1ChainId, syscoinNetworks.networks)
   l2Network = syscoinNetworks.getNetworkByChainId(l2ChainId, syscoinNetworks.networks)
   l1Signer = await ethers.getSigner()
   l2Url = `https://rpc-tanenbaum.rollux.com`
   crossChainMessenger = new sdk.CrossChainMessenger({
      l1ChainId: l1ChainId,
      l2ChainId: l2ChainId,
      l1SignerOrProvider: l1Signer,
      l2SignerOrProvider: new ethers.providers.JsonRpcProvider(l2Url),
      bedrock: true,
      contracts: { l1: l1Network.contracts, l2: l2Network.contracts },
      bridges: {
         ETH: {
            Adapter: sdk.ETHBridgeAdapter,
            l1Bridge: l1Network.contracts.L1StandardBridge,
            l2Bridge: l2Network.contracts.L2StandardBridge,
         },
         Standard: {
            Adapter: sdk.StandardBridgeAdapter,
            l1Bridge:
               l1Network.contracts.L1StandardBridge,
            l2Bridge: l2Network.contracts.L2StandardBridge,
         }
      }
   })
   ```

1. Check the status of the transaction.
   If it is `false`, wait a few seconds and try again.
   When the state root is updated, you'll see a new transaction [on the L2OutputOracle contract on L1](https://tanenbaum.io/address/0x63D297aa3feCbf6eEdE0aCd15B0308B9C8379afb).
   This usually happens every four minutes.

   ```js
   hash = '<<< tx.hash from L2 >>>''
   (await crossChainMessenger.getMessageStatus(hash)) == sdk.MessageStatus.READY_TO_PROVE
   ```

   `await crossChainMessenger.getMessageStatus(hash)` can return two values at this stage:

   - `sdk.MessageStatus.STATE_ROOT_NOT_PUBLISHED` (2): The state root has not been published yet.
   You need to wait until it is published.

   - `sdk.MessageStatus.READY_TO_PROVE` (3): Ready for the next step

1. Send the proof on L1:

   ```js
   tx = await crossChainMessenger.proveMessage(hash)
   rcpt = await tx.wait()
   ```


##### Receive the message

Transactions from Rollux to Syscoin are not accepted immediately, because we need to wait [to make sure there are no successful challenges](https://community.rollux.com/docs/how-rollux-works/#fault-proofs).
Once the fault challenge period is over (ten seconds on Rollux Tanenbaum, seven days on the production network) it is necessary to claim the transaction on L1.
This is a complex process that requires a [Merkle proof](https://medium.com/crypto-0-nite/merkle-proofs-explained-6dd429623dc5).
You can do it using [the Optimism SDK](https://www.npmjs.com/package/@eth-optimism/sdk).



1. Check the status of the transaction.
   If it is `false`, wait a few seconds and try again.

   ```js
   (await crossChainMessenger.getMessageStatus(hash)) == sdk.MessageStatus.READY_FOR_RELAY
   ```

   `await crossChainMessenger.getMessageStatus(hash)` can return two values at this stage:

   - `sdk.MessageStatus.IN_CHALLENGE_PERIOD` (4): Still in the challenge period, wait a few seconds.

   - `sdk.MessageStatus.READY_FOR_RELAY` (5): Ready to finalize the message.
     Go on to the next step.


1. Finalize the message.

   ```js
   tx = await crossChainMessenger.finalizeMessage(hash)
   rcpt = await tx.wait()
   ```

1. Get the new L1 greeting. There are two ways to do that:

   ```js
   Greeter = await ethers.getContractFactory("Greeter")
   greeter = await Greeter.attach("0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD")
   await greeter.greet()
   ```


### Foundry

[Foundry](https://book.getfoundry.sh/) is a comprehensive smart contract development toolchain. Before proceeding with the following steps, ensure that you have installed Foundry by following their [installation guide](https://book.getfoundry.sh/getting-started/installation).

#### Setup

1. Install the `@eth-optimims/sdk` library (assuming you already have Node.js and yarn):

   ```sh
   cd foundry/lib
   yarn
   ```

1. Create environment variables for the URLs for the Syscoin Tanenbaum and Rollux Tanenbaum applications:

   ```sh
   cd ..
   export SYSCOIN_TANENBAUM_URL= ...
   export ROLLUX_TANENBAUM_URL= ...
   ```

1. Create environment variables for the Greeter contracts' addresses

   ```sh
   export GREETER_L1=0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD
   export GREETER_L2=0x2316EEbB361d13b0BB091B7C3533079c0f2a229A
   ```

1. Put your account mnemonic in the file `mnem.delme`.


#### Syscoin message to Rollux (deposit)

1. See the current greeting.

   ```sh
   cast call --rpc-url $ROLLUX_TANENBAUM_URL $GREETER_L2 "greet()"  | cast --to-ascii
   ```

1. Deploy the `FromL1_ControlL2Greeter` contract.

   ```sh
   forge create FromL1_ControlL2Greeter --rpc-url $SYSCOIN_TANENBAUM_URL --mnemonic-path mnem.delme
   ```

1. Create an environment variable for the `Deployed to:` address:

   ```sh
   export FROM_L1_CONTROLLER= << address >>
   ```

1. Send a transaction to change the L2 greeting:

   ```sh
   cast send --rpc-url $SYSCOIN_TANENBAUM_URL \
      --mnemonic-path mnem.delme \
      $FROM_L1_CONTROLLER "setGreeting(string)" '"Foundry hello from L1"'
   ```

1. See the greeting has changed. Note that the change might take a few minutes to propagate.

   ```sh
   cast call --rpc-url $ROLLUX_TANENBAUM_URL $GREETER_L2 "greet()"  | cast --to-ascii
   ```

1. In the block explorer, [view the event log](https://rollux.tanenbaum.io/address/0x2316EEbB361d13b0BB091B7C3533079c0f2a229A#events).
   Notice that the `xorigin` value is the controller address.
   The `user` value is your user's address, but that one is provided as part of the message.

#### Rollux message to Syscoin (withdrawal)

##### Send the message

1. See the current greeting.

   ```sh
   cast call --rpc-url $SYSCOIN_TANENBAUM_URL $GREETER_L1 "greet()"  | cast --to-ascii
   ```

1. Deploy the `FromL2_ControlL1Greeter` contract.

   ```sh
   forge create FromL2_ControlL1Greeter --rpc-url $ROLLUX_TANENBAUM_URL --mnemonic-path mnem.delme
   ```

1. Create an environment variable for the `Deployed to:` address:

   ```sh
   export FROM_L2_CONTROLLER= << address >>
   ```

1. Send a transaction to change the L1 greeting:

   ```sh
   cast send --rpc-url $ROLLUX_TANENBAUM_URL \
      --mnemonic-path mnem.delme $FROM_L2_CONTROLLER \
      "setGreeting(string)" '"Foundry hello from L2"'
   ```

1. Create an environment variable for the transaction hash:

   ```sh
   export HASH= << transaction hash >>
   ```

##### Receive the message


1. Run `node`, the JavaScript command line.

   ```sh
   cd lib
   node
   ```

1. Get the SDK and the Ethers libraries (they are already in `node_modules`).

   ```js
   sdk = require("@eth-optimism/sdk")
   ethers = require("ethers")
   ```

1. Get the Syscoin Networks library.

   ```
   syscoinNetworks = require('syscoin-networks')
   ```

1. Configure a `CrossChainMessenger` object:

   ```js
   l1ChainId = 5700
   l2ChainId = 57000
   l1Network = syscoinNetworks.getNetworkByChainId(l1ChainId, syscoinNetworks.networks)
   l2Network = syscoinNetworks.getNetworkByChainId(l2ChainId, syscoinNetworks.networks)
   l1Provider = new ethers.providers.JsonRpcProvider(process.env.SYSCOIN_TANENBAUM_URL)
   mnemonic = fs.readFileSync("../mnem.delme").toString()
   wallet = ethers.Wallet.fromMnemonic(mnemonic.slice(0,-1))
   l1Signer = wallet.connect(l1Provider)
   l2Provider = new ethers.providers.JsonRpcProvider(process.env.ROLLUX_TANENBAUM_URL)
   crossChainMessenger = new sdk.CrossChainMessenger({
      l1ChainId: l1ChainId,
      l2ChainId: l2ChainId,
      l1SignerOrProvider: l1Signer,
      l2SignerOrProvider: l2Provider,
      bedrock: true,
      contracts: { l1: l1Network.contracts, l2: l2Network.contracts },
      bridges: {
         ETH: {
            Adapter: sdk.ETHBridgeAdapter,
            l1Bridge: l1Network.contracts.L1StandardBridge,
            l2Bridge: l2Network.contracts.L2StandardBridge,
         },
         Standard: {
            Adapter: sdk.StandardBridgeAdapter,
            l1Bridge:
               l1Network.contracts.L1StandardBridge,
            l2Bridge: l2Network.contracts.L2StandardBridge,
         }
      }
   })
   ```

1. Check the status of the transaction.
   If it is `false`, wait a few seconds and try again.
   When the state root is updated, you'll see a new transaction [on the L2OutputOracle contract on L1](https://tanenbaum.io/address/0x63D297aa3feCbf6eEdE0aCd15B0308B9C8379afb).
   This usually happens every four minutes.

   ```js
   await crossChainMessenger.getMessageStatus(process.env.HASH).then(status => console.log(status === sdk.MessageStatus.READY_TO_PROVE))
   ```

   `await crossChainMessenger.getMessageStatus(process.env.HASH)` can return two values at this stage:

   - `sdk.MessageStatus.STATE_ROOT_NOT_PUBLISHED` (2): The state root has not been published yet.
   You need to wait until it is published.

   - `sdk.MessageStatus.READY_TO_PROVE` (3): Ready for the next step

1. Send the proof on L1:

   ```js
   txPromise = crossChainMessenger.proveMessage(process.env.HASH)
   txPromise.then(tx => console.log(tx.hash))
   ```

1. Now that the message has been proven, we need to wait the fault challenge period until it is ready to relay.

   ```js
   statusPromise = crossChainMessenger.getMessageStatus(process.env.HASH)
   statusPromise.then(status => console.log(status === sdk.MessageStatus.READY_FOR_RELAY))
   ```

   `crossChainMessenger.getMessageStatus(process.env.HASH)` can return several values at this stage:

   - `sdk.MessageStatus.READY_TO_PROVE` (3): The proof transaction hasn't been processed yet.
     Go to [Syscoin Tanenbaum Blockscout](https://tanenbaum.io/) and search for the hash.

   - `sdk.MessageStatus.IN_CHALLENGE_PERIOD` (4): Still in the challenge period, wait a few seconds.

   - `sdk.MessageStatus.READY_FOR_RELAY` (5): Ready to finalize the message.
     Go on to the next step.


1. Finalize the message.

   ```js
   txPromise = crossChainMessenger.finalizeMessage(process.env.HASH)
   txPromise.then(tx => console.log(tx.hash))
   ```


1. Exit `node`:

   ```js
   .exit
   ```

1. See the greeting has changed.

   ```sh
   cast call --rpc-url $SYSCOIN_TANENBAUM_URL $GREETER_L1 "greet()"  | cast --to-ascii
   ```


## How it's done (in Solidity)

We'll go over the L1 contract that controls Greeter on L2, [`FromL1_ControlL2Greeter.sol`](hardhat/contracts/FromL1_ControlL2Greeter.sol).
Except for addresses, the contract going the other direction, [`FromL2_ControlL1Greeter.sol`](hardhat/contracts/FromL2_ControlL21reeter.sol), is identical.

```solidity
//SPDX-License-Identifier: Unlicense
// This contracts runs on L1, and controls a Greeter on L2.
pragma solidity ^0.8.0;

import { ICrossDomainMessenger } from
    "@eth-optimism/contracts/libraries/bridge/ICrossDomainMessenger.sol";
```

This line imports the interface to send messages, [`ICrossDomainMessenger.sol`](https://github.com/SYS-Labs/rollux/blob/develop/packages/sdk/test/contracts/ICrossDomainMessenger.sol).


```solidity
contract FromL1_ControlL2Greeter {
    address crossDomainMessengerAddr = 0x5086d1eEF304eb5284A0f6720f79403b4e9bE294;
```

This is the address of [`Proxy__OVM_L1CrossDomainMessenger`](https://github.com/SYS-Labs/rollux/blob/develop/packages/contracts-bedrock/deployments/internal-devnet/Proxy__OVM_L1CrossDomainMessenger.json#L2) on Syscoin Tanenbaum.
To call L2 from L1 on mainnet, you need to [use this address](https://github.com/SYS-Labs/rollux/blob/develop/packages/contracts-bedrock/deployments/mainnet/Proxy__OVM_L1CrossDomainMessenger.json#L2).
To call L1 from L2, on either mainnet or Syscoin Tanenbaum, use the address of `L2CrossDomainMessenger`, 0x4200000000000000000000000000000000000007.

```solidity
    address greeterL2Addr = 0x2316EEbB361d13b0BB091B7C3533079c0f2a229A;
```

This is the address on which `Greeter` is installed on Rollux Tanenbaum.


```solidity
    function setGreeting(string calldata _greeting) public {
```

This function sets the new greeting. Note that the string is stored in `calldata`.
This saves us some gas, because when we are called from an externally owned account or a different contract there no need to copy the input string to memory.
The downside is that we cannot call `setGreeting` from within this contract, because contracts cannot modify their own calldata.

```solidity
        bytes memory message;
```

This is where we'll store the message to send to L2.

```solidity
        message = abi.encodeWithSignature("setGreeting(string,address)",
            _greeting, msg.sender);
```

Here we create the message, the calldata to be sent on L2.
The Solidity [`abi.encodeWithSignature`](https://docs.soliditylang.org/en/v0.8.12/units-and-global-variables.html?highlight=abi.encodeWithSignature#abi-encoding-and-decoding-functions) function creates this calldata.
As [specified in the ABI](https://docs.soliditylang.org/en/v0.8.12/abi-spec.html), it is four bytes of signature for the function being called followed by the parameters, in this case a string for the new greeting, and an address for the original sender.

Note: We don't need the original sender for the tutorial itself.
We sent it here to make it easier to see how many people went through the tutorial.

```solidity
        ICrossDomainMessenger(crossDomainMessengerAddr).sendMessage(
            greeterL2Addr,
            message,
            1000000   // within the free gas limit amount
        );
```

This call actually sends the message. It gets three parameters:

1. The address on L2 of the contract being contacted
1. The calldata to send that contract
1. The gas limit.

```solidity
    }      // function setGreeting
}          // contract FromL1_ControlL2Greeter
```


## Getting the source address

If you look at Blockscout, for either the [L1 Greeter](https://tanenbaum.io/address/0xAE5F19b849d777B8D6Cb1296C5f10CCa19B0AeaD#events) or the [L2 Greeter](https://rollux.tanenbaum.io/address/0x2316EEbB361d13b0BB091B7C3533079c0f2a229A#events), you will see events with the source address on the other layer.
The way this works is that the cross domain messenger that calls the target contract has a method, `xDomainMessageSender()`, that returns the source address. It is used by the `getXsource` function in `Greeter`.

```solidity
  // Get the cross domain origin, if any
  function getXorig() private view returns (address) {
    address cdmAddr = address(0);
```

It might look like it would be more efficient to calculate the address of the cross domain messenger just once, but that would involve changing the state, which is an expensive operation.
Unless we are going to run this code thousands of times, it is more efficient to just have a few `if` statements.

```solidity

    // Syscoin Tanenbaum
    if (block.chainid == 5700)
      cdmAddr = 0x51ac8093D762BBD17C8d898634916dAc14e1BCC1;

    // L2 (same address on every network)
    if (block.chainid == 57000)
      cdmAddr = 0x4200000000000000000000000000000000000007;

```

There are two possibilities for the cross domain messenger's address on L1, because the address is not determined by Rollux.
On L2, Rollux has full control of the genesis block, so we can put all of our contracts on convenient addresses.

```solidity
    // If this isn't a cross domain message
    if (msg.sender != cdmAddr)
      return address(0);
```

If the sender isn't the cross domain messenger, then this isn't a cross domain message.
Just return zero.


```solidity
    // If it is a cross domain message, find out where it is from
    return ICrossDomainMessenger(cdmAddr).xDomainMessageSender();
  }    // getXorig()
```

If it is the cross domain messenger, call `xDomainMessageSender()` to get the original source address.

## Conclusion

You should now be able to control contracts on Rollux from Syscoin or the other way around.
This is useful, for example, if you want to hold cheap DAO votes on Rollux to manage a Syscoin treasury (see [rollcall](https://github.com/withtally/rollcall)) or offload a complicated calculation, which must be done in a traceable manner, to Rollux where gas is cheap.
