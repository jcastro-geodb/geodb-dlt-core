const GeoToken = artifacts.require("GeoToken.sol");
const GeoFederation = artifacts.require("GeoFederation.sol");

const { initialMinimumFederationStake } = require("./helpers/geoconstants");

const { BN, expectEvent, shouldFail } = require("openzeppelin-test-helpers");

contract("GeoFederation", ([_, geodb, presaleHolder, partner, ...accounts]) => {
  beforeEach("Deploy token contract and federation contract", async () => {
    this.token = await GeoToken.new([presaleHolder], [initialMinimumFederationStake], { from: geodb });

    this.federation = await GeoFederation.new(this.token.address, {
      from: geodb
    });

    this.token.transferOwnership(this.federation.address, { from: geodb });

    await this.token.approve(this.federation.address, initialMinimumFederationStake, {
      from: geodb
    });

    await this.federation.increaseStake(initialMinimumFederationStake, {
      from: geodb
    });

    await this.token.transfer(partner, initialMinimumFederationStake.mul(new BN("10")), { from: geodb });
  });

  describe("Contract initialization", () => {
    it("signs GeoDB as first federation member", async () => {
      const federationStake = await this.federation.federationStakes(geodb);

      federationStake.stake.should.be.bignumber.equal(initialMinimumFederationStake);
      federationStake.approved.should.be.equal(true);
    });

    it("has balance assigned to the federation", async () => {
      (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(initialMinimumFederationStake);
    });

    it("transfers ownership to the federation contract", async () => {
      const owner = await this.token.owner();
      owner.should.be.equal(this.federation.address);
    });
  });

  describe("Federation join process", () => {
    describe("When creating a ballot", () => {
      it("allows to make a new join ballot", async () => {
        await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
        const { tx, logs } = await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });

        const event = expectEvent.inLogs(logs, "LogNewJoinBallot", {
          sender: partner
        });

        event.args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

        (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
          initialMinimumFederationStake.mul(new BN("2"))
        );
      });
    });
  });

  describe("Token - Federation contract interaction", () => {
    it("allows token minting from federation");
  });
});
