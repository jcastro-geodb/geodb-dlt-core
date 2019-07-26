const GeoToken = artifacts.require("./GeoToken.sol");
const GeoTokenLockUnitary = artifacts.require("./GeoTokenLockUnitary.sol");
const { BN, expectEvent, expectRevert, singletons, time, constants } = require("openzeppelin-test-helpers");
const { toWei, fromWei } = require("web3-utils");
const { preAssignedSupply, symbol, name } = require("./helpers").geoconstants;
const { ErrorMsgs } = require("./helpers");
const { erc777BalanceDelta } = require("./helpers").balances;

contract("GeoTokenLockUnitary", ([erc1820funder, geodb, beneficiary, ...accounts]) => {
  let erc1820, tokenContract, lockContract;

  const ZERO_UINT = new BN("0");
  const daysLocked = new BN(`${18 * 30}`); // 18 months
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
      (await lockContract.locks(geodb)).balance.should.be.bignumber.equal(amountToLock);

      await expectEvent.inTransaction(tx, GeoTokenLockUnitary, "LogTokensReceived", {
        operator: geodb,
        from: geodb,
        amount: amountToLock
      });
    });

    it("assigns the balance to the owner if sent by the other address", async () => {
      const { tx, logs } = await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: accounts[0] });

      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.locks(geodb)).balance.should.be.bignumber.equal(amountToLock);

      await expectEvent.inTransaction(tx, GeoTokenLockUnitary, "LogTokensReceived", {
        operator: accounts[0],
        from: accounts[0],
        amount: amountToLock
      });
    });

    it("keeps incrementing owner's balance as new transfers are done to the contract", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });

      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.locks(geodb)).balance.should.be.bignumber.equal(amountToLock);

      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: accounts[0] });
      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await tokenContract.balanceOf(lockContract.address)).should.be.bignumber.equal(amountToLock.mul(new BN("2")));
      (await lockContract.locks(geodb)).balance.should.be.bignumber.equal(amountToLock.mul(new BN("2")));
    });
  });

  describe("lock()", async () => {
    beforeEach("send tokens to the contract", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
    });

    it("allows to lock tokens for a beneficiary", async () => {
      const { tx, logs } = await lockContract.lock(beneficiary, amountToLock, daysLocked, { from: geodb });

      const currentTimestamp = await time.latest();
      const unlockTimestamp = currentTimestamp.add(time.duration.days(daysLocked));

      const beneficiaryLock = await lockContract.locks(beneficiary);

      beneficiaryLock.balance.should.be.bignumber.equal(amountToLock);
      beneficiaryLock.withdrawn.should.be.bignumber.equal(ZERO_UINT);
      beneficiaryLock.lockTimestamp.should.be.bignumber.equal(currentTimestamp);
      beneficiaryLock.unlockTimestamp.should.be.bignumber.equal(unlockTimestamp);

      const ownerLock = await lockContract.locks(geodb);
      ownerLock.balance.should.be.bignumber.equal(ZERO_UINT);

      await expectEvent.inTransaction(tx, GeoTokenLockUnitary, "LogTokensLocked", {
        to: beneficiary,
        amount: amountToLock,
        unlockTimestamp
      });
    });

    it("rejects if the caller is not the owner", async () => {
      await expectRevert.unspecified(lockContract.lock(beneficiary, amountToLock, daysLocked, { from: beneficiary }));
    });

    it("rejects if the contract is paused", async () => {
      await lockContract.pause({ from: geodb });
      await expectRevert.unspecified(lockContract.lock(beneficiary, amountToLock, daysLocked, { from: geodb }));
    });

    it("rejects locking to the 0x0 address", async () => {
      await expectRevert(
        lockContract.lock(constants.ZERO_ADDRESS, amountToLock, daysLocked, { from: geodb }),
        ErrorMsgs.cannotLockAmountsForZeroAddress
      );
    });

    it("rejects locking to the owner address", async () => {
      await expectRevert(
        lockContract.lock(geodb, amountToLock, daysLocked, { from: geodb }),
        ErrorMsgs.cannotSelfLockTokens
      );
    });

    it("rejects locking 0", async () => {
      await expectRevert(
        lockContract.lock(beneficiary, ZERO_UINT, daysLocked, { from: geodb }),
        ErrorMsgs.theAmountToLockMustBeGreaterThanZero
      );
    });

    it("rejects locking for 0 days", async () => {
      await expectRevert(
        lockContract.lock(beneficiary, amountToLock, ZERO_UINT, { from: geodb }),
        ErrorMsgs.lockTimeMustBeGreaterThanZero
      );
    });

    it("rejects if the beneficiary already has locked tokens", async () => {
      await lockContract.lock(beneficiary, new BN("1"), daysLocked, { from: geodb });

      await expectRevert(
        lockContract.lock(beneficiary, new BN("1"), daysLocked, { from: geodb }),
        ErrorMsgs.thisAddressAlreadyHasFundsLocked
      );
    });
  });

  describe("batchLock()", () => {
    beforeEach("send tokens to the contract", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
    });

    it("allows to lock for a batch of accounts", async () => {
      const dividedLockAmount = amountToLock.div(new BN(`${accounts.length}`));

      const { tx, logs } = await lockContract.batchLock(accounts, dividedLockAmount, daysLocked, { from: geodb });

      const currentTimestamp = await time.latest();
      const unlockTimestamp = currentTimestamp.add(time.duration.days(daysLocked));

      for (let i = 0; i < accounts.length; i++) {
        const beneficiaryLock = await lockContract.locks(accounts[i]);

        beneficiaryLock.balance.should.be.bignumber.equal(dividedLockAmount);
        beneficiaryLock.withdrawn.should.be.bignumber.equal(ZERO_UINT);
        beneficiaryLock.lockTimestamp.should.be.bignumber.equal(currentTimestamp);
        beneficiaryLock.unlockTimestamp.should.be.bignumber.equal(unlockTimestamp);

        await expectEvent.inTransaction(tx, GeoTokenLockUnitary, "LogTokensLocked", {
          to: accounts[i],
          amount: dividedLockAmount,
          unlockTimestamp
        });
      }

      const ownerLock = await lockContract.locks(geodb);
      ownerLock.balance.should.be.bignumber.equal(
        amountToLock.sub(dividedLockAmount.mul(new BN(`${accounts.length}`)))
      );
    });

    it("rejects if the accounts list is empty", async () => {
      await expectRevert(
        lockContract.batchLock([], amountToLock, daysLocked, { from: geodb }),
        ErrorMsgs.emptyBeneficiariesList
      );
    });
  });

  describe("send()", () => {});

  describe("unlock()", () => {});

  describe("ownerUnlock()", () => {});

  describe("ownerBatchUnlock()", () => {});
});
