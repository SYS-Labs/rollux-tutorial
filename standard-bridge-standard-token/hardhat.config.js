// Plugins
require('@nomiclabs/hardhat-ethers')

// Load environment variables from .env
require('dotenv').config();


const words = process.env.MNEMONIC.match(/[a-zA-Z]+/g).length
validLength = [12, 15, 18, 24]
if (!validLength.includes(words)) {
   console.log(`The mnemonic (${process.env.MNEMONIC}) is the wrong number of words`)
   process.exit(-1)
}

module.exports = {
  networks: {
    'rollux-testnet': {
      chainId: 57000,
      url: process.env.ROLLUX_TANENBAUM_URL,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    'rollux-mainnet': {
      chainId: 570,
      url: process.env.ROLLUX_MAINNET_URL,
      accounts: { mnemonic: process.env.MNEMONIC }
    }
  },
  solidity: '0.8.13',
}
