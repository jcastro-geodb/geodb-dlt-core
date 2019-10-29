const GeoToken = artifacts.require("./GeoToken.sol");
const GeoTokenLock = artifacts.require("./GeoTokenLock.sol");
const { BN, expectEvent, expectRevert, singletons, time } = require("@openzeppelin/test-helpers");
const { toWei, fromWei } = require("web3-utils");
const { preAssignedSupply, symbol, name } = require("./helpers").geoconstants;
const { ErrorMsgs } = require("./helpers");
const { erc777BalanceDelta } = require("./helpers").balances;

contract("GeoTokenLock", ([erc1820funder, geodb, beneficiary, ...accounts]) => {
  let erc1820, tokenContract, lockContract;

  const daysLocked = new BN("180");

  const amountToLock = new BN(toWei("1", "ether")); // GEO follows the same decimals structure as ETH

  before("Fund ERC1820 account and deploy ERC1820 registry", async () => {
    erc1820 = await singletons.ERC1820Registry(erc1820funder);
  });

  beforeEach("Deploy GeoToken and a GeoTokenLock", async () => {
    tokenContract = await GeoToken.new(name, symbol, [], { from: geodb });

    lockContract = await GeoTokenLock.new(tokenContract.address, beneficiary, daysLocked, {
      from: geodb
    });
  });

  it("initializes correctly", async () => {
    // Token address
    (await lockContract.token()).should.be.equal(tokenContract.address);
    // Beneficiary
    (await lockContract.beneficiary()).should.be.equal(beneficiary);

    (await lockContract.lockTimestamp()).should.be.bignumber.equal(await time.latest());
    (await lockContract.unlockTimestamp()).should.be.bignumber.equal(
      time.duration.days(daysLocked.toNumber()).add(await time.latest())
    );

    (await erc1820.getInterfaceImplementer(
      lockContract.address,
      "0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895"
    )).should.be.equal(lockContract.address);

    (await erc1820.getInterfaceImplementer(
      lockContract.address,
      "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b"
    )).should.be.equal(lockContract.address);
  });

  describe("Contract operation", () => {
    describe("Sending tokens to the contract", () => {
      it("acknowledges the received tokens and locks them", async () => {
        const { tx } = await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });

        (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
        (await lockContract.lockedAmount()).should.be.bignumber.equal(amountToLock);

        await expectEvent.inTransaction(tx, GeoTokenLock, "LogTokensReceived", {
          operator: geodb,
          from: geodb,
          amount: amountToLock
        });
      });
    });

    describe("computeAllowance()", () => {
      beforeEach("lock some tokens", async () => {
        await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
      });

      it("returns 50% when 50% of the lock days have passed with a tolerance of 0.0001%", async () => {
        const lockTimestamp = await lockContract.lockTimestamp();
        await time.increaseTo(lockTimestamp.add(time.duration.days(daysLocked.div(new BN("2")))));

        const tolerance = amountToLock.div(new BN("1000000"));
        const upperBound = amountToLock.div(new BN("2")).add(tolerance);
        const lowerBound = amountToLock.div(new BN("2")).sub(tolerance);

        const allowance = await lockContract.computeAllowance();

        allowance.should.be.bignumber.lte(upperBound);
        allowance.should.be.bignumber.gte(lowerBound);
      });

      it("returns 100% after the lock time", async () => {
        const lockTimestamp = await lockContract.lockTimestamp();
        await time.increaseTo(lockTimestamp.add(time.duration.days(daysLocked)));

        (await lockContract.computeAllowance()).should.be.bignumber.gte(amountToLock);
      });
    });
  });

  describe("unlock()", async () => {
    beforeEach("lock some tokens", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
    });

    describe("Normal operation", async () => {
      it("allows to unlock 50% of funds after 50% days have passed with a 0.0001% tolerance", async () => {
        const lockTimestamp = await lockContract.lockTimestamp();
        const targetTimestamp = lockTimestamp.add(time.duration.days(daysLocked.div(new BN("2"))));

        await time.increaseTo(targetTimestamp);

        const allowance = await lockContract.computeAllowance();

        const { tx, logs } = await lockContract.unlock(allowance, { from: beneficiary });

        const tolerance = amountToLock.div(new BN("1000000"));
        const upperBound = amountToLock.div(new BN("2")).add(tolerance);
        const lowerBound = amountToLock.div(new BN("2")).sub(tolerance);

        const delta = await erc777BalanceDelta(beneficiary, tokenContract);

        delta.should.be.bignumber.lte(upperBound);
        delta.should.be.bignumber.gte(lowerBound);

        await expectEvent.inTransaction(tx, GeoTokenLock, "LogTokensSent", {
          operator: lockContract.address,
          from: lockContract.address,
          amount: allowance
        });
      });

      it("allows to unlock 100% of funds after the lock time", async () => {
        await time.increase(time.duration.days(daysLocked));

        const allowance = await lockContract.computeAllowance();

        const { tx, logs } = await lockContract.unlock(allowance, { from: beneficiary });

        const delta = await erc777BalanceDelta(beneficiary, tokenContract);

        delta.should.be.bignumber.equal(amountToLock);

        await expectEvent.inTransaction(tx, GeoTokenLock, "LogTokensSent", {
          operator: lockContract.address,
          from: lockContract.address,
          amount: amountToLock
        });
      });
    });

    describe("Prohibited operation", () => {
      it("rejects taking more allowance than permitted", async () => {
        await time.increase(time.duration.days(daysLocked.div(new BN("2"))));
        const allowance = await lockContract.computeAllowance();

        await expectRevert(
          lockContract.unlock(allowance.add(new BN("1")), { from: beneficiary }),
          ErrorMsgs.blockedFunds
        );
      });
    });
  });

  describe("Send tokens to contract", async () => {
    it("will update the locked amount for the beneficiary", async () => {
      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });

      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.lockedAmount()).should.be.bignumber.equal(amountToLock);

      await tokenContract.send(lockContract.address, amountToLock, "0x0", { from: geodb });
      (await erc777BalanceDelta(lockContract.address, tokenContract)).should.be.bignumber.equal(amountToLock);
      (await lockContract.lockedAmount()).should.be.bignumber.equal(amountToLock.mul(new BN("2")));
    });

    it("will reject if tokens different from the GEO are being sent to this contract", async function() {
      const fakeGeo = await GeoToken.new(name, symbol, [], { from: geodb });

      await expectRevert(
        fakeGeo.send(lockContract.address, amountToLock, "0x0", { from: geodb }),
        ErrorMsgs.onlyGeoTokens
      );
    });
  });
});
