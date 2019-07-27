try {
  require("openzeppelin-test-helpers/configure")({ web3 });
} catch (e) {
  // If deploying to a testnet, a weird error about configuring web3 twice occurs. Wrapping the function in a try-catch
  // until we find a better approach or --skipDryRun is added to truffle in the next major release
  // console.error(e);
}

const { singletons } = require("openzeppelin-test-helpers");

const fs = require("fs-extra");
const path = require("path");
const { BN } = require("web3-utils").BN;
let GeoToken = artifacts.require("./GeoToken.sol");
let GeoTokenLockUnitary = artifacts.require("./GeoTokenLockUnitary.sol");
let tokenAddress;

const buildDirectory = path.resolve(__dirname, "./../build/contracts");

const fabricEthDataFile = path.resolve(
  __dirname,
  "./../../network/chaincode/github.com/geodb/javascript-low-level/ethereum/deploy/data.json"
);

const fabricEthContractsDirectory = path.resolve(
  __dirname,
  "./../../network/chaincode/github.com/geodb/javascript-low-level/ethereum/contracts"
);

const clientEthContractsDirectory = path.resolve(__dirname, "./../../client/src/contracts");

const presaleHoldersPath = path.resolve(__dirname, "./../.presale_holders.json");

/**
  This function copies the deployed contracts to the Fabric and node manager (client) folders.
*/

const copyABIsToAppFolders = network => {
  // Copy contract access data to JSON
  let data = {};

  console.log("   Copying contract data to Fabric directory...");
  try {
    data = fs.readJsonSync(fabricEthDataFile);
  } catch (e) {
    console.log(`   Could not read ${fabricEthDataFile}, creating file`);
    console.error(e);
  }

  data[network] = { address: tokenAddress };

  fs.outputJsonSync(fabricEthDataFile, data);

  // Copy ABI to Fabric
  try {
    fs.copySync(buildDirectory, fabricEthContractsDirectory, { overwrite: true });
  } catch (e) {
    console.log(`   Could not copy contracts to Fabric directory ${fabricEthContractsDirectory}`);
    console.error(e);
  }

  // Copy ABI to client

  console.log("   Copying contract data to client directory...");
  try {
    fs.copySync(buildDirectory, clientEthContractsDirectory, { overwrite: true });
  } catch (e) {
    console.log(`__ Could not copy contracts to client directory ${clientEthContractsDirectory}`);
    console.error(e);
  }
};

const deployERC1820 = account => {
  return new Promise((resolve, reject) => {
    singletons
      .ERC1820Registry(account)
      .catch(e => {
        // console.error(e) // There seems to be some sort of bug here with ganache and the singleton
      })
      .finally(() => resolve(true));
  });
};

module.exports = function(deployer, network, accounts) {
  if (network.includes("test") || network.includes("development"))
    // do not deploy, each test should deploy by itself
    return;

  deployer
    .then(() => {
      if (network.includes("ganache")) return deployERC1820(accounts[0]);
      else return true;
    })
    .then(() => {
      return deployer.deploy(GeoToken, "GeoToken", "GTKN", []);
    })
    .then(() => {
      return GeoToken.deployed();
    })
    .then(instance => {
      tokenAddress = instance.address;
      return deployer.deploy(GeoTokenLockUnitary, tokenAddress);
    })
    .then(() => {
      return GeoTokenLockUnitary.deployed();
    })
    .then(instance => {
      // Esto no sirve porque no espera hasta que se hayan generado los artifacts.
      // Podría usarse un plugin:
      // https://www.trufflesuite.com/docs/truffle/getting-started/writing-external-scripts#third-party-plugin-commands
      // Que llamase a una dependencia local:
      // https://stackoverflow.com/questions/14381898/local-dependency-in-package-json
      // if (network.includes("fork") === false) {
      //   copyABIsToAppFolders(network);
      // }
    });
};
