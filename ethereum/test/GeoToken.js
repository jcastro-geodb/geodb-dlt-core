const GeoToken = artifacts.require("./GeoToken.sol");
const { BN, expectEvent } = require("openzeppelin-test-helpers");

const preAssignedTokensInMillions = new BN("300");
const tokenDecimals = new BN("18");

contract("GeoToken", ([geodb, ...accounts]) => {
  let contract;

  beforeEach("Initialize contract", async () => {
    contract = await GeoToken.new();
  });

  describe("The contract is initialized correctly", () => {
    it("contract owner is geodb", async () => {
      (await contract.owner()).should.be.equal(geodb);
    });

    it("team allocation is 300 millions tokens", async () => {
      const base = new BN("10");
      const exp = new BN("6");
      const millions = base.pow(exp);
      const decimals = base.pow(tokenDecimals);

      const preAssigned = preAssignedTokensInMillions.mul(millions).mul(decimals);

      (await contract.balanceOf(geodb)).should.be.bignumber.equal(preAssigned);
    });
  });

  describe("The contract allows minting new tokens if called by owner", () => {
    const reward = new BN("10000");

    it("allows minting tokens", async () => {
      const from = geodb;
      const to = accounts[0];
      const amount = new BN("10000");

      const { logs } = await contract.releaseReward(to, amount, { from });

      const event = expectEvent.inLogs(logs, "LogReward", {
        from,
        to,
        amount
      });

      event.args.from.should.be.equal(from);
      event.args.to.should.be.equal(to);
      event.args.amount.should.be.bignumber.equal(amount);
    });
  });
});
