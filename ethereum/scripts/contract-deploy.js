const fs = require("fs-extra");
const path = require("path");
const { BN } = require("web3-utils").BN;
let GeoToken = artifacts.require("./GeoToken.sol");

const presaleHoldersPath = path.resolve(__dirname, "./../.presale_holders.json");

const deploy = () => {
  const presaleHolders = fs.readJsonSync(presaleHoldersPath);

  let holders = [];
  let amounts = [];

  for (holder of presaleHolders) {
    holders.push(holder.address);
    amounts.push(new BN(holder.amount));
  }

  return GeoToken.new(holders, amounts);
};

module.exports = deploy;
