const fs = require("fs-extra");
const path = require("path");
const { BN } = require("web3-utils").BN;
let GeoToken = artifacts.require("./GeoToken.sol");

const fabricEthChaincodePath = path.resolve(
  __dirname,
  "./../../network/chaincode/github.com/geodb/ethereum/deploy/data.json"
);

const presaleHoldersPath = path.resolve(__dirname, "./../.presale_holders.json");

module.exports = function(deployer) {
  const presaleHolders = fs.readJsonSync(presaleHoldersPath);

  let holders = [];
  let amounts = [];

  for (holder of presaleHolders) {
    holders.push(holder.address);
    amounts.push(new BN(holder.amount));
  }

  deployer
    .deploy(GeoToken, holders, amounts)
    .then(() => {
      return GeoToken.deployed();
    })
    .then(instance => {
      console.log("\n=================================");
      console.log(" CONTRACT DEPLOYED");
      console.log("=================================\n");

      console.log(`At address: ${instance.address}`);

      const data = { address: instance.address };

      fs.outputJsonSync(fabricEthChaincodePath, data);
    });
};
