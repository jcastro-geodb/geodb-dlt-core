const compiledGeoDBRoot = require("../../build/contracts/GeoDB.json");
const ethers = require("ethers");
const assert = require("assert");

const checkBalanceDelta = async (
  deltas,
  accounts,
  oldBalances,
  rootSmartContract
) => {
  try {
    for (let delta of deltas) {
      const address =
        delta.org == "contract"
          ? rootSmartContract.address
          : accounts[delta.org].address;

      let balance = (await rootSmartContract.balanceOf(address)).toNumber();

      assert.equal(
        balance - oldBalances[delta.org],
        delta.expected,
        "Balance changes not coherent"
      );
    }
  } catch (e) {
    assert.fail(e);
  }
};

module.exports = checkBalanceDelta;
