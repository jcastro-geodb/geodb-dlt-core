const assert = require("assert");
const ganache = require("ganache-cli");
const ethers = require("ethers");
const EthersUtils = require("ethers").utils;
const Web3Utils = require("web3-utils");

const {
  setupNetwork,
  setupContract,
  updateBalances,
  checkBalanceDelta
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

describe("Federation membership join", () => {
  beforeEach("Update organizations balance", async () => {
    oldBalances = await updateBalances(accounts, rootSmartContract);
  });

  describe("When the organization correctly follows procedure", () => {
    before("bootstrap the network", async () => {
      await bootstrap();
    });

    it("creates a request and stakes GEOs", async () => {
      const tx = (await contractProxy["org1"].requestFederationJoin()).wait();

      const deltas = [
        { org: "org1", expected: -stakeRequirement },
        { org: "contract", expected: stakeRequirement }
      ];

      await checkBalanceDelta(deltas, accounts, oldBalances, rootSmartContract);
    });

    it("gets the federation to vote", async () => {
      const tx = (await contractProxy["geodb"].voteFederationJoin(
        accounts["org1"].address
      )).wait();

      const approvals = await rootSmartContract.getApprovalsForJoinFederationBallot(
        accounts["org1"].address,
        1
      );

      const votingStake = await contractProxy["geodb"].getStake();

      assert.equal(
        approvals.toNumber(),
        votingStake.toNumber(),
        "Approvals mismatch"
      );
    });

    it("allows to resolve the vote and updates balances", async () => {
      const tx = (await contractProxy["org1"].resolveFederationJoin(
        true
      )).wait();

      const used = await rootSmartContract.getStatusForJoinFederationBallot(
        accounts["org1"].address,
        1
      );

      assert.equal(used, true, "Vote could not be resolved");

      const deltas = [{ org: "totalStake", expected: stakeRequirement }];

      await checkBalanceDelta(deltas, accounts, oldBalances, rootSmartContract);
    });

    it("signs up org1 as federation member", async () => {
      const federationStake = await rootSmartContract.federationStakes(
        accounts["org1"].address
      );

      assert.equal(federationStake.approved, true, "Member is not approved");
      assert.ok(
        federationStake.stake.toNumber() >= stakeRequirement,
        "Stake is not enough"
      );
    });
  });

  describe("When the organization wants to cancel joining", () => {
    describe("If it follows the correct procedure", () => {
      before("bootstrap the network", async () => {
        await bootstrap();
        (await contractProxy["org1"].requestFederationJoin()).wait();
      });

      it("allows to cancel and updates balances", async () => {
        const tx = await (await contractProxy["org1"].resolveFederationJoin(
          false
        )).wait();

        assert.ok(tx.transactionHash);

        const deltas = [
          { org: "org1", expected: stakeRequirement },
          { org: "contract", expected: -stakeRequirement }
        ];

        await checkBalanceDelta(
          deltas,
          accounts,
          oldBalances,
          rootSmartContract
        );
      });
    });

    describe("If it does not follow the correct procedure", () => {
      before("bootstrap the network", async () => {
        await bootstrap();
      });

      it("rejects cancel request if no request was placed before", async () => {
        try {
          const tx = (await contractProxy["org1"].resolveFederationJoin(
            false
          )).wait();

          assert.fail("Transaction confirmed an illegal state");
        } catch (e) {
          if (e.transactionHash) {
            const transactionHash = e.transactionHash;
            const errorMsg = e.results[`${transactionHash}`].reason;
            assert.equal(
              errorMsg,
              errorMsgs.noStakeForThisAddress,
              `Unexpected error message`
            );
          } else {
            assert.fail(e);
          }
        }
      });

      it("rejects cancelling twice after requesting to join", async () => {
        try {
          await (await contractProxy["org1"].requestFederationJoin()).wait();
          await (await contractProxy["org1"].resolveFederationJoin(
            false
          )).wait();

          const tx = (await contractProxy["org1"].resolveFederationJoin(
            false
          )).wait();

          assert.fail("Transaction confirmed an illegal state");
        } catch (e) {
          if (e.transactionHash) {
            const transactionHash = e.transactionHash;
            const errorMsg = e.results[`${transactionHash}`].reason;
            assert.equal(
              errorMsg,
              errorMsgs.noStakeForThisAddress,
              `Unexpected error message`
            );
          } else {
            assert.fail(e);
          }
        }
      });

      it("then allows to request join later again and increases request index", async () => {
        const tx = (await contractProxy["org1"].requestFederationJoin()).wait();

        const deltas = [
          { org: "org1", expected: -stakeRequirement },
          { org: "contract", expected: stakeRequirement }
        ];

        await checkBalanceDelta(
          deltas,
          accounts,
          oldBalances,
          rootSmartContract
        );

        const requestIndex = (await rootSmartContract.federationJoinBallots(
          accounts["org1"].address
        )).toNumber();

        assert.equal(requestIndex, 2, "Request index did not update");
      });
    });
  });

  describe("If the organization does not have enough GEOs", () => {
    before("bootstrap the network", async () => {
      await bootstrap();
    });

    it("rejects the organization", async () => {
      try {
        const tx = await contractProxy["badorg"].requestFederationJoin();
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.safeMathSubstractionOverflow,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("If the organization is already federated", () => {
    before("bootstrap the network", async () => {
      await bootstrap();
    });

    it("rejects the organization", async () => {
      try {
        const tx = await contractProxy["geodb"].requestFederationJoin();
        const result = tx.wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.callerCannotBeFederated,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("If the organization has a join request open", () => {
    before("bootstrap the network", async () => {
      await bootstrap();
      (await contractProxy["org1"].requestFederationJoin()).wait();
    });

    it("rejects the organization", async () => {
      try {
        const tx = (await contractProxy["org1"].requestFederationJoin()).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.firstWithdrawYourStake,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("If an user tries to make bad membership votes", () => {
    before("bootstrap the network", async () => {
      await bootstrap();
    });

    it("rejects vote without being federated", async () => {
      try {
        const tx = (await contractProxy["badorg"].voteFederationJoin(
          accounts["org1"].address
        )).wait();

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

    it("rejects voting on addresses that have not requested membership", async () => {
      try {
        // (await contractProxy["org1"].requestFederationJoin()).wait();
        const tx = (await contractProxy["geodb"].voteFederationJoin(
          accounts["org1"].address
        )).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.indexMustBeGreaterThan0,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });

    it("rejects voting twice", async () => {
      try {
        (await contractProxy["org1"].requestFederationJoin()).wait();
        (await contractProxy["geodb"].voteFederationJoin(
          accounts["org1"].address
        )).wait();

        const tx = (await contractProxy["geodb"].voteFederationJoin(
          accounts["org1"].address
        )).wait();

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

    it("rejects voting on a resolved request", async () => {
      try {
        (await contractProxy["org1"].resolveFederationJoin(true)).wait();

        const tx = (await contractProxy["geodb"].voteFederationJoin(
          accounts["org1"].address
        )).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.joinRequestAlreadyResolved,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });
});
