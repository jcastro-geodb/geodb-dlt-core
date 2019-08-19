try {
    require("openzeppelin-test-helpers/configure")({ web3 });
  } catch (e) {
    // If deploying to a testnet, a weird error about configuring web3 twice occurs. Wrapping the function in a try-catch
    // until we find a better approach or --skipDryRun is added to truffle in the next major release
    // console.error(e);
}

let GeoToken = artifacts.require("./GeoToken.sol");
let GeoFederation = artifacts.require("./GeoFederation.sol");
let tokenAddress;

module.exports = function(deployer, network, accounts) {
    var addressGeoToken;
    
    if (network.includes("test") || network.includes("development"))
      // do not deploy, each test should deploy by itself
      return;
  
    deployer
      .then(() => {
        return GeoToken.deployed();
      })
      .then(instance => {
        tokenAddress = instance.address;
        return deployer.deploy(GeoFederation, tokenAddress);
      });
};
