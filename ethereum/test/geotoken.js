const GeoToken = artifacts.require("./GeoToken.sol");
const { BN, expectEvent } = require("openzeppelin-test-helpers");

contract("GeoToken", accounts => {
  before("Define accounts", () => {
    this.geodb = accounts[0];
    this.presaleHolders = accounts.slice(1, 6);
    let size = this.presaleHolders.length;
    this.presaleAmounts = [];
    while (size--) this.presaleAmounts.push(new BN(100000));
  });

  beforeEach("Initialize contract", async () => {
    this.contract = await GeoToken.new(
      this.presaleHolders,
      this.presaleAmounts
    );
  });

  describe("The contract is initialized correctly", () => {
    it("contract owner is geodb", async () => {
      (await this.contract.owner()).should.be.equal(this.geodb);
    });

    it("team allocation is 10000000000000", async () => {
      (await this.contract.balanceOf(this.geodb)).should.be.bignumber.equal(
        "10000000000000"
      );
    });

    it("holders allocation is 100000", async () => {
      for (let holder of this.presaleHolders) {
        (await this.contract.balanceOf(holder)).should.be.bignumber.equal(
          "100000"
        );
      }
    });
  });

  describe("The contract allows minting new tokens if called by owner", () => {
    const reward = new BN("10000");

    it("allows minting tokens", async () => {
      const from = this.geodb;
      const to = accounts[9];
      const amount = new BN("10000");

      const { logs } = await this.contract.releaseReward(to, amount, { from });

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
