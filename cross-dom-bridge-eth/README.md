# Bridging SYS with the Rollux SDK

[![Discord](https://img.shields.io/discord/1087373765014454322)](https://discord.gg/rollux)
[![Twitter Follow](https://img.shields.io/twitter/follow/RolluxL2?style=social)](https://twitter.com/RolluxL2)

This tutorial teaches you how to use the [Optimism SDK](https://sdk.optimism.io/) to transfer SYS between Layer 1 (Syscoin) and Layer 2 (Rollux).

**Note:** This tutorial is for the Bedrock release, which is currently running on the Rollux Tanenbaum test network.

## Setup

1. Ensure your computer has:
   - [`git`](https://git-scm.com/downloads)
   - [`node`](https://nodejs.org/en/)
   - [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

1. Clone this repository and enter it.

   ```sh
   git clone https://github.com/SYS-Labs/rollux-tutorial.git
   cd rollux-tutorial/cross-dom-bridge-sys
   ```

1. Install the necessary packages.

   ```sh
   yarn
   ```

1. If you are using testnet, simply copy `.env.example` to `.env` and skip the rest of this step.

   If you are using mainnet, go to [Ankr](https://ankr.com/) and get API keys for RPC service for the following:

   - Syscoin
   - Rollux

   Keep a copy of the two keys. Then copy `.env.example` to `.env` and edit it:

   1. Set `MNEMONIC` to point to an account that has TSYS on the Syscoin Tanenbaum test network and the Rollux Tanenbaum test network.
   1. Set `L1_RPC` to the entire URL (including auth key) for the Ankr RPC provider for Syscoin mainnet.
   1. Set `L2_RPC` to the entire URL (including auth key) for the Ankr RPC provider for Rollux mainnet.


[This faucet gives TSYS (test SYS) on the Syscoin Tanenbaum network](https://faucet.syscoin.org/). [This faucet gives TSYS (test SYS) on the Rollux Tanenbaum network](https://rollux.id/faucetapp).


## Run the sample code

The sample code is in `index.js`, execute it.
After you execute it, wait. It is not unusual for each operation to take minutes on Syscoin Tanenbaum.
On the production network the withdrawals take around a week each, because of the [challenge period](https://community.optimism.io/docs/developers/bridge/messaging/#understanding-the-challenge-period).

### Expected output

When running on Syscoin Tanenbaum,the output from the script should be similar to:

```
Deposit SYS
On L1:410251220 Gwei    On L2:29020983 Gwei
Transaction hash (on L1): 0x4c057d3aaec665c1123d2dec1d8d82c64e567681f7c48fc1aadd007961bf5f02
Waiting for status to change to RELAYED
Time so far 14.79 seconds
On L1:410078008 Gwei    On L2:29021983 Gwei
depositSYS took 43.088 seconds


Withdraw SYS
On L1:410078008 Gwei    On L2:29021983 Gwei
Transaction hash (on L2): 0x18ec96d32811a684dab28350d7935f1fdd86533840a53f272aa7870724ae2a9c
	For more information: https://rollux.tanenbaum.io/tx/0x18ec96d32811a684dab28350d7935f1fdd86533840a53f272aa7870724ae2a9c
Waiting for status to be READY_TO_PROVE
Time so far 7.197 seconds
Time so far 290.453 seconds
In the challenge period, waiting for status READY_FOR_RELAY
Time so far 294.328 seconds
Ready for relay, finalizing message now
Time so far 331.383 seconds
Waiting for status to change to RELAYED
Time so far 333.753 seconds
On L1:419369936 Gwei    On L2:18842420 Gwei
withdrawSYS took 342.143 seconds

```

As you can see, the total running time is about twenty minutes.


## How does it work?


```js
#! /usr/local/bin/node

// Transfers between L1 and L2 using the Optimism SDK

const ethers = require("ethers")
const optimismSDK = require("@eth-optimism/sdk")
require('dotenv').config()

```

The libraries we need: [`ethers`](https://docs.ethers.io/v5/), [`dotenv`](https://www.npmjs.com/package/dotenv) and the Optimism SDK itself.

```js
const mnemonic = process.env.MNEMONIC
const l1Url = process.env.L1_RPC
const l2Url = process.env.L2_RPC
```

Configuration, read from `.env`.


```js
// Global variable because we need them almost everywhere
let crossChainMessenger
let addr    // Our address
```


The configuration parameters required for transfers.

### `getSigners`

This function returns the two signers (one for each layer).

```js
const getSigners = async () => {
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url)
```

The first step is to create the two providers, each connected to an endpoint in the appropriate layer.

```js
    const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic)
    const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey
```

To derive the private key and address from a mnemonic it is not enough to create the `HDNode` ([Hierarchical Deterministic Node](https://en.bitcoin.it/wiki/Deterministic_wallet#Type_2:_Hierarchical_deterministic_wallet)).
The same mnemonic can be used for different blockchains (it's originally a Bitcoin standard), and the node with Syscoin information is under [`ethers.utils.defaultPath`](https://docs.ethers.io/v5/single-page/#/v5/api/utils/hdnode/-%23-hdnodes--defaultpath).

```js
    const l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
    const l2Wallet = new ethers.Wallet(privateKey, l2RpcProvider)

    return [l1Wallet, l2Wallet]
}   // getSigners
```

Finally, create and return the wallets.
We need to use wallets, rather than providers, because we need to sign transactions.



### `setup`

This function sets up the parameters we need for transfers.

```js
const setup = async() => {
  const [l1Signer, l2Signer] = await getSigners()
  addr = l1Signer.address
```

Get the signers we need, and our address.

```js
  crossChainMessenger = new optimismSDK.CrossChainMessenger({
      l1ChainId: 5700,   // Syscoin Tanenbaum value, 57 for mainnet
      l2ChainId: 57000,  // Rollux Tanenbaum value, UNDISCLOSED for mainnet
      l1SignerOrProvider: l1Signer,
      l2SignerOrProvider: l2Signer,
      bedrock: true
  })
```

Create the [`CrossChainMessenger`](https://sdk.optimism.io/classes/crosschainmessenger) object that we use to transfer assets.


### Variables that make it easier to convert between WEI and ETH

Both SYS and DAI are denominated in units that are 10^18 of their basic unit.
These variables simplify the conversion.

```js
const gwei = 1000000000n
const sys = gwei * gwei   // 10^18
const centisys = sys/100n
```

### `reportBalances`

This function reports the SYS balances of the address on both layers.

```js
const reportBalances = async () => {
  const l1Balance = (await crossChainMessenger.l1Signer.getBalance()).toString().slice(0,-9)
  const l2Balance = (await crossChainMessenger.l2Signer.getBalance()).toString().slice(0,-9)

  console.log(`On L1:${l1Balance} Gwei    On L2:${l2Balance} Gwei`)
}    // reportBalances
```



### `depositSYS`

This function shows how to deposit SYS from Syscoin to Rollux.

```js
const depositETH = async () => {

  console.log("Deposit SYS")
  await reportBalances()
```

To show that the deposit actually happened we show before and after balances.

```js
  const start = new Date()

  const response = await crossChainMessenger.depositETH(gwei)
```

[`crossChainMessenger.depositETH()`](https://sdk.optimism.io/classes/crosschainmessenger#depositETH-2) creates and sends the deposit trasaction on L1.

```js
  console.log(`Transaction hash (on L1): ${response.hash}`)
  await response.wait()
```

Of course, it takes time for the transaction to actually be processed on L1.

```js
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash,
                                                  optimismSDK.MessageStatus.RELAYED)
```

After the transaction is processed on L1 it needs to be picked up by an offchain service and relayed to L2.
To show that the deposit actually happened we need to wait until the message is relayed.
The [`waitForMessageStatus`](https://sdk.optimism.io/classes/crosschainmessenger#waitForMessageStatus) function does this for us.
[Here are the statuses we can specify](https://sdk.optimism.io/enums/messagestatus).

The third parameter (which is optional) is a hashed array of options:
- `pollIntervalMs`: The poll interval
- `timeoutMs`: Maximum time to wait

```js
  await reportBalances()
  console.log(`depositSYS took ${(new Date()-start)/1000} seconds\n\n`)
}     // depositETH()
```

Once the message is relayed the balance change on Optimism is practically instantaneous.
We can just report the balances and see that the L2 balance rose by 1 gwei.

### `withdrawSYS`

This function shows how to withdraw SYS from Rollux to Syscoin.

```js
const withdrawSYS = async () => {

  console.log("Withdraw SYS")
  const start = new Date()
  await reportBalances()

  const response = await crossChainMessenger.withdrawETH(centisys)
```

For deposits it was enough to transfer 1 gwei to show that the L2 balance increases.
However, in the case of withdrawals the withdrawing account needs to pay on L1 for finalizing the message, which costs more than that.

By sending 0.01 SYS it is guaranteed that the withdrawal will actually increase the L1 ETH balance instead of decreasing it.

```js
  console.log(`Transaction hash (on L2): ${response.hash}`)
  console.log(`\tFor more information: https://rollux.tanenbaum.io/tx/${response.hash}`)
  await response.wait()
```

This is the initial withdrawal transaction on Optimism.

```js
  console.log("Waiting for status to be READY_TO_PROVE")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash,
    optimismSDK.MessageStatus.READY_TO_PROVE)
```

The Merkle proof has to be submitted after the state root is written on L1.
On Syscoin Tanenbaum we usually submit a new state root every four minutes.
When the state root is updated, you see a new transaction [on the L2OutputOracle contract](https://tanenbaum.io/address/0x253807F6ECaC4DdD6E24b0a2F8d4042b0AC30dfd).

```js
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.proveMessage(response.hash)
```

Submit the Merkle proof, starting the challenge period.

```js
  console.log("In the challenge period, waiting for status READY_FOR_RELAY")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response.hash,
                                                optimismSDK.MessageStatus.READY_FOR_RELAY)
```

Wait the challenge period.
On Syscoin Tanenbaum the challenge period is very short (a few seconds) to speed up debugging.
On the production network it is seven days for security.

```js
  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.finalizeMessage(response.hash)
```

Finalize the withdrawal and actually get back the 0.01 ETH.

```js
  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(response,
    optimismSDK.MessageStatus.RELAYED)
  await reportBalances()
  console.log(`withdrawSYS took ${(new Date()-start)/1000} seconds\n\n\n`)
}     // withdrawETH()
```


### `main`

A `main` to run the setup followed by both operations.

```js
const main = async () => {
    await setup()
    await depositSYS()
    await withdrawSYS()
}  // main



main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

## Conclusion

You should now be able to write applications that use our SDK and bridge to transfer SYS between layer 1 and layer 2.

<!---Note that for withdrawals of SYS (or commonly used ERC-20 tokens) you would probably want to use a [third party bridge](https://www.optimism.io/apps/bridges) for higher speed and lower cost.
Here is the API documentation for some of those bridges:

* [Hop](https://docs.hop.exchange/js-sdk/getting-started)
* [Synapse](https://docs.synapseprotocol.com/bridge-sdk/sdk-reference/bridge-synapsebridge)
* [Across](https://docs.across.to/bridge/developers/across-sdk)
* [Celer Bridge](https://cbridge-docs.celer.network/developer/cbridge-sdk)  --->
