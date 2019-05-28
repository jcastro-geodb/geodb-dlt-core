const { BN } = require("openzeppelin-test-helpers");

const fundPartnersWithGeoTokens = async (amount, funder, accounts, token) => {
  for (let account of accounts) {
    await token.transfer(account, amount, { from: funder });
  }
};

module.exports = fundPartnersWithGeoTokens;
