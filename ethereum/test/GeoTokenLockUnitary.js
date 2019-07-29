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

  // GEO follows the same decimals structure as ETH, so we can use the fromWei and toWei utils from web3
  // The amount is computed so that the allowance per second is integral and has no remainder when divided by the daysLocked
  const amountToLock = toWei(daysLocked.mul(new BN("24")).mul(new BN("3600")), "ether");

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
    it("rejects if the token is not GeoToken");
    it("rejects if the operator is not the lock contract");
    it("rejects if spender is not the owner");
  });

  describe("lock()", async () => {
    beforeEach("sign the lock contract as operator for the owner", async () => {
      await tokenContract.authorizeOperator(lockContract.address, { from: geodb });
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
    beforeEach("sign the lock contract as operator for the owner", async () => {
      await tokenContract.authorizeOperator(lockContract.address, { from: geodb });
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

      // const ownerLock = await lockContract.locks(geodb);
      // ownerLock.balance.should.be.bignumber.equal(
      //   amountToLock.sub(dividedLockAmount.mul(new BN(`${accounts.length}`)))
      // );
    });

    it("rejects if the accounts list is empty", async () => {
      await expectRevert(
        lockContract.batchLock([], amountToLock, daysLocked, { from: geodb }),
        ErrorMsgs.emptyBeneficiariesList
      );
    });
  });

  describe("computeAllowance()", async () => {
    beforeEach("sign the lock contract as operator for the owner", async () => {
      await tokenContract.authorizeOperator(lockContract.address, { from: geodb });
      await lockContract.lock(beneficiary, amountToLock, daysLocked, { from: geodb });
    });
    it("is 0 at the start of a lock", async () => {
      (await lockContract.computeAllowance(beneficiary)).should.be.bignumber.equal(ZERO_UINT);
    });

    it("is half when 9 months have passed", async () => {
      await time.increase(time.duration.days(daysLocked.div(new BN("2"))));
      (await lockContract.computeAllowance(beneficiary)).should.be.bignumber.equal(amountToLock.div(new BN("2")));
    });

    it("is the full amount when 18 months have passed", async () => {
      await time.increase(time.duration.days(daysLocked));
    });
  });

  describe("send()", () => {
    beforeEach("send tokens to the contract and lock them", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
      await lockContract.lock(beneficiary, amountToLock, daysLocked, { from: geodb });
    });

    it("allows to unlock");
  });

  describe("unlock()", () => {});

  describe("ownerUnlock()", () => {});

  describe("ownerBatchUnlock()", () => {});
});
