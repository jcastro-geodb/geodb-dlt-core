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
      describe("With sufficient funds", () => {
        it("allows to make a new join ballot", async () => {
          await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
          const { tx, logs } = await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });

          const event = expectEvent.inLogs(logs, "LogNewJoinBallot", { sender: partner });

          event.args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

          (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
            initialMinimumFederationStake.mul(new BN("2"))
          );
        });

        it("allows to vote the ballot", async () => {
          await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
          await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });

          const { tx, logs } = await this.federation.voteJoinBallot(partner, { from: geodb });

          const event = expectEvent.inLogs(logs, "LogVoteJoinBallot", { sender: geodb, ballot: partner });

          event.args.voteWeight.should.be.bignumber.equal(initialMinimumFederationStake);
          event.args.approvals.should.be.bignumber.equal(initialMinimumFederationStake);
        });

        it("resolves ballot positively if there is quorum", async () => {
          await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
          await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });
          await this.federation.voteJoinBallot(partner, { from: geodb });

          const { tx, logs } = await this.federation.resolveJoinBallot({ from: partner });

          expectEvent
            .inLogs(logs, "LogNewMember", { sender: partner })
            .args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

          expectEvent.inLogs(logs, "LogResolveJoinBallot", { sender: partner }).args.result.should.be.equal(true);

          (await this.federation.isFederated(partner)).should.be.equal(true);
        });

        it("resolves ballot negatively and retrieves stake if there is no quorum", async () => {
          await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
          await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });

          const { tx, logs } = await this.federation.resolveJoinBallot({ from: partner });

          expectEvent.inLogs(logs, "LogResolveJoinBallot", { sender: partner }).args.result.should.be.equal(false);

          (await this.federation.isFederated(partner)).should.be.equal(false);

          (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
            initialMinimumFederationStake
          );
        });
      });

      describe("Without sufficient funds", () => {
        it("rejects ballot creation");
      });
    });
  });

  describe("Token - Federation contract interaction", () => {
    it("allows token minting from federation", async () => {
      const { tx, logs } = await this.federation.releaseReward(accounts[0], "100", { from: geodb });
    });
  });
});
