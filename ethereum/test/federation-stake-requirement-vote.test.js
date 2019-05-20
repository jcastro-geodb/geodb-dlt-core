const assert = require("assert");
const ganache = require("ganache-cli");
const ethers = require("ethers");
const EthersUtils = require("ethers").utils;
const Web3Utils = require("web3-utils");

const {
  setupNetwork,
  setupContract,
  updateBalances,
  checkBalanceDelta,
  setupFederation
} = require("./helpers");

// ###################
// # ETHEREUM SETUP
// ###################

let accounts, ethersProvider;

// ###################
// # SMART CONTRACT
// ###################

const compiledGeoDBRoot = require("../build/contracts/GeoDB.json");
const errorMsgs = require("./helpers/errorMessages");

let rootSmartContract;
let contractProxy = {};
let stakeRequirement = 0;

// ###################
// # BALANCES
// ###################

let oldBalances = {};

// ###################
// # TESTING
// ###################

async function bootstrap() {
  ({ accounts, ethersProvider } = setupNetwork());
  ({ rootSmartContract, stakeRequirement, contractProxy } = await setupContract(
    accounts
  ));
}

describe("Federation staking votes", () => {
  beforeEach("Update organizations balance", async () => {
    oldBalances = await updateBalances(accounts, rootSmartContract);
  });

  describe("When the procedure is executed correctly", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
    });

    it("allows to start a stake change", async () => {
      const tx = await (await contractProxy["geodb"].newStakingBallot(
        stakeRequirement * 2
      )).wait();

      assert.ok(tx.transactionHash, "Transaction did not go through");

      const stakingBallot = await rootSmartContract.federationStakingBallots(0);

      assert.equal(
        stakingBallot.stake.toNumber(),
        stakeRequirement * 2,
        "Staking ballot was not updated"
      );

      assert.equal(
        stakingBallot.proposer,
        accounts["geodb"].address,
        "Staking ballot was not updated"
      );
    });

    it("allows to vote a stake change", async () => {
      const tx = await (await contractProxy["org1"].voteStakingBallot(
        0
      )).wait();
      assert.ok(tx.transactionHash, "Transaction did not go through");

      const stakingBallot = await rootSmartContract.federationStakingBallots(0);

      assert.equal(
        stakingBallot.approvals.toNumber(),
        stakeRequirement * 2,
        "Approvals did not add correctly"
      );

      const approver = await rootSmartContract.getApproverForStakingBallot(
        accounts["org1"].address,
        0
      );

      assert.ok(approver, "Org was not added as approver");
    });

    it("allows to change the stake requirement", async () => {
      await (await contractProxy["org2"].voteStakingBallot(0)).wait();
      await (await contractProxy["org3"].voteStakingBallot(0)).wait();
      await (await contractProxy["org4"].voteStakingBallot(0)).wait();

      const tx = await (await contractProxy["geodb"].resolveStakingBallot(
        0
      )).wait();

      assert.ok(tx.transactionHash);

      const newStakeRequirement = await rootSmartContract.getCurrentFederationStakeRequirement();

      assert.equal(newStakeRequirement.toNumber(), stakeRequirement * 2);
    });

    it("requires the federation to update the stake");
  });

  describe("When the new stake proposal does not get support from the rest of the federation", () => {
    before(
      "bootstrap the network, setup federation and staking ballot",
      async () => {
        await bootstrap();
        await setupFederation(accounts, contractProxy);
        await (await contractProxy["geodb"].newStakingBallot(
          stakeRequirement * 2
        )).wait();
      }
    );

    it("rejects ballot resolution");

    it("expires due to deadline");
  });
}); // Federation membership exit
