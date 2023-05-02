const ethers = require('ethers');
require('dotenv').config();
const opSDK = require("@eth-optimism/sdk")
const fs = require('fs')


const main = async () => {


    const l1Provider = new ethers.providers.JsonRpcProvider(process.env.L1_RPC);
    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.L2_RPC);
    const walletL1 = new ethers.Wallet(process.env.PK, l1Provider);
    const walletL2 = new ethers.Wallet(process.env.PK, l2Provider);

    const cdm = new opSDK.CrossChainMessenger({
        l1SignerOrProvider: walletL1,
        l2SignerOrProvider: walletL2,
        l1ChainId: process.env.L1_CHAIN_ID,
        l2ChainId: process.env.L2_CHAIN_ID,
        bedrock: true
    })

    const IL1Bridge = new ethers.utils.Interface(fs.readFileSync('./abi/L1ERC721Bridge.json').toString());
    const IL2Bridge = new ethers.utils.Interface(fs.readFileSync('./abi/L2ERC721Bridge.json').toString());

    const L1Bridge = new ethers.Contract(process.env.L1_BRIDGE, IL1Bridge);
    const L2Bridge = new ethers.Contract(process.env.L2_BRIDGE, IL2Bridge);

    const NFTL1 = new ethers.Contract(process.env.L1_NFT_ADDR, new ethers.utils.Interface(fs.readFileSync('./abi/ERC721.json').toString()))
    const NFTL2 = new ethers.Contract(process.env.L2_NFT_ADDR, new ethers.utils.Interface(fs.readFileSync('./abi/ERC721.json').toString()))


    if (await NFTL1.connect(walletL1).ownerOf(process.env.TOKEN_ID) !== walletL1.address) {
        throw new Error(`NFT token #${process.env.TOKEN_ID} is not owning by ${walletL1.address}`);
    }


    //approve token for L1 bridge

    console.log("Starting token approve for bridge");
    console.debug({
        L1ERC721Bridge: process.env.L1_BRIDGE,
        tokenAddress: NFTL1.address,
        tokenID: process.env.TOKEN_ID
    })
    const _approveTx = await NFTL1.connect(walletL1).approve(process.env.L1_BRIDGE, process.env.TOKEN_ID);
    await _approveTx.wait();




    // const gasE = await cdm.estimateL2MessageGasLimit({
    //     target: process.env.L2_BRIDGE,
    //     direction: opSDK.MessageDirection.L1_TO_L2,
    //     sender: '0x8dd330dde8d9898d43b4dc840da27a07df91b3c9',
    //     message: IL2Bridge.encodeFunctionData("finalizeBridgeERC721", [
    //         process.env.L2_NFT_ADDR,
    //         process.env.L1_NFT_ADDR,
    //         walletL1.address,
    //         walletL1.address,
    //         process.env.TOKEN_ID,
    //         ethers.utils.hexlify(ethers.utils.toUtf8Bytes("rollux-bridge"))
    //     ])
    // })

    // console.log(gasE.toString())

    // process.exit(0);


    const txBridge = await L1Bridge.connect(walletL1).bridgeERC721(
        process.env.L1_NFT_ADDR,
        process.env.L2_NFT_ADDR,
        process.env.TOKEN_ID,
        1_200_000,
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes("rollux-bridge")),
        {
            gasLimit: 2_000_000
        }
    )

    console.log(`Bridge tx sent - ${txBridge.hash}`);


    await txBridge.wait();
}

main().then((result) => {
    console.log(`Main process return is : ${result}`);
}).catch(err => console.error(err));