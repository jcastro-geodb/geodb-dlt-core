const GeoToken = artifacts.require("./GeoToken.sol");
const { BN, expectEvent, expectRevert, singletons } = require("openzeppelin-test-helpers");
const { toWei, fromWei } = require("web3-utils");
const { geoconstants, ErrorMsgs } = require("./helpers");

const { symbol, name } = geoconstants;

const preAssignedTokensInMillions = new BN("300");
const tokenDecimals = new BN("18");

contract("GeoToken", ([erc1820funder, geodb, ...accounts]) => {
  let erc1820, contract;

  before("Fund ERC1820 account and deploy ERC1820 registry", async () => {
    erc1820 = await singletons.ERC1820Registry(erc1820funder);
  });

  beforeEach("Initialize contract", async () => {
    contract = await GeoToken.new(name, symbol, [], { from: geodb });
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
        sender: from,
        origin: from,
        to,
        amount
      });
    });

    it(`supply tops with ${fromWei(geoconstants.maxSupply, "ether")} tokens`, async () => {
      const from = geodb;
      const to = accounts[0];
      const amount = geoconstants.maxSupply.sub(geoconstants.preAssignedSupply);

      const { logs } = await contract.releaseReward(to, amount, { from });
      (await contract.totalSupply()).should.be.bignumber.equal(geoconstants.maxSupply);

      await expectRevert.unspecified(contract.releaseReward(to, new BN("1"), { from }));
    });
  });
});
