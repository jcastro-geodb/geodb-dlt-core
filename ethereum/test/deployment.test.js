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

describe("Contract deployment", () => {
  before("Setup ethereum network", async () => {
    await bootstrap();
  });

  beforeEach("Update organizations balance", async () => {
    oldBalances = await updateBalances(accounts, rootSmartContract);
  });

  it("has an owner", async () => {
    const owner = await rootSmartContract.owner();

    assert.equal(accounts["geodb"].address, owner, "Owner mistmatch");
  });

  it("owner is member of federation", async () => {
    const federationStake = await rootSmartContract.federationStakes(
      accounts["geodb"].address
    );

    assert.equal(
      federationStake.stake.toNumber(),
      stakeRequirement,
      "Owner does not have enough stake"
    );
    assert.equal(
      federationStake.approved,
      true,
      "Owner is not approved as member"
    );
  });

  it("owner can release rewards as federation member", async () => {
    const delta = 10000;

    const tx = await contractProxy["geodb"].releaseRewards(
      accounts["org1"].address,
      delta
    );

    const deltas = [{ org: "org1", expected: delta }];

    await checkBalanceDelta(deltas, accounts, oldBalances, rootSmartContract);
  });
});
