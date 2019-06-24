const GeoToken = artifacts.require("GeoToken.sol");
const GeoTokenLock = artifacts.require("./GeoTokenLock.sol");
const { BN, expectEvent } = require("openzeppelin-test-helpers");
const { toWei } = require("web3-utils");
const moment = require("moment");
const { timeMachine } = require("./helpers");

contract("GeoTokenLock", ([geodb, beneficiary, ...accounts]) => {
  let tokenContract, lockContract, initializationLogs;

  const amountToLock = new BN(toWei("1", "shannon"));

  const daysLocked = 180;
  let releaseTime;

  beforeEach("Deploy GeoToken and a GeoTokenLock", async () => {
    tokenContract = await GeoToken.new({ from: geodb });

    const lastBlock = await web3.eth.getBlockNumber();
    const now = (await web3.eth.getBlock(lastBlock)).timestamp;
    releaseTime = moment(now * 1000) // millis
      .add(daysLocked, "days");

    // console.log("Web3 time: " + moment(now * 1000).format("DD/MM/YYYY HH:mm"));
    // console.log("Release time: " + releaseTime.format("DD/MM/YYYY HH:mm"));
    // // console.log(releaseTime);
    //
    // console.log("Lock time duration local: " + moment.duration((releaseTime.unix() - now) * 1000).asDays());
    //
    // try {
    //   const time = (await tokenContract.returnBlockTime()).mul(new BN("1000")).toNumber();
    //   console.log("EVM time: " + moment(time).format("DD/MM/YYYY HH:mm"));
    //   const test = await tokenContract.calculateLockTime(releaseTime.unix());
    //   console.log("Calculated lock time: " + test.toString());
    // } catch (e) {
    //   console.log("Peta");
    //   console.error(e);
    // }

    lockContract = await GeoTokenLock.new(tokenContract.address, beneficiary, releaseTime.unix(), {
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

    // Duration of the lock: it depends of the EVM timestamp.
    (await lockContract.lockTime()).should.be.bignumber.gte(
      new BN(`${moment.duration({ days: daysLocked - 1, hours: 23 }).asSeconds()}`)
    );

    (await lockContract.lockTime()).should.be.bignumber.lte(
      new BN(`${moment.duration({ days: daysLocked, hours: 1 }).asSeconds()}`)
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

      describe("Unlock", () => {
        it("Allows unlocking the full balance after the lock time", async () => {
          await timeMachine.advanceTime(moment.duration({ days: daysLocked, hours: 2 }).asSeconds(), web3);

          const { logs } = await lockContract.unlock(amountToLock.toString(), { from: beneficiary });

          (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock);
        });

        it("Allows unlocking an allowance each day", async () => {
          const allowance = amountToLock.div(new BN(daysLocked.toString()));

          for (let i = 1; i < daysLocked; i++) {
            await timeMachine.advanceTime(moment.duration(1, "days").asSeconds(), web3);

            const { logs } = await lockContract.unlock(allowance.toString(), {
              from: beneficiary
            });

            (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(allowance.mul(new BN(`${i}`)));
            // lockContract balance check

            const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });

            event.args.unlockedAmount.should.be.bignumber.equal(allowance);
          }
        });
      });

      it("rejects transfer()");
      it("rejects approve()");
      it("rejects transferFrom()");
    });
  });
});
