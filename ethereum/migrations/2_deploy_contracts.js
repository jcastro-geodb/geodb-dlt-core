try {
  require("openzeppelin-test-helpers/configure")({ web3 });
} catch (e) {
  // If deploying to a testnet, a weird error about configuring web3 twice occurs. Wrapping the function in a try-catch
  // until we find a better approach or --skipDryRun is added to truffle in the next major release
  // console.error(e);
}

const { singletons } = require("openzeppelin-test-helpers");

const fs = require("fs-extra");
const path = require("path");
const { BN } = require("web3-utils").BN;
let GeoToken = artifacts.require("./GeoToken.sol");

const deployERC1820 = account => {
  return new Promise((resolve, reject) => {
    singletons
      .ERC1820Registry(account)
      .catch(e => {
        // console.error(e) // There seems to be some sort of bug here with ganache and the singleton
      })
      .finally(() => resolve(true));
  });
};

module.exports = function(deployer, network, accounts) {
  if (network.includes("test") || network.includes("development"))
    // do not deploy, each test should deploy by itself
    return;

  deployer
    .then(() => {
      if (network.includes("ganache")) return deployERC1820(accounts[0]);
      else return true;
    })
    .then(() => {
      return deployer.deploy(GeoToken, "GeoToken", "GTKN", []);
    })
    .then(() => {
      return GeoToken.deployed();
    });
};
