/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura API
 * keys are available for free at: infura.io/register
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

/**
 * Utils and imports
 */

const fs = require("fs-extra");
const path = require("path");
require("chai/register-should");
const { toWei } = require("web3-utils");
const HDWalletProvider = require("truffle-hdwallet-provider");

/**
 * Secrets path. A path containing a JSON with structure:
 * {
 * mnemonic: <mnemonic>,
 * endpoints: {<networkName>: <networkEndpoint>, ...}
 * }
 */

const secretsPath = path.resolve(__dirname, ".secrets.json");
let secrets = fs.readJsonSync(secretsPath, { throws: false }) || {};

/**
 * Configuration for the most popular testnets and GeoDB's own testnet: stars
 */
const defaultNetworksConfig = {
  ropsten: {
    gas: 5500000,
    network_id: "3",
    gasPrice: toWei("2", "gwei")
  },
  rinkeby: {
    network_id: "4",
    gas: 6721975,
    gasPrice: toWei("2", "gwei")
  },
  kovan: {
    gas: 8000000,
    network_id: "42",
    gasPrice: toWei("2", "gwei")
  },
  stars: {
    gasPrice: 0,
    network_id: "19080880"
  }
};

/**
 * Parse the secrets file to accomodate for the networks object for truffle-config. Inject the secrets into the
 * HDWalletProvider and if it is a popular testnet, include its configuration.
 */
let networks = {};
if (secrets && secrets.mnemonic && secrets.endpoints) {
  const mnemonic = secrets.mnemonic.trim();

  const definedNetworks = Object.keys(secrets.endpoints);

  for (let i = 0; i < definedNetworks.length; i++) {
    const networkName = definedNetworks[i];

    const defaultConfig = defaultNetworksConfig.hasOwnProperty(networkName)
      ? { ...defaultNetworksConfig[networkName] }
      : { network_id: "*" };

    networks[`${networkName}`] = {
      provider: new HDWalletProvider(mnemonic, secrets.endpoints[`${networkName}`], 0, 10),
      confirmations: 2,
      ...defaultConfig
    };
  }
}

const etherscanAPIKey = secrets.etherscanAPIKey || "";

module.exports = {
  plugins: ["truffle-plugin-verify"],
  api_keys: {
    etherscan: etherscanAPIKey
  },
  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    // development: {
    //  host: "127.0.0.1",     // Localhost (default: none)
    //  port: 8545,            // Standard Ethereum port (default: none)
    //  network_id: "*",       // Any network (default: none)
    // },
    // Another network with more advanced options...
    // advanced: {
    // port: 8777,             // Custom port
    // network_id: 1342,       // Custom network
    // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
    // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
    // from: <address>,        // Account to send txs from (default: accounts[0])
    // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    // },
    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    // ropsten: {
    // provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/${infuraKey}`),
    // network_id: 3,       // Ropsten's id
    // gas: 5500000,        // Ropsten has a lower block limit than mainnet
    // confirmations: 2,    // # of confs to wait between deployments. (default: 0)
    // timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
    // skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    // },
    // Useful for private networks
    // private: {
    // provider: () => new HDWalletProvider(mnemonic, `https://network.io`),
    // network_id: 2111,   // This network is yours, in the cloud.
    // production: true    // Treats this network as if it was a public net. (default: false)
    // }
    // development: {
    //   provider: () => new HDWalletProvider(mnemonic, infuraIO_Endpoint),
    //   gas: 5000000,
    //   confirmations: 2,
    //   network_id: "*" // Match any network id
    // }
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 5500000,
      websockets: true
    },
    ...networks
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.7", // Fetch exact version from solc-bin (default: truffle's version)
      optimizer: {
        enabled: false,
        runs: 200
      },
      evmVersion: "petersburg"
    }
  }
};
