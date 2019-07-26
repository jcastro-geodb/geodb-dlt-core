const GeoToken = artifacts.require("./GeoToken.sol");
const GeoTokenLockUnitary = artifacts.require("./GeoTokenLockUnitary.sol");
const { BN, expectEvent, expectRevert, singletons, time, constants } = require("openzeppelin-test-helpers");
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

    await tokenContract.send(accounts[0], amountToLock, "0x0", { from: geodb }); // Fund another account for external actions
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

  describe("Send tokens to the contract", () => {
    it("assigns the balance to the owner if sent by the owner", async () => {
      const { tx, logs } = await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });

      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.balances(geodb)).balance.should.be.bignumber.equal(amountToLock);

      await expectEvent.inTransaction(tx, GeoTokenLockUnitary, "LogTokensReceived", {
        operator: geodb,
        from: geodb,
        amount: amountToLock
      });
    });

    it("assigns the balance to the owner if sent by the other address", async () => {
      const { tx, logs } = await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: accounts[0] });

      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.balances(geodb)).balance.should.be.bignumber.equal(amountToLock);

      await expectEvent.inTransaction(tx, GeoTokenLockUnitary, "LogTokensReceived", {
        operator: accounts[0],
        from: accounts[0],
        amount: amountToLock
      });
    });

    it("keeps incrementing owner's balance as new transfers are done to the contract", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });

      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.balances(geodb)).balance.should.be.bignumber.equal(amountToLock);

      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: accounts[0] });
      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await tokenContract.balanceOf(lockContract.address)).should.be.bignumber.equal(amountToLock.mul(new BN("2")));
      (await lockContract.balances(geodb)).balance.should.be.bignumber.equal(amountToLock.mul(new BN("2")));
    });
  });

  describe("lock()", async () => {
    beforeEach("send tokens to the contract", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
    });

    it("allows to lock tokens for a beneficiary", async () => {});

    it("rejects if the beneficiary already has locked tokens");

    it("rejects if the caller is not the owner");

    it("rejects if the caller has not enough amount");

    it("rejects locking to the 0x0 address");

    it("rejects locking for 0 days");
  });

  describe("batchLock()", () => {});

  describe("send()", () => {});

  describe("unlock()", () => {});

  describe("ownerUnlock()", () => {});

  describe("ownerBatchUnlock()", () => {});
});
