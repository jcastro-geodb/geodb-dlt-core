require("@openzeppelin/test-helpers/configure")({ environment: "truffle", provider: web3.currentProvider });

let GeoToken = artifacts.require("./GeoToken.sol");
let BatchMint = artifacts.require("./BatchMint.sol");
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
      return deployer.deploy(BatchMint, tokenAddress, { from: accounts[0] });
    })
    .then(instance => {
      return instance.transferOwnership(accounts[1], { from: accounts[0] });
    })
    .then(result => {
      if (result) console.log(`Successfully transfered ownership to ${accounts[1]}`);
    })
    .catch(console.error);
};
