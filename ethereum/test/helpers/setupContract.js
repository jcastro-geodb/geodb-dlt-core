const compiledGeoDBRoot = require("../../build/contracts/GeoDB.json");
const ethers = require("ethers");

const setupContract = async accounts => {
  let rootSmartContract;
  let contractProxy = {};

  let factory = new ethers.ContractFactory(
    compiledGeoDBRoot.abi,
    compiledGeoDBRoot.bytecode,
    accounts["geodb"]
  );

  rootSmartContract = await factory.deploy();
  await rootSmartContract.deployed();

  stakeRequirement = (await rootSmartContract.getCurrentFederationStakeRequirement()).toNumber();

  contractProxy["geodb"] = rootSmartContract.connect(accounts["geodb"]);
  contractProxy["org1"] = rootSmartContract.connect(accounts["org1"]);
  contractProxy["org2"] = rootSmartContract.connect(accounts["org2"]);
  contractProxy["org3"] = rootSmartContract.connect(accounts["org3"]);
  contractProxy["badorg"] = rootSmartContract.connect(accounts["badorg"]);

  await (await contractProxy["geodb"].transfer(
    accounts["org1"].address,
    stakeRequirement * 10
  )).wait();
  await (await contractProxy["geodb"].transfer(
    accounts["org2"].address,
    stakeRequirement * 10
  )).wait();
  await (await contractProxy["geodb"].transfer(
    accounts["org3"].address,
    stakeRequirement * 10
  )).wait();

  return { rootSmartContract, stakeRequirement, contractProxy };
};

module.exports = setupContract;
