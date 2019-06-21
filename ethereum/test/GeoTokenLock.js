const GeoToken = artifacts.require("GeoToken.sol");
const GeoTokenLock = artifacts.require("./GeoTokenLock.sol");
const { BN, expectEvent } = require("openzeppelin-test-helpers");
const moment = require("moment");

contract("GeoTokenLock", ([geodb, beneficiary, ...accounts]) => {
  let tokenContract, lockContract;

  beforeEach("Deploy GeoToken and a GeoTokenLock", async () => {
    tokenContract = await GeoToken.new({ from: geodb });

    const releaseTime = moment(Date.now())
      .add(1, "days")
      .unix();

    lockContract = await GeoTokenLock.new(tokenContract.address, beneficiary, releaseTime, {
      from: geodb
    });

    await tokenContract.transfer(lockContract.address, "100", { from: geodb });
  });

  it("initializes correctly", async () => {
    assert.strictEqual(tokenContract.address, await lockContract.token(), "Address is not the same");
  });
});
