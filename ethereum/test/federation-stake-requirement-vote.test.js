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

    it("requires the federation to update the stake", async () => {
      const isFederated = await rootSmartContract.isFederated(
        accounts["geodb"].address
      );

      assert.ok(isFederated === false, "Organizations are still federated");
    });

    it("allows to update the stake", async () => {
      const tx = await (await contractProxy["geodb"].increaseStake(
        stakeRequirement
      )).wait();

      assert.ok(tx.transactionHash);

      const isFederated = await rootSmartContract.isFederated(
        accounts["geodb"].address
      );

      assert.ok(
        isFederated === true,
        "Organization did not regain its federated status"
      );
    });
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

    it("rejects ballot resolution", async () => {
      try {
        const tx = (await contractProxy["geodb"].resolveStakingBallot(
          0
        )).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.notEnoughVotes,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("expires due to deadline", async () => {
      const delta = 2 * 24 * 3600;
      const increaseTime = await ethersProvider.send("evm_increaseTime", [
        delta
      ]);

      try {
        const tx = await contractProxy["org1"].voteStakingBallot(0);
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.deadline,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("When a stake change ballot is resolved", () => {
    before(
      "bootstrap the network, setup federation and staking ballot",
      async () => {
        await bootstrap();
        await setupFederation(accounts, contractProxy);
        await (await contractProxy["geodb"].newStakingBallot(
          stakeRequirement * 2
        )).wait();

        await (await contractProxy["org2"].voteStakingBallot(0)).wait();
        await (await contractProxy["org3"].voteStakingBallot(0)).wait();
        await (await contractProxy["org4"].voteStakingBallot(0)).wait();

        (await contractProxy["geodb"].resolveStakingBallot(0)).wait();

        await (await contractProxy["geodb"].increaseStake(
          stakeRequirement
        )).wait();
        await (await contractProxy["org1"].increaseStake(
          stakeRequirement
        )).wait();
      }
    );

    it("rejects resolving twice", async () => {
      try {
        await (await contractProxy["geodb"].resolveStakingBallot(0)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.invalidBallotIsApproved,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("rejects the vote", async () => {
      try {
        await (await contractProxy["org1"].voteStakingBallot(0)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.invalidBallotIsApproved,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("When a staking ballot does not exist", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
      await (await contractProxy["geodb"].newStakingBallot(
        stakeRequirement * 2
      )).wait();
    });

    it("rejects vote", async () => {
      try {
        await (await contractProxy["org1"].voteStakingBallot(1)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.invalidBallotIndex,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
    it("rejects resolution", async () => {
      try {
        await (await contractProxy["org1"].resolveStakingBallot(1)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.invalidBallotIndex,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("When voting twice", () => {
    before(
      "bootstrap the network, setup federation and staking ballot",
      async () => {
        await bootstrap();
        await setupFederation(accounts, contractProxy);
        await (await contractProxy["geodb"].newStakingBallot(
          stakeRequirement * 2
        )).wait();

        await (await contractProxy["org1"].voteStakingBallot(0)).wait();
      }
    );

    it("rejects the vote", async () => {
      try {
        await (await contractProxy["org1"].voteStakingBallot(0)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.cannotVoteTwice,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("When a non-federated triesto call staking change methods", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
      await (await contractProxy["geodb"].newStakingBallot(
        stakeRequirement * 2
      )).wait();

      await (await contractProxy["org2"].voteStakingBallot(0)).wait();
      await (await contractProxy["org3"].voteStakingBallot(0)).wait();
      await (await contractProxy["org4"].voteStakingBallot(0)).wait();
    });

    it("rejects new staking proposals", async () => {
      try {
        await (await contractProxy["badorg"].newStakingBallot(0)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.callerMustBeFederated,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
    it("rejects voting on proposals", async () => {
      try {
        await (await contractProxy["badorg"].voteStakingBallot(0)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.callerMustBeFederated,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
    it("rejects resolving proposals", async () => {
      try {
        await (await contractProxy["badorg"].resolveStakingBallot(0)).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.callerMustBeFederated,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("When a federated member does not update stake after a proposal and wants to leave", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
      await (await contractProxy["geodb"].newStakingBallot(
        stakeRequirement * 2
      )).wait();

      await (await contractProxy["org2"].voteStakingBallot(0)).wait();
      await (await contractProxy["org3"].voteStakingBallot(0)).wait();
      await (await contractProxy["org4"].voteStakingBallot(0)).wait();

      await (await contractProxy["geodb"].resolveStakingBallot(0)).wait();

      await (await contractProxy["geodb"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org2"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org3"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org4"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org1"].requestStakeWithdrawal()).wait();
      await (await contractProxy["geodb"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
      await (await contractProxy["org2"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
      await (await contractProxy["org3"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
      await (await contractProxy["org4"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
    });

    it("the org can exit the federation", async () => {
      const tx = await (await contractProxy["org1"].withdrawStake()).wait();
      assert.ok(tx.transactionHash);

      const deltas = [
        { org: "org1", expected: stakeRequirement },
        { org: "contract", expected: -stakeRequirement },
        { org: "totalStake", expected: -stakeRequirement }
      ];

      await checkBalanceDelta(deltas, accounts, oldBalances, rootSmartContract);
    });
  });
  describe("When a federated member does not update stake after a long time after required stake change", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
      await (await contractProxy["geodb"].newStakingBallot(
        stakeRequirement * 2
      )).wait();

      await (await contractProxy["org2"].voteStakingBallot(0)).wait();
      await (await contractProxy["org3"].voteStakingBallot(0)).wait();
      await (await contractProxy["org4"].voteStakingBallot(0)).wait();

      await (await contractProxy["geodb"].resolveStakingBallot(0)).wait();

      await (await contractProxy["geodb"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org2"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org3"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org4"].increaseStake(
        stakeRequirement
      )).wait();

      await (await contractProxy["org1"].requestStakeWithdrawal()).wait();
      await (await contractProxy["geodb"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
      await (await contractProxy["org2"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
      await (await contractProxy["org3"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
      await (await contractProxy["org4"].voteStakeWithdrawalRequest(
        accounts["org1"].address,
        1
      )).wait();
    });

    it("[WARNING: ADD DEADLINE] The member can be purged", async () => {
      const tx = await (await contractProxy["geodb"].purgeMember(
        accounts["org1"].address
      )).wait();

      assert.ok(tx.transactionHash, "Transaction did not go through");

      const deltas = [
        {
          org: "contract",
          expected: -stakeRequirement,
          org: "totalStake",
          expected: -stakeRequirement
        }
      ];

      await checkBalanceDelta(deltas, accounts, oldBalances, rootSmartContract);

      const purgedMember = await rootSmartContract.federationStakes(
        accounts["org1"].address
      );

      assert.equal(purgedMember.stake.toNumber(), 0, "Member was not purged");
      assert.ok(purgedMember.approved === false, "Member was not purged");
    });
  });
}); // Federation membership exit
