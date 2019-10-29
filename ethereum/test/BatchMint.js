require("@openzeppelin/test-helpers/configure")({ environment: "truffle", provider: web3.currentProvider });

const GeoToken = artifacts.require("./GeoToken.sol");
const BatchMint = artifacts.require("./BatchMint.sol");
const { symbol, name } = require("./helpers").geoconstants;
const { toWei, fromWei } = require("web3-utils");
const { BN, expectEvent, expectRevert, singletons } = require("@openzeppelin/test-helpers");

contract("BatchMint", ([erc1820funder, geodb, ...accounts]) => {
  let tokenContract, batchMintContract;

  before("Fund ERC1820 account and deploy ERC1820 registry", async () => {
    erc1820 = await singletons.ERC1820Registry(erc1820funder);
  });

  beforeEach("Deploy GeoToken and a GeoTokenLock", async () => {
    tokenContract = await GeoToken.new(name, symbol, [], { from: geodb });
    batchMintContract = await BatchMint.new(tokenContract.address, { from: geodb });
    tokenContract.transferOwnership(batchMintContract.address, { from: geodb });
  });

  it("allows batch minting from original owner", async () => {
    let amounts = [];

    accounts.forEach(account => amounts.push(toWei(new BN(`${Math.ceil(Math.random() * 10)}`), "ether")));

    const receipt = await batchMintContract.batchMint(accounts, amounts, { from: geodb });

    await expectEvent.inTransaction(receipt.receipt.transactionHash, tokenContract, "LogReward", {
      sender: batchMintContract.address,
      origin: geodb,
      to: accounts[0],
      amount: amounts[0]
    });
  });
});
