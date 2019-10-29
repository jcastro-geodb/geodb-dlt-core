require("@openzeppelin/test-helpers/configure")({ environment: "truffle", provider: web3.currentProvider });

const GeoToken = artifacts.require("./GeoToken.sol");
const BatchMint = artifacts.require("./BatchMint.sol");
const { symbol, name } = require("./helpers").geoconstants;
const { toWei, fromWei } = require("web3-utils");
const { BN, expectEvent, expectRevert, singletons } = require("@openzeppelin/test-helpers");

contract("BatchMint", ([erc1820funder, geodb, minter, ...accounts]) => {
  let tokenContract, batchMintContract, mintedAmounts;

  before("Fund ERC1820 account and deploy ERC1820 registry", async () => {
    erc1820 = await singletons.ERC1820Registry(erc1820funder);
  });

  beforeEach("Deploy GeoToken and a GeoTokenLock", async () => {
    tokenContract = await GeoToken.new(name, symbol, [], { from: geodb });
    batchMintContract = await BatchMint.new(tokenContract.address, { from: geodb });
    tokenContract.transferOwnership(batchMintContract.address, { from: geodb });
    mintedAmounts = [];
    accounts.forEach(account => mintedAmounts.push(toWei(new BN(`${Math.ceil(Math.random() * 10)}`), "ether")));
  });

  it("allows batch minting from original owner", async () => {
    const receipt = await batchMintContract.batchMint(accounts, mintedAmounts, { from: geodb });

    for (let i = 0; i < mintedAmounts.length; i++) {
      await expectEvent.inTransaction(receipt.receipt.transactionHash, tokenContract, "LogReward", {
        sender: batchMintContract.address,
        origin: geodb,
        to: accounts[i],
        amount: mintedAmounts[i]
      });
    }
  });

  it("allows to add another minter", async () => {
    await batchMintContract.addMinter(minter, { from: geodb });

    const receipt = await batchMintContract.batchMint(accounts, mintedAmounts, { from: geodb });

    for (let i = 0; i < mintedAmounts.length; i++) {
      await expectEvent.inTransaction(receipt.receipt.transactionHash, tokenContract, "LogReward", {
        sender: batchMintContract.address,
        origin: geodb,
        to: accounts[i],
        amount: mintedAmounts[i]
      });
    }
  });

  it("allows to transfer ownership back", async () => {
    await batchMintContract.transferTokenOwnership(geodb, { from: geodb });
    (await tokenContract.owner()).should.be.equal(geodb);
  });
});
