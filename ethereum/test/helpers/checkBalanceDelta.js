const assert = require("assert");

const checkBalanceDelta = async (
  deltas,
  accounts,
  oldBalances,
  rootSmartContract
) => {
  try {
    for (let delta of deltas) {
      let balance;

      if (delta.org === "totalStake") {
        balance = (await rootSmartContract.totalStake()).toNumber();
      } else {
        const address =
          delta.org === "contract"
            ? rootSmartContract.address
            : accounts[delta.org].address;

        balance = (await rootSmartContract.balanceOf(address)).toNumber();
      }

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
