const assert = require("assert");
const ganache = require("ganache-cli");
const ethers = require("ethers");
const EthersUtils = require("ethers").utils;
const Web3Utils = require("web3-utils");

// ###################
// # ETHEREUM SETUP
// ###################

require("events").EventEmitter.defaultMaxListeners = 100;

const ganacheOptions = {
  gasLimit: "8000000"
};

const ethersProvider = new ethers.providers.Web3Provider(
  ganache.provider(ganacheOptions)
);

const compiledGeoDBRoot = require("../build/contracts/GeoDB.json");

// ###################
// # ACCOUNTS
// ###################
let mnemonic;
let accounts = {};

// ###################
// # SMART CONTRACT
// ###################

let rootSmartContract;
let contractProxy = {};
let stakeRequirement = 0;

const errorMsgs = {
  stakedAmountIsNotEnough: "Staked amount is not enough",
  noStake: "There is no stake for this address",
  unauthorizedWithdrawal: "Unauthorized withdrawal",
  notEnoughVotes: "Voting stake is not enough",
  cannotVoteTwice: "You cannot vote twice",
  noSelfVoting:
    "Your votes will be automatically added when you call federationStakeWithdraw()",
  requestWithDrawalFirst: "Request stake withdrawal first"
};

// ###################
// # BALANCES
// ###################

let oldBalances = {};

// ###################
// # TESTING
// ###################

describe("GeoDBRoot", () => {
  before(async () => {
    // Accounts setup:
    mnemonic = ethersProvider._web3Provider.options.mnemonic;

    let index = 1;
    accounts["geodb"] = ethers.Wallet.fromMnemonic(mnemonic).connect(
      ethersProvider
    );
    accounts["org1"] = ethers.Wallet.fromMnemonic(
      mnemonic,
      `m/44'/60'/0'/0/${index++}`
    ).connect(ethersProvider);
    accounts["org2"] = ethers.Wallet.fromMnemonic(
      mnemonic,
      `m/44'/60'/0'/0/${index++}`
    ).connect(ethersProvider);
    accounts["org3"] = ethers.Wallet.fromMnemonic(
      mnemonic,
      `m/44'/60'/0'/0/${index++}`
    ).connect(ethersProvider);
  });

  describe("Basic staking test", () => {
    before("Contract deployment", async () => {
      let factory = new ethers.ContractFactory(
        compiledGeoDBRoot.abi,
        compiledGeoDBRoot.bytecode,
        accounts["geodb"]
      );

      rootSmartContract = await factory.deploy();
      await rootSmartContract.deployed();

      assert.ok(
        rootSmartContract.address && rootSmartContract.deployTransaction.hash,
        "Contract could not be deployed"
      );
      stakeRequirement = (await rootSmartContract.getCurrentFederationStakeRequirement()).toNumber();

      contractProxy["geodb"] = rootSmartContract.connect(accounts["geodb"]);
      contractProxy["org1"] = rootSmartContract.connect(accounts["org1"]);
      contractProxy["org2"] = rootSmartContract.connect(accounts["org2"]);
      contractProxy["org3"] = rootSmartContract.connect(accounts["org3"]);

      await (await contractProxy["geodb"].transfer(
        accounts["org1"].address,
        stakeRequirement
      )).wait();
      await (await contractProxy["geodb"].transfer(
        accounts["org2"].address,
        stakeRequirement
      )).wait();
      await (await contractProxy["geodb"].transfer(
        accounts["org3"].address,
        stakeRequirement
      )).wait();

      const org1Balance = (await rootSmartContract.balanceOf(
        accounts["org1"].address
      )).toNumber();
      const org2Balance = (await rootSmartContract.balanceOf(
        accounts["org2"].address
      )).toNumber();
      const org3Balance = (await rootSmartContract.balanceOf(
        accounts["org3"].address
      )).toNumber();
    });

    beforeEach("Update organizations balance", async () => {
      oldBalances[
        "contract"
      ] = (await rootSmartContract.totalStake()).toNumber();
      oldBalances["geodb"] = (await rootSmartContract.balanceOf(
        accounts["geodb"].address
      )).toNumber();
      oldBalances["org1"] = (await rootSmartContract.balanceOf(
        accounts["org1"].address
      )).toNumber();
      oldBalances["org2"] = (await rootSmartContract.balanceOf(
        accounts["org2"].address
      )).toNumber();
      oldBalances["org3"] = (await rootSmartContract.balanceOf(
        accounts["org3"].address
      )).toNumber();
    });

    it("allows to stake if sender has enough GEOs", async () => {
      const tx = await contractProxy["org1"].federationStakeLock(
        stakeRequirement
      );
      const result = await tx.wait();

      const contractBalance = await contractProxy["org1"].totalStake();

      const org1Balance = await contractProxy["org1"].balanceOf(
        accounts["org1"].address
      );

      const contractBalanceDelta =
        contractBalance.toNumber() - oldBalances["contract"];

      const org1BalanceDelta = org1Balance.toNumber() - oldBalances["org1"];

      assert.ok(
        Web3Utils.isHexStrict(result.transactionHash),
        "Transaction did not go through"
      );

      assert.equal(
        contractBalanceDelta,
        stakeRequirement,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${stakeRequirement}`
      );

      assert.equal(
        org1BalanceDelta,
        -stakeRequirement,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${-stakeRequirement}`
      );
    });

    it("allows to make a withdrawal request", async () => {
      const tx = await contractProxy["geodb"].requestStakeWithdrawal();
      const result = await tx.wait();

      assert.ok(
        Web3Utils.isHexStrict(result.transactionHash),
        "Transaction did not go through"
      );
    });

    it("allows to release rewards", async () => {
      const tx = await contractProxy["geodb"].releaseRewards(
        accounts["org1"].address,
        stakeRequirement
      );
      const result = await tx.wait();

      const org1Balance = (await rootSmartContract.balanceOf(
        accounts["org1"].address
      )).toNumber();

      const org1BalanceDelta = org1Balance - oldBalances["org1"];

      assert.ok(
        Web3Utils.isHexStrict(result.transactionHash),
        "Transaction did not go through"
      );

      assert.equal(
        org1BalanceDelta,
        stakeRequirement,
        `Balance delta did not match. Actual: ${org1BalanceDelta}, Expected: ${stakeRequirement}`
      );
    });

    it("allows to withdraw the stake", async () => {
      const tx = await contractProxy["geodb"].federationStakeWithdraw();
      const result = await tx.wait();

      const contractBalance = await contractProxy["geodb"].totalStake();

      const geodbBalance = await contractProxy["geodb"].balanceOf(
        accounts["geodb"].address
      );

      const contractBalanceDelta =
        contractBalance.toNumber() - oldBalances["contract"];

      const geodbBalanceDelta = geodbBalance.toNumber() - oldBalances["geodb"];

      assert.ok(
        Web3Utils.isHexStrict(result.transactionHash),
        "Transaction did not go through"
      );

      assert.equal(
        contractBalanceDelta,
        -stakeRequirement,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${-stakeRequirement}`
      );

      assert.equal(
        geodbBalanceDelta,
        stakeRequirement,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${stakeRequirement}`
      );
    });

    it("rejects low stakings", async () => {
      try {
        const tx = await contractProxy["geodb"].federationStakeLock(
          stakeRequirement - 1
        );
        const result = await tx.wait();
        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.stakedAmountIsNotEnough,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.stakedAmountIsNotEnough
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("rejects withdrawals for non-existant stakes", async () => {
      try {
        const tx = await contractProxy["geodb"].federationStakeWithdraw();
        const result = await tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.noStake,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.noStake
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("rejects rewards release for non-federated parties", async () => {
      try {
        const tx = await contractProxy["geodb"].releaseRewards(
          accounts["org1"].address,
          stakeRequirement
        );
        const result = await tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.stakedAmountIsNotEnough,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.stakedAmountIsNotEnough
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  }); // Describe Basic staking test

  describe("Multiparty staking test", () => {
    before("Contract deployment", async () => {
      let factory = new ethers.ContractFactory(
        compiledGeoDBRoot.abi,
        compiledGeoDBRoot.bytecode,
        accounts["geodb"]
      );

      rootSmartContract = await factory.deploy();
      await rootSmartContract.deployed();

      assert.ok(
        rootSmartContract.address && rootSmartContract.deployTransaction.hash,
        "Contract could not be deployed"
      );
      stakeRequirement = (await rootSmartContract.getCurrentFederationStakeRequirement()).toNumber();

      contractProxy["geodb"] = rootSmartContract.connect(accounts["geodb"]);
      contractProxy["org1"] = rootSmartContract.connect(accounts["org1"]);
      contractProxy["org2"] = rootSmartContract.connect(accounts["org2"]);
      contractProxy["org3"] = rootSmartContract.connect(accounts["org3"]);

      await (await contractProxy["geodb"].transfer(
        accounts["org1"].address,
        stakeRequirement
      )).wait();
      await (await contractProxy["geodb"].transfer(
        accounts["org2"].address,
        stakeRequirement
      )).wait();
      await (await contractProxy["geodb"].transfer(
        accounts["org3"].address,
        stakeRequirement
      )).wait();

      const org1Balance = (await rootSmartContract.balanceOf(
        accounts["org1"].address
      )).toNumber();
      const org2Balance = (await rootSmartContract.balanceOf(
        accounts["org2"].address
      )).toNumber();
      const org3Balance = (await rootSmartContract.balanceOf(
        accounts["org3"].address
      )).toNumber();
    });

    beforeEach("Update organizations balance", async () => {
      oldBalances[
        "contract"
      ] = (await rootSmartContract.totalStake()).toNumber();
      oldBalances["geodb"] = (await rootSmartContract.balanceOf(
        accounts["geodb"].address
      )).toNumber();
      oldBalances["org1"] = (await rootSmartContract.balanceOf(
        accounts["org1"].address
      )).toNumber();
      oldBalances["org2"] = (await rootSmartContract.balanceOf(
        accounts["org2"].address
      )).toNumber();
      oldBalances["org3"] = (await rootSmartContract.balanceOf(
        accounts["org3"].address
      )).toNumber();
    });

    it("allows multiple parties to stake and join the federation", async () => {
      // Org1 Assertions

      await (await contractProxy["org1"].federationStakeLock(
        stakeRequirement
      )).wait();
      const org1Balance = await contractProxy["org1"].balanceOf(
        accounts["org1"].address
      );

      const org1BalanceDelta = org1Balance.toNumber() - oldBalances["org1"];

      assert.equal(
        org1BalanceDelta,
        -stakeRequirement,
        `Balance delta did not match. Actual: ${org1Balance}, Expected: ${-stakeRequirement}`
      );

      // Org2 Assertions

      await (await contractProxy["org2"].federationStakeLock(
        stakeRequirement
      )).wait();
      const org2Balance = await contractProxy["org2"].balanceOf(
        accounts["org2"].address
      );

      const org2BalanceDelta = org2Balance.toNumber() - oldBalances["org2"];

      assert.equal(
        org2BalanceDelta,
        -stakeRequirement,
        `Balance delta did not match. Actual: ${org2Balance}, Expected: ${-stakeRequirement}`
      );

      // Org3 Assertions

      await (await contractProxy["org3"].federationStakeLock(
        stakeRequirement
      )).wait();

      const org3Balance = await contractProxy["org3"].balanceOf(
        accounts["org3"].address
      );

      const org3BalanceDelta = org3Balance.toNumber() - oldBalances["org3"];

      assert.equal(
        org3BalanceDelta,
        -stakeRequirement,
        `Balance delta did not match. Actual: ${org3Balance}, Expected: ${-stakeRequirement}`
      );

      // Contract assertions

      const contractBalance = await contractProxy["geodb"].totalStake();

      const contractBalanceDelta =
        contractBalance.toNumber() - oldBalances["contract"];

      assert.equal(
        contractBalanceDelta,
        3 * stakeRequirement,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${3 *
          stakeRequirement}`
      );
    });

    it("rejects unrequested withdrawal", async () => {
      try {
        const tx = await contractProxy["org3"].federationStakeWithdraw();
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.requestWithDrawalFirst,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.requestWithDrawalFirst
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("rejects withdrawal with 1/4 of the votes", async () => {
      try {
        await (await contractProxy["org3"].requestStakeWithdrawal()).wait();

        const tx = await contractProxy["org3"].federationStakeWithdraw();
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.notEnoughVotes,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.notEnoughVotes
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("allows to vote withdrawal request", async () => {
      const tx = await contractProxy["org2"].voteStakeWithdrawalRequest(
        accounts["org3"].address,
        1
      );

      const result = await tx.wait();

      assert.ok(
        Web3Utils.isHexStrict(result.transactionHash),
        `Transaction did not go through: ${result}`
      );
    });

    it("rejects voting twice", async () => {
      try {
        const tx = await contractProxy["org2"].voteStakeWithdrawalRequest(
          accounts["org3"].address,
          1
        );
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.cannotVoteTwice,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.cannotVoteTwice
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("rejects self voting", async () => {
      try {
        const tx = await contractProxy["org3"].voteStakeWithdrawalRequest(
          accounts["org3"].address,
          1
        );
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.noSelfVoting,
            `Unexpected error message. Got "${errorMsg}", expected "${
              errorMsgs.noSelfVoting
            }"`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("accepts withdrawal with 1/2 of the votes", async () => {
      let stk;

      stk = (await rootSmartContract.balanceOf(
        rootSmartContract.address
      )).toNumber();

      const test = await (await contractProxy["geodb"].transfer(
        rootSmartContract.address,
        1000000
      )).wait();

      stk = (await rootSmartContract.balanceOf(
        rootSmartContract.address
      )).toNumber();

      const currentStake = (await contractProxy["org3"].getStake()).toNumber();
      const tx = await contractProxy["org3"].federationStakeWithdraw();
      const result = await tx.wait();

      const contractBalance = await contractProxy["org3"].totalStake();

      const org3Balance = await contractProxy["org3"].balanceOf(
        accounts["org3"].address
      );

      const contractBalanceDelta =
        contractBalance.toNumber() - oldBalances["contract"];

      const org3BalanceDelta = org3Balance.toNumber() - oldBalances["org3"];

      assert.ok(
        Web3Utils.isHexStrict(result.transactionHash),
        "Transaction did not go through"
      );

      assert.equal(
        contractBalanceDelta,
        -currentStake,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${-currentStake}`
      );

      assert.equal(
        org3BalanceDelta,
        currentStake,
        `Balance delta did not match. Actual: ${contractBalanceDelta}, Expected: ${currentStake}`
      );
    });
  }); // Describe Multiparty staking test
}); // Describe GeoDBRoot
