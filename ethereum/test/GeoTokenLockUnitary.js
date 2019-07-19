const GeoToken = artifacts.require("./GeoToken.sol");
const GeoTokenLockUnitary = artifacts.require("./GeoTokenLockUnitary.sol");
const { BN, expectEvent, expectRevert, singletons, time } = require("openzeppelin-test-helpers");
const { toWei, fromWei } = require("web3-utils");
const { preAssignedSupply, symbol, name } = require("./helpers").geoconstants;
const { ErrorMsgs } = require("./helpers");
const { erc777BalanceDelta } = require("./helpers").balances;

contract("GeoTokenLockUnitary", ([erc1820funder, geodb, beneficiary, ...accounts]) => {
  let erc1820, tokenContract, lockContract;

  const daysLocked = new BN("180");

  const amountToLock = new BN(toWei("1", "ether")); // GEO follows the same decimals structure as ETH

  before("Fund ERC1820 account and deploy ERC1820 registry", async () => {
    erc1820 = await singletons.ERC1820Registry(erc1820funder);
  });

  beforeEach("Deploy GeoToken and a GeoTokenLockUnitary", async () => {
    tokenContract = await GeoToken.new(name, symbol, [], { from: geodb });

    lockContract = await GeoTokenLockUnitary.new(tokenContract.address, {
      from: geodb
    });
  });

  it("initializes correctly", async () => {
    // Token address
    (await lockContract.token()).should.be.equal(tokenContract.address);

    (await erc1820.getInterfaceImplementer(
      lockContract.address,
      "0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895"
    )).should.be.equal(lockContract.address);

    (await erc1820.getInterfaceImplementer(
      lockContract.address,
      "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b"
    )).should.be.equal(lockContract.address);
  });
});
