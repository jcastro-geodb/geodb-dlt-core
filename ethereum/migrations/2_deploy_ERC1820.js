require("@openzeppelin/test-helpers/configure")({ environment: "truffle", provider: web3.currentProvider });
const { singletons } = require("@openzeppelin/test-helpers");

const deployERC1820 = account => {
  let instance = false;

  return new Promise((resolve, reject) => {
    singletons
      .ERC1820Registry(account)
      .then(result => (instance = result))
      .catch(error => {
        console.error(error);
        // console.error(e) // There seems to be some sort of bug here with ganache and the singleton
      })
      .finally(() => resolve(instance));
  });
};

module.exports = function(deployer, network, accounts) {
  if (network.includes("test") || network.includes("development"))
    // do not deploy, each test should deploy by itself
    return;
  return deployERC1820(accounts[0])
    .then(instance => {
      if (instance) {
        console.log("ERC1820 deployed");
      }
      return;
    })
    .catch(error => {
      console.log("######### ERROR #########");
      console.error(error);
    })
    .finally(() => {
      console.log("Finished");
    });
};
