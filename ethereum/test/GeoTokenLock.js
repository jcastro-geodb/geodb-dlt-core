const GeoToken = artifacts.require("GeoToken.sol");
const GeoTokenLock = artifacts.require("./GeoTokenLock.sol");
const { BN, expectEvent, shouldFail } = require("openzeppelin-test-helpers");
const { toWei } = require("web3-utils");
const moment = require("moment");
const { timeMachine } = require("./helpers");

contract("GeoTokenLock", ([geodb, beneficiary, ...accounts]) => {
  let tokenContract, lockContract, initializationLogs;

  const amountToLock = new BN(toWei("1", "shannon"));

  const daysLocked = 180;

  beforeEach("Deploy GeoToken and a GeoTokenLock", async () => {
    tokenContract = await GeoToken.new({ from: geodb });

    const lastBlock = await web3.eth.getBlockNumber();
    const now = (await web3.eth.getBlock(lastBlock)).timestamp;

    lockContract = await GeoTokenLock.new(tokenContract.address, beneficiary, `${daysLocked}`, {
      from: geodb
    });

    await tokenContract.transfer(lockContract.address, amountToLock.toString(), { from: geodb });
    const { logs } = await lockContract.setLockedBalance({ from: geodb });
    initializationLogs = logs;
  });

  it("initializes correctly", async () => {
    // Token address
    (await lockContract.token()).should.be.equal(tokenContract.address);
    // Beneficiary
    (await lockContract.beneficiary()).should.be.equal(beneficiary);

    const lockTime = await lockContract.lockTime();
    const oneDayInSeconds = await lockContract.oneDayInSeconds();

    (await lockContract.lockTime()).should.be.bignumber.equal(
      new BN(`${moment.duration(daysLocked, "days").asSeconds()}`)
    );
  });

  describe("Contract operation", () => {
    describe("Normal operation", () => {
      it("allows to lock balance in the contract", async () => {
        (await tokenContract.balanceOf(lockContract.address)).should.be.bignumber.equal(amountToLock);

        (await lockContract.lockedAmount()).should.be.bignumber.equal(amountToLock);

        const event = expectEvent.inLogs(initializationLogs, "LogBalanceLocked", { sender: geodb });

        event.args.lockedAmount.should.be.bignumber.equal(amountToLock);
      });

      describe("claimBack()", () => {});

      describe("computeAllowance()", () => {});

      describe("getElapsedTime()", () => {});

      describe("unlock()", () => {
        it("Allows unlocking the full balance after the lock time", async () => {
          await timeMachine.advanceTime(moment.duration({ days: daysLocked, hours: 1 }).asSeconds(), web3);

          const { logs } = await lockContract.unlock(amountToLock.toString(), { from: beneficiary });

          (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock);

          const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });

          event.args.unlockedAmount.should.be.bignumber.equal(amountToLock);
        });

        it("allows to retrieve additional locked balance after the lock time", async () => {
          await timeMachine.advanceTime(moment.duration({ days: daysLocked, hours: 1 }).asSeconds(), web3);
          await lockContract.unlock(amountToLock);

          tokenContract.transfer(lockContract.address, amountToLock);

          const { logs } = await lockContract.unlock(amountToLock, { from: beneficiary });

          (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock.mul(new BN("2")));

          const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });

          event.args.unlockedAmount.should.be.bignumber.equal(amountToLock);
        });

        it("rejects unlocking more than it is allowed", async () => {
          const allowance = (await lockContract.computeAllowance()).add(new BN("1"));

          await shouldFail.reverting.withMessage(
            lockContract.unlock(allowance, { from: beneficiary }),
            "GeoTokenLock: You are trying to unlock more funds than what you are allowed right now"
          );
        });

        it("allows unlocking allowances in arbitrary - compliant steps and then the remainder after the lock time", async () => {
          const lockTime = await lockContract.lockTime();
          const ethereumDaysLocked = moment.duration(lockTime.toNumber(), "seconds").asDays();

          const halfOfLockTimeInDays = parseInt(ethereumDaysLocked / 2);

          for (let i = 1; i <= halfOfLockTimeInDays; i++) {
            const delta = moment.duration(1, "days").asSeconds();

            await timeMachine.advanceTime(delta, web3);

            const allowance = await lockContract.computeAllowance();

            const oldBeneficiaryBalance = await tokenContract.balanceOf(beneficiary);
            const oldLockContractBalance = await tokenContract.balanceOf(lockContract.address);

            const withdrawAmount = allowance.sub(oldBeneficiaryBalance);

            const { logs } = await lockContract.unlock(withdrawAmount.toString(), {
              from: beneficiary
            });

            const newBeneficiaryBalance = await tokenContract.balanceOf(beneficiary);
            const newLockContractBalance = await tokenContract.balanceOf(lockContract.address);
            const elapsedTime = await lockContract.getElapsedTime();

            newBeneficiaryBalance.sub(oldBeneficiaryBalance).should.be.bignumber.equal(withdrawAmount);
            oldLockContractBalance.sub(newLockContractBalance).should.be.bignumber.equal(withdrawAmount);

            const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });

            event.args.unlockedAmount.should.be.bignumber.equal(withdrawAmount);

            newBeneficiaryBalance.should.be.bignumber.lte(amountToLock.mul(elapsedTime).div(lockTime));
          }

          await timeMachine.advanceTime(
            moment.duration(ethereumDaysLocked - halfOfLockTimeInDays, "days").asSeconds(),
            web3
          );

          const remainder = await tokenContract.balanceOf(lockContract.address);

          const { logs } = await lockContract.unlock(remainder.toString(), { from: beneficiary });

          (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock);
        });
      });

      it("rejects transfer()");
      it("rejects approve()");
      it("rejects transferFrom()");
    });
  });
});
