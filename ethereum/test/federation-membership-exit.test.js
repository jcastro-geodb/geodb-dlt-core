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

describe("Federation membership exit", () => {
  beforeEach("Update organizations balance", async () => {
    oldBalances = await updateBalances(accounts, rootSmartContract);
  });

  describe("When the procedure is executed correctly", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
    });

    it("allows to request withdrawal", async () => {
      const tx = await (await contractProxy[
        "org1"
      ].requestStakeWithdrawal()).wait();
      assert.ok(tx.transactionHash, "Transaction did not go through");

      const releaseRequestIndex = (await rootSmartContract.federationStakes(
        accounts["org1"].address
      )).releaseRequestIndex;

      assert.equal(
        releaseRequestIndex.toNumber(),
        1,
        "Release request index was not increased"
      );
    });

    it("allows the rest of the federation to vote the withdrawal", async () => {
      let stakeCount = 0;
      let approvers = [];

      for (let i = 2; i < 4; i++) {
        let key = `org${i}`;
        await contractProxy[key].voteStakeWithdrawalRequest(
          accounts["org1"].address,
          1
        );

        stakeCount += stakeRequirement;

        approvers.push(
          await rootSmartContract.getApproverWithdrawRequest(
            accounts["org1"].address,
            accounts[key].address,
            1
          )
        );
      }

      const approvals = await rootSmartContract.getApprovalsWithdrawRquest(
        accounts["org1"].address,
        1
      );

      assert.equal(
        approvals.toNumber(),
        stakeCount,
        "Approval vote stake mismatch"
      );

      const allVotingOrgsAreApprovers = approvers.every(isApprover => {
        return isApprover === true;
      });

      assert.ok(allVotingOrgsAreApprovers, "Org is not shown as approver");
    });

    it("allows to withdraw stake", async () => {
      const tx = await (await contractProxy["org1"].withdrawStake()).wait();
      assert.ok(tx.transactionHash, "Transaction did not go through");

      const deltas = [
        { org: "org1", expected: stakeRequirement },
        { org: "contract", expected: -stakeRequirement },
        { org: "totalStake", expected: -stakeRequirement }
      ];

      await checkBalanceDelta(deltas, accounts, oldBalances, rootSmartContract);
    });
  });

  describe("When the request isn't solicited first", () => {
    before("bootstrap the network and setup federation", async () => {
      await bootstrap();
      await setupFederation(accounts, contractProxy);
    });

    it("rejects the withdrawal", async () => {
      try {
        const tx = (await contractProxy["org1"].withdrawStake()).wait();

        assert.fail("Transaction confirmed an illegal state");
      } catch (e) {
        if (e.transactionHash) {
          const transactionHash = e.transactionHash;
          const errorMsg = e.results[`${transactionHash}`].reason;
          assert.equal(
            errorMsg,
            errorMsgs.firstRequestWithdrawal,
            `Unexpected error message`
          );
        } else {
          assert.fail(e);
        }
      }
    });
  });

  describe("When the org does not get federation approval to leave", () => {
    describe("with 0 approvals (20% of stake)", async () => {
      before("bootstrap the network and setup federation", async () => {
        await bootstrap();
        await setupFederation(accounts, contractProxy);
      });

      it("rejects the withdrawal", async () => {
        try {
          (await contractProxy["org1"].requestStakeWithdrawal()).wait();

          const tx = (await contractProxy["org1"].withdrawStake()).wait();

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
    });

    describe("with 1 approval (40% of stake)", async () => {
      before("bootstrap the network and setup federation", async () => {
        await bootstrap();
        await setupFederation(accounts, contractProxy);
      });

      it("rejects the withdrawal", async () => {
        try {
          (await contractProxy["org1"].requestStakeWithdrawal()).wait();
          (await contractProxy["org2"].voteStakeWithdrawalRequest(
            accounts["org1"].address,
            1
          )).wait();

          const tx = (await contractProxy["org1"].withdrawStake()).wait();

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
    });
  });
});
