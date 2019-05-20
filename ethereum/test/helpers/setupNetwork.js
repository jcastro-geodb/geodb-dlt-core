const ganache = require("ganache-cli");
const ethers = require("ethers");

require("events").EventEmitter.defaultMaxListeners = 100;

const setupNetwork = () => {
  const ganacheOptions = {
    gasLimit: "8000000"
  };

  const provider = ganache.provider(ganacheOptions);

  const ethersProvider = new ethers.providers.Web3Provider(provider);

  const mnemonic = ethersProvider._web3Provider.options.mnemonic;
  let accounts = {};

  let index = 1;
  accounts["geodb"] = ethers.Wallet.fromMnemonic(mnemonic).connect(
    ethersProvider
  );
  accounts["org1"] = ethers.Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index++}`
  ).connect(ethersProvider);
  accounts["org2"] = ethers.Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index++}`
  ).connect(ethersProvider);
  accounts["org3"] = ethers.Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index++}`
  ).connect(ethersProvider);

  accounts["org4"] = ethers.Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index++}`
  ).connect(ethersProvider);

  accounts["badorg"] = ethers.Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index++}`
  ).connect(ethersProvider);

  return { ethersProvider, accounts };
};

module.exports = setupNetwork;
