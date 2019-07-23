require('openzeppelin-test-helpers/configure')({ web3 });

const { singletons } = require('openzeppelin-test-helpers');
const fs = require("fs-extra");
const path = require("path");
const { BN } = require("web3-utils").BN;
let GeoToken = artifacts.require("./GeoToken.sol");

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

module.exports = function(deployer, network, accounts) {
  if (network.includes("test") || network.includes("development"))
    // do not deploy, each test should deploy by itself
    return;
  
  if (network === 'ganache') {
    // In a test environment an ERC777 token requires deploying an ERC1820 registry
    singletons.ERC1820Registry(accounts[0]);
  }

  const presaleHolders = fs.readJsonSync(presaleHoldersPath);

  let holders = [];
  let amounts = [];

  for (holder of presaleHolders) {
    holders.push(holder.address);
    amounts.push(new BN(holder.amount));
  }

  deployer
    .deploy(GeoToken,"GeoToken", "GTKN", holders)
    .then(() => {
      return GeoToken.deployed();
    })
    .then(instance => {
      if (network.includes("fork") === false) {
        console.log("\n=================================");
        console.log(" CONTRACT DEPLOYED");
        console.log("=================================\n");

        console.log(`At address: ${instance.address}`);

        // Copy contract access data to JSON
        let data = {};

        try {
          data = fs.readJsonSync(fabricEthDataFile);
        } catch (e) {
          console.log(`__ Could not read ${fabricEthDataFile}, creating file`);
          console.error(e);
        }

        data[network] = { address: instance.address };

        fs.outputJsonSync(fabricEthDataFile, data);

        // Copy ABI to Fabric

        try {
          fs.copySync(buildDirectory, fabricEthContractsDirectory, { overwrite: true });
        } catch (e) {
          console.log(`__ Could not copy contracts to Fabric directory ${fabricEthContractsDirectory}`);
          console.error(e);
        }

        // Copy ABI to client

        try {
          fs.copySync(buildDirectory, clientEthContractsDirectory, { overwrite: true });
        } catch (e) {
          console.log(`__ Could not copy contracts to client directory ${clientEthContractsDirectory}`);
          console.error(e);
        }
      }
    });
};
