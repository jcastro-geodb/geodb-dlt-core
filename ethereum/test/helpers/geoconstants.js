const { BN } = require("openzeppelin-test-helpers");
const initialMinimumFederationStake = new BN("100000");
const initialFundingForPartners = initialMinimumFederationStake.mul(new BN("10"));

module.exports.initialMinimumFederationStake = initialMinimumFederationStake;
module.exports.initialFundingForPartners = initialFundingForPartners;
