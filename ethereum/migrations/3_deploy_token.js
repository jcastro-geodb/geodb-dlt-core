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

module.exports = function(deployer, network, accounts) {
  if (network.includes("test") || network.includes("development"))
    // do not deploy, each test should deploy by itself
    return;

  const oldOwner = accounts[2];
  const newOwner = accounts[1];

  deployer
    .deploy(GeoToken, "GeoDB Coin", "GEO", [], { from: oldOwner })
    .then(instance => {
      console.log(`Transfering token ownership from ${oldOwner} to ${newOwner}`);
      return instance.transferOwnership(newOwner, { from: oldOwner });
    })
    .then(result => {
      if (result) console.log(`Successfully transfered ownership to ${newOwner}`);
      console.log(`Transfering balance from ${oldOwner} to ${newOwner}`);
      return GeoToken.deployed().then(instance =>
        instance.balanceOf(oldOwner).then(amount => instance.send(newOwner, amount, [], { from: oldOwner }))
      );
    })
    .then(result => {
      if (result) console.log(`Successfully transfered balance to ${accounts[1]}`);
    })
    // .then(result => {
    //   if (result) console.log(`Balance of ${accounts[2]} is ${result.toString()}`);
    // })
    .catch(console.error);
};
