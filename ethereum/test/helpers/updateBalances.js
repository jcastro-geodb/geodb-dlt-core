const compiledGeoDBRoot = require("../../build/contracts/GeoDB.json");
const ethers = require("ethers");

const updateBalances = async (accounts, rootSmartContract) => {
  let oldBalances = {};

  oldBalances["contract"] = (await rootSmartContract.balanceOf(
    rootSmartContract.address
  )).toNumber();
  oldBalances["totalStake"] = (await rootSmartContract.totalStake()).toNumber();

  for (let key in accounts) {
    let balance = await rootSmartContract.balanceOf(accounts[key].address);
    oldBalances[key] = balance.toNumber();
  }

  return oldBalances;
};

module.exports = updateBalances;
