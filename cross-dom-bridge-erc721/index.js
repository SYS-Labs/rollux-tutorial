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
        bedrock: true,
        contracts: {
            l1: {
                AddressManager: '0xd4706EF8CbFebfc32a4930636a70BEed20d019b6',
                L1CrossDomainMessenger: '0x4f0f13677f69F990013EF2f8f8D4c67e4b9a2d5F',
                L1StandardBridge: '0x5eb41630CfA4465ec5b3EFe86979C32288895d7B',
                StateCommitmentChain: ethers.constants.AddressZero,
                CanonicalTransactionChain: ethers.constants.AddressZero,
                BondManager: ethers.constants.AddressZero,
                OptimismPortal: '0xD46Bf6354725bFd4409cd6A952695bFEb213aCB9',
                L2OutputOracle: '0xf8d7Db6eeE25fe9c2F659936efD173C965B45F19',
                L1ERC721Bridge: '0xc37Cf0839267CeE1827C0d70F74720d10618ba54',
            },
            l2: {
                L2ToL1MessagePasser: '0x4200000000000000000000000000000000000016',
                DeployerWhitelist: '0x4200000000000000000000000000000000000002',
                L2CrossDomainMessenger: '0x4200000000000000000000000000000000000007',
                GasPriceOracle: '0x420000000000000000000000000000000000000F',
                L2StandardBridge: '0x4200000000000000000000000000000000000010',
                SequencerFeeVault: '0x4200000000000000000000000000000000000011',
                OptimismMintableERC20Factory: '0x4200000000000000000000000000000000000012',
                L1BlockNumber: '0x4200000000000000000000000000000000000013',
                L1Block: '0x4200000000000000000000000000000000000015',
                LegacyERC20ETH: '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
                WETH9: '0x4200000000000000000000000000000000000006',
                GovernanceToken: '0x4200000000000000000000000000000000000042',
                LegacyMessagePasser: '0x4200000000000000000000000000000000000000',
                L2ERC721Bridge: '0x4200000000000000000000000000000000000014',
                OptimismMintableERC721Factory: '0x4200000000000000000000000000000000000017',
                ProxyAdmin: '0x4200000000000000000000000000000000000018',
                BaseFeeVault: '0x4200000000000000000000000000000000000019',
                L1FeeVault: '0x420000000000000000000000000000000000001a',
            },
        }
    })


    console.log(
        await cdm.getMessageStatus('0x4027767974c309331dd1352699b52c2bc8af8594174ccbcd8e625fb63086beec')
    )

    process.exit();


    const IL1Bridge = new ethers.utils.Interface(fs.readFileSync('./abi/L1ERC721Bridge.json').toString());
    const IL2Bridge = new ethers.utils.Interface(fs.readFileSync('./abi/L2ERC721Bridge.json').toString());


    // console.log(

    //     IL2Bridge.encodeFunctionData("finalizeBridgeERC721", [
    //         process.env.L2_NFT_ADDR,
    //         process.env.L1_NFT_ADDR,
    //         walletL1.address,
    //         walletL1.address,
    //         process.env.TOKEN_ID,
    //         ethers.utils.hexlify(ethers.utils.toUtf8Bytes("rollux-bridge"))
    //     ])
    // );

    // process.exit();


    const L1Bridge = new ethers.Contract(process.env.L1_BRIDGE, IL1Bridge);
    const L2Bridge = new ethers.Contract(process.env.L2_BRIDGE, IL2Bridge);

    const NFTL1 = new ethers.Contract(process.env.L1_NFT_ADDR, new ethers.utils.Interface(fs.readFileSync('./abi/ERC721.json').toString()))
    const NFTL2 = new ethers.Contract(process.env.L2_NFT_ADDR, new ethers.utils.Interface(fs.readFileSync('./abi/ERC721.json').toString()))


    if (await NFTL1.connect(walletL1).ownerOf(process.env.TOKEN_ID) !== walletL1.address) {
        throw new Error(`NFT token #${process.env.TOKEN_ID} is not owning by ${walletL1.address}`);
    }


    // approve token for L1 bridge

    console.log("Starting token approve for bridge");
    console.debug({
        L1ERC721Bridge: process.env.L1_BRIDGE,
        tokenAddress: NFTL1.address,
        tokenID: process.env.TOKEN_ID
    })
    const _approveTx = await NFTL1.connect(walletL1).approve(process.env.L1_BRIDGE, process.env.TOKEN_ID);
    await _approveTx.wait();




    // const gasE = await cdm.estimateL2MessageGasLimit({
    //     target: '0x4200000000000000000000000000000000000007',
    //     direction: opSDK.MessageDirection.L1_TO_L2,
    //     message: IL2Bridge.encodeFunctionData("finalizeBridgeERC721", [
    //         process.env.L2_NFT_ADDR,
    //         process.env.L1_NFT_ADDR,
    //         walletL1.address,
    //         walletL1.address,
    //         process.env.TOKEN_ID,
    //         ethers.utils.hexlify(ethers.utils.toUtf8Bytes("rollux-bridge"))
    //     ])
    // }, { from: '0x6197d1EeF304EB5284A0F6720f79403b4E9Bf3A5' })

    // console.log(gasE.toString())

    // process.exit(0);


    const txBridge = await L1Bridge.connect(walletL1).bridgeERC721(
        process.env.L1_NFT_ADDR,
        process.env.L2_NFT_ADDR,
        process.env.TOKEN_ID,
        1_200_000,
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes("rollux-bridge"))
    )

    console.log(`Bridge tx sent - ${txBridge.hash}`);


    // await txBridge.wait();
}

main().then((result) => {
    console.log(`Main process return is : ${result}`);
}).catch(err => console.error(err));