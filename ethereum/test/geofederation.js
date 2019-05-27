const GeoToken = artifacts.require("GeoToken.sol");
const GeoFederation = artifacts.require("GeoFederation.sol");

const { initialMinimumFederationStake } = require("./helpers/geoconstants");

const { BN, expectEvent, shouldFail } = require("openzeppelin-test-helpers");

contract("GeoFederation", ([_, geodb, presaleHolder, ...accounts]) => {
  beforeEach("Deploy token contract and federation contract", async () => {
    this.token = await GeoToken.new(
      [presaleHolder],
      [initialMinimumFederationStake],
      { from: geodb }
    );

    this.federation = await GeoFederation.new(this.token.address, {
      from: geodb
    });

    await this.token.approve(
      this.federation.address,
      initialMinimumFederationStake,
      {
        from: geodb
      }
    );
    await this.federation.increaseStake(initialMinimumFederationStake, {
      from: geodb
    });
  });

  describe("Contract initialization", () => {
    it("signs GeoDB as first federation member", async () => {
      const federationStake = await this.federation.federationStakes(geodb);

      federationStake.stake.should.be.bignumber.equal(
        initialMinimumFederationStake
      );
      federationStake.approved.should.be.equal(true);
    });
  });

  describe("Federation join process", () => {
    it("allows to request federation join through a new join ballot");
  });

  describe("Token - Federation contract interaction", () => {
    it("allows token minting from federation");
  });
});
