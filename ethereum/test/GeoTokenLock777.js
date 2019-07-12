const GeoToken = artifacts.require("./GeoToken777.sol");
const GeoTokenLock = artifacts.require("./GeoTokenLock777.sol");
const { BN, expectEvent, shouldFail, singletons } = require("openzeppelin-test-helpers");
const { toWei } = require("web3-utils");
const { preAssignedSupply, symbol, name } = require("./helpers").geoconstants;
const moment = require("moment");
const { timeMachine } = require("./helpers");

contract("GeoTokenLock", ([erc1820funder, geodb, beneficiary, ...accounts]) => {
  let erc1820contractAddress, tokenContract, lockContract;

  const blocksPerDay = new BN("5760");

  const amountToLock = new BN(toWei("1", "shannon"));

  const daysLocked = new BN("180");

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

    const currentBlock = new BN(`${await web3.eth.getBlockNumber()}`);
    // const now = (await web3.eth.getBlock(lastBlock)).timestamp;

    // const lockTime = await lockContract.lockTime();
    // const oneDayInSeconds = await lockContract.oneDayInSeconds();

    (await lockContract.lockBlock()).should.be.bignumber.equal(currentBlock);
    (await lockContract.unlockBlock()).should.be.bignumber.equal(currentBlock.add(blocksPerDay.mul(daysLocked)));

    (await erc1820.getInterfaceImplementer(
      lockContract.address,
      "0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895"
    )).should.be.equal(lockContract.address);

    (await erc1820.getInterfaceImplementer(
      lockContract.address,
      "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b"
    )).should.be.equal(lockContract.address);
  });

  describe("Contract operation", () => {});

  // describe("Contract operation", () => {
  //   describe("Normal operation", () => {
  //     describe("claimBack()", () => {
  //       describe("Without funds", () => {
  //         it("rejects call if there are no funds", async () => {
  //           await shouldFail.reverting.withMessage(
  //             lockContract.claimBack(),
  //             "GeoTokenLock: This contract has no funds"
  //           );
  //         });
  //       });
  //
  //       describe("With funds", () => {
  //         beforeEach("Fund the lock", async () => {
  //           await tokenContract.transfer(lockContract.address, amountToLock.toString(), { from: geodb });
  //         });
  //
  //         it("allows to claimback the geo funds to the owner", async () => {
  //           const { logs } = await lockContract.claimBack();
  //
  //           (await tokenContract.balanceOf(geodb)).should.be.bignumber.equal(preAssignedSupply);
  //
  //           const event = expectEvent.inLogs(logs, "LogClaimBack", { sender: geodb });
  //
  //           event.args.balance.should.be.bignumber.equal(amountToLock);
  //         });
  //
  //         it("rejects call from non-owner", async () => {
  //           await shouldFail.reverting.withMessage(
  //             lockContract.claimBack({ from: beneficiary }),
  //             "Ownable: caller is not the owner"
  //           );
  //         });
  //
  //         it("rejects call if balance was locked", async () => {
  //           await lockContract.lockBalance({ from: geodb });
  //           await shouldFail.reverting.withMessage(lockContract.claimBack(), "Balance was already locked");
  //         });
  //       });
  //     });
  //
  //     describe("getElapsedTime()", () => {
  //       it("Calculates elapsed time correctly (max deviation: 12 hours)", async () => {
  //         const duration = { days: 3, hours: 12 };
  //         await timeMachine.advanceTime(moment.duration(duration).asSeconds(), web3);
  //
  //         assert.strictEqual(
  //           parseInt(moment.duration((await lockContract.getElapsedTime()).toNumber(), "seconds").asDays()),
  //           parseInt(moment.duration(duration).asDays())
  //         );
  //       });
  //     });
  //
  //     describe("lockBalance()", () => {
  //       it("allows to lock geo funds after transfering to the contract", async () => {
  //         await tokenContract.transfer(lockContract.address, amountToLock.toString(), { from: geodb });
  //         const { logs } = await lockContract.lockBalance({ from: geodb });
  //
  //         (await lockContract.lockedAmount()).should.be.bignumber.equal(amountToLock);
  //
  //         const event = expectEvent.inLogs(logs, "LogBalanceLocked", { sender: geodb });
  //
  //         event.args.lockedAmount.should.be.bignumber.equal(amountToLock);
  //       });
  //
  //       it("rejects to lock if no funds have been transferred", async () => {
  //         await shouldFail.reverting.withMessage(
  //           lockContract.lockBalance({ from: geodb }),
  //           "Not enough balance locked"
  //         );
  //       });
  //
  //       it("rejects to lock if funds have been locked before", async () => {
  //         await tokenContract.transfer(lockContract.address, amountToLock.toString(), { from: geodb });
  //         await lockContract.lockBalance({ from: geodb });
  //         await shouldFail.reverting.withMessage(
  //           lockContract.lockBalance({ from: geodb }),
  //           "Lock has been set already"
  //         );
  //       });
  //     });
  //
  //     describe("unlock()", () => {
  //       describe("When no funds have been transferred", () => {
  //         it("rejects unlocking", async () => {
  //           await shouldFail.reverting.withMessage(
  //             lockContract.unlock(amountToLock, { from: beneficiary }),
  //             "GeoTokenLock: You are trying to withdraw more tokens than what is locked in the contract"
  //           );
  //         });
  //       });
  //
  //       describe("When funds have not been locked", () => {
  //         beforeEach("transfer tokens", async () => {
  //           await tokenContract.transfer(lockContract.address, amountToLock.toString(), { from: geodb });
  //         });
  //
  //         it("rejects unlocking if balance has not been locked", async () => {
  //           await shouldFail.reverting.withMessage(
  //             lockContract.unlock(amountToLock, { from: beneficiary }),
  //             "GeoTokenLock: no tokens locked yet"
  //           );
  //         });
  //       });
  //
  //       describe("When funds have been locked", () => {
  //         beforeEach("Lock Geo tokens", async () => {
  //           await tokenContract.transfer(lockContract.address, amountToLock.toString(), { from: geodb });
  //           await lockContract.lockBalance({ from: geodb });
  //         });
  //
  //         it("allows unlocking the full balance after the lock time", async () => {
  //           await timeMachine.advanceTime(moment.duration({ days: daysLocked, hours: 1 }).asSeconds(), web3);
  //
  //           const { logs } = await lockContract.unlock(amountToLock.toString(), { from: beneficiary });
  //
  //           (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock);
  //
  //           const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });
  //
  //           event.args.unlockedAmount.should.be.bignumber.equal(amountToLock);
  //         });
  //
  //         it("allows to retrieve additional locked balance after the lock time", async () => {
  //           await timeMachine.advanceTime(moment.duration({ days: daysLocked, hours: 1 }).asSeconds(), web3);
  //           await lockContract.unlock(amountToLock, { from: beneficiary });
  //
  //           tokenContract.transfer(lockContract.address, amountToLock, { from: geodb });
  //
  //           const { logs } = await lockContract.unlock(amountToLock, { from: beneficiary });
  //
  //           (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock.mul(new BN("2")));
  //
  //           const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });
  //
  //           event.args.unlockedAmount.should.be.bignumber.equal(amountToLock);
  //         });
  //
  //         it("allows the contract owner to send the funds on behalf of the beneficiary", async () => {
  //           await timeMachine.advanceTime(moment.duration({ days: daysLocked, hours: 1 }).asSeconds(), web3);
  //
  //           const { logs } = await lockContract.unlock(amountToLock, { from: geodb });
  //
  //           (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock);
  //
  //           const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: geodb });
  //
  //           event.args.unlockedAmount.should.be.bignumber.equal(amountToLock);
  //         });
  //
  //         it("rejects unlocking more than it is allowed", async () => {
  //           const allowance = (await lockContract.computeAllowance()).add(new BN("100"));
  //
  //           await shouldFail.reverting.withMessage(
  //             lockContract.unlock(allowance, { from: beneficiary }),
  //             "GeoTokenLock: You are trying to unlock more funds than what you are allowed right now"
  //           );
  //         });
  //
  //         it("rejects call from all accounts except owner and beneficiary", async () => {
  //           await shouldFail.reverting.withMessage(
  //             lockContract.unlock(amountToLock, { from: accounts[0] }),
  //             "You must be the owner or beneficiary"
  //           );
  //         });
  //
  //         it("allows unlocking allowances in arbitrary - compliant steps and then the remainder after the lock time", async () => {
  //           const lockTime = await lockContract.lockTime();
  //           const ethereumDaysLocked = moment.duration(lockTime.toNumber(), "seconds").asDays();
  //
  //           const halfOfLockTimeInDays = parseInt(ethereumDaysLocked / 2);
  //
  //           for (let i = 1; i <= halfOfLockTimeInDays; i++) {
  //             const delta = moment.duration(1, "days").asSeconds();
  //
  //             await timeMachine.advanceTime(delta, web3);
  //
  //             const allowance = await lockContract.computeAllowance();
  //
  //             const oldBeneficiaryBalance = await tokenContract.balanceOf(beneficiary);
  //             const oldLockContractBalance = await tokenContract.balanceOf(lockContract.address);
  //
  //             const withdrawAmount = allowance.sub(oldBeneficiaryBalance);
  //
  //             const { logs } = await lockContract.unlock(withdrawAmount.toString(), {
  //               from: beneficiary
  //             });
  //
  //             const newBeneficiaryBalance = await tokenContract.balanceOf(beneficiary);
  //             const newLockContractBalance = await tokenContract.balanceOf(lockContract.address);
  //             const elapsedTime = await lockContract.getElapsedTime();
  //
  //             newBeneficiaryBalance.sub(oldBeneficiaryBalance).should.be.bignumber.equal(withdrawAmount);
  //             oldLockContractBalance.sub(newLockContractBalance).should.be.bignumber.equal(withdrawAmount);
  //
  //             const event = expectEvent.inLogs(logs, "LogBalanceUnlocked", { sender: beneficiary });
  //
  //             event.args.unlockedAmount.should.be.bignumber.equal(withdrawAmount);
  //
  //             newBeneficiaryBalance.should.be.bignumber.lte(amountToLock.mul(elapsedTime).div(lockTime));
  //           }
  //
  //           await timeMachine.advanceTime(
  //             moment.duration(ethereumDaysLocked - halfOfLockTimeInDays, "days").asSeconds(),
  //             web3
  //           );
  //
  //           const remainder = await tokenContract.balanceOf(lockContract.address);
  //
  //           const { logs } = await lockContract.unlock(remainder.toString(), { from: beneficiary });
  //
  //           (await tokenContract.balanceOf(beneficiary)).should.be.bignumber.equal(amountToLock);
  //         });
  //       });
  //     });
  //
  //     it("rejects transfer()", async () => {
  //       await shouldFail.reverting.withMessage(
  //         lockContract.transfer(accounts[0], amountToLock, { from: beneficiary }),
  //         "This contract does not allow transfer(). Use unlock() to use your available funds"
  //       );
  //     });
  //
  //     it("rejects approve()", async () => {
  //       await shouldFail.reverting.withMessage(
  //         lockContract.approve(accounts[0], amountToLock, { from: beneficiary }),
  //         "This contract does not allow approve(). Use unlock() to use your available funds"
  //       );
  //     });
  //
  //     it("rejects transferFrom()", async () => {
  //       await shouldFail.reverting.withMessage(
  //         lockContract.transferFrom(accounts[0], accounts[1], amountToLock, { from: beneficiary }),
  //         "This contract does not allow transferFrom(). Use unlock() to use your available funds"
  //       );
  //     });
  //   });
  // });
});
