# Bridging your Standard ERC20 token to Rollux using the Standard Bridge

[![Discord](https://img.shields.io/discord/1087373765014454322)](https://discord.gg/rollux)
[![Twitter Follow](https://img.shields.io/twitter/follow/RolluxL2?style=social)](https://twitter.com/RolluxL2)


For an L1/L2 token pair to work on the Standard Bridge the L2 token contract must implement
[`IL2StandardERC20`](https://github.com/SYS-Labs/rollux/blob/2a00448db370a3cf8249637598f7224bbd50f75f/packages/contracts/contracts/standards/IL2StandardERC20.sol) interface.

If you do not need any special processing on L2, just the ability to deposit, transfer, and withdraw tokens, you can use [`OptimismMintableERC20Factory`](https://github.com/SYS-Labs/rollux/blob/develop/packages/contracts-bedrock/contracts/universal/OptimismMintableERC20Factory.sol).


**Note:** This tutorial is for the Bedrock release, which is currently running on the Rollux Tanenbaum test and Rollux mainnet networks.

**Warning:** The standard bridge does *not* support certain ERC-20 configurations:

- [Fee on transfer tokens](https://github.com/d-xo/weird-erc20#fee-on-transfer)
- [Tokens that modify balances without emitting a Transfer event](https://github.com/d-xo/weird-erc20#balance-modifications-outside-of-transfers-rebasingairdrops)


## Deploying the token

1. Download the necessary packages.

   ```sh
   yarn
   ```

1. Copy `.env.example` to `.env`.

   ```sh
   cp .env.example .env
   ```

1. If you are using testnet
   1. Set `MNEMONIC` to point to an account that has TSYS on the Syscoin Tanenbaum test network and the Rollux Tanenbaum test network.
   1. Set `L1_TOKEN_ADDRESS`, the address of the L1 ERC20 which you want to bridge.
      The default value, [`0x77776E8e71FE900cF8f5e49E5d98558198CE2D1d`](https://tanenbaum.io/address/0x77776E8e71FE900cF8f5e49E5d98558198CE2D1d) is a test ERC-20 contract on Syscoin Tanenbaum that lets you call `faucet` to give yourself test tokens.

   If you are using mainnet, go to [Ankr](https://ankr.com/) and get API keys for RPC service for the following:

   - Syscoin
   - Rollux

   Keep a copy of the two keys. Then copy `.env.example` to `.env` and edit it:

   1. Set `MNEMONIC` to point to an account that has TSYS on the Syscoin Tanenbaum test network and the Rollux Tanenbaum test network.
   1. Set `SYSCOIN_MAINNET_URL` to the entire URL (including auth key) for the Ankr RPC provider for Syscoin mainnet.
   1. Set `ROLLUX_MAINNET_URL` to the entire URL (including auth key) for the Ankr RPC provider for Rollux mainnet.
   1. Set `L1_TOKEN_ADDRESS`, the address of the L1 ERC20 which you want to bridge.
      The default value, [`0x77776E8e71FE900cF8f5e49E5d98558198CE2D1d`](https://tanenbaum.io/address/0x77776E8e71FE900cF8f5e49E5d98558198CE2D1d) is a test ERC-20 contract on Syscoin Tanenbaum that lets you call `faucet` to give yourself test tokens.

1. Open the hardhat console.

   ```sh
   yarn hardhat console --network rollux_tanenbaum
   ```

1. Connect to `OptimismMintableERC20Factory`.

   ```js
   fname = "node_modules/@eth-optimism/contracts-bedrock/artifacts/contracts/universal/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json"
   ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
   optimismMintableERC20FactoryData = JSON.parse(ftext)
   optimismMintableERC20Factory = new ethers.Contract(
      "0x4200000000000000000000000000000000000012",
      optimismMintableERC20FactoryData.abi,
      await ethers.getSigner())
   ```


1. Deploy the contract.

   ```js
   deployTx = await optimismMintableERC20Factory.createOptimismMintableERC20(
      process.env.L1_TOKEN_ADDRESS,
      "Token Name on L2",
      "L2-SYMBOL"
   )
   deployRcpt = await deployTx.wait()
   ```

## Transferring tokens

1. Get the token addresses.

   ```js
   l1Addr = process.env.L1_TOKEN_ADDRESS
   event = deployRcpt.events.filter(x => x.event == "OptimismMintableERC20Created")[0]
   l2Addr = event.args.localToken
   ```

1. Get the data for `OptimismMintableERC20`:

   ```js
   fname = "node_modules/@eth-optimism/contracts-bedrock/artifacts/contracts/universal/OptimismMintableERC20.sol/OptimismMintableERC20.json"
   ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
   optimismMintableERC20Data = JSON.parse(ftext)
   ```

1. Get the L2 contract.

   ```js
   l2Contract = new ethers.Contract(l2Addr, optimismMintableERC20Data.abi, await ethers.getSigner())
   ```

### Get setup for L1 (provider, wallet, tokens, etc)

1. Get the L1 wallet.

   ```js
   l1Url = `https://rpc.tanenbaum.io/`
   l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
   hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC)
   privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey
   l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
   ```

1. Get the L1 contract.

   ```js
   l1Factory = await ethers.getContractFactory("OptimismUselessToken")
   l1Contract = new ethers.Contract(process.env.L1_TOKEN_ADDRESS, l1Factory.interface, l1Wallet)
   ```

1. Get tokens on L1 (and verify the balance)

   ```js
   faucetTx = await l1Contract.faucet()
   faucetRcpt = await faucetTx.wait()
   await l1Contract.balanceOf(l1Wallet.address)
   ```


### Transfer tokens

Create and use [`CrossDomainMessenger`](https://sdk.optimism.io/classes/crosschainmessenger) (the Optimism SDK object used to bridge assets).

1. Import the Optimism SDK.

   ```js
   optimismSDK = require("@eth-optimism/sdk")
   ```

1. Create the cross domain messenger.

   ```js
   l1ChainId = (await l1RpcProvider.getNetwork()).chainId
   l2ChainId = (await ethers.provider.getNetwork()).chainId
   l2Wallet = await ethers.provider.getSigner()
   crossChainMessenger = new optimismSDK.CrossChainMessenger({
      l1ChainId: l1ChainId,
      l2ChainId: l2ChainId,
      l1SignerOrProvider: l1Wallet,
      l2SignerOrProvider: l2Wallet,
      bedrock: true
   })
   ```

#### Deposit (from L1 to Rollux)

1. Give the L1 bridge an allowance to use the user's token.
   The L2 address is necessary to know which bridge is responsible and needs the allowance.

   ```js
   depositTx1 = await crossChainMessenger.approveERC20(l1Contract.address, l2Addr, 1e9)
   await depositTx1.wait()
   ```

1. Check your balances on L1 and L2.
   Note that `l1Wallet` and `l2Wallet` have the same address, so it doesn't matter which one we use.

   ```js
   await l1Contract.balanceOf(l1Wallet.address)
   await l2Contract.balanceOf(l1Wallet.address)
   ```

1. Do the actual deposit

   ```js
   depositTx2 = await crossChainMessenger.depositERC20(l1Addr, l2Addr, 1e9)
   await depositTx2.wait()
   ```

1. Wait for the deposit to be relayed.

   ```js
   await crossChainMessenger.waitForMessageStatus(depositTx2.hash, optimismSDK.MessageStatus.RELAYED)
   ```

1. Check your balances on L1 and L2.

   ```js
   await l1Contract.balanceOf(l1Wallet.address)
   await l2Contract.balanceOf(l1Wallet.address)
   ```

#### Withdrawal (from Rollux to L1)

1. Initiate the withdrawal on L2

   ```js
   withdrawalTx1 = await crossChainMessenger.withdrawERC20(l1Addr, l2Addr, 1e9)
   await withdrawalTx1.wait()
   ```

1. Wait until the root state is published on L1, and then prove the withdrawal.
   This is likely to take less than 240 seconds.

   ```js
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, optimismSDK.MessageStatus.READY_TO_PROVE)
   withdrawalTx2 = await crossChainMessenger.proveMessage(withdrawalTx1.hash)
   await withdrawalTx2.wait()
   ```

1. Wait the fault challenge period (a short period on Syscoin Tanenbaum, seven days on the production network) and then finish the withdrawal.

   ```js
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, optimismSDK.MessageStatus.READY_FOR_RELAY)
   withdrawalTx3 = await crossChainMessenger.finalizeMessage(withdrawalTx1.hash)
   await withdrawalTx3.wait()
   ```


1. Check your balances on L1 and L2.
   The balance on L2 should be back to zero.

   ```js
   await l1Contract.balanceOf(l1Wallet.address)
   await l2Contract.balanceOf(l1Wallet.address)
   ```
