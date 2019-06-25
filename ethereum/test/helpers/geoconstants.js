const { BN } = require("openzeppelin-test-helpers");
const preAssignedSupply = new BN("300000000000000000000000000");
const initialMinimumFederationStake = new BN("100000");
const initialFundingForPartners = initialMinimumFederationStake.mul(new BN("10"));

module.exports.preAssignedSupply = preAssignedSupply;
module.exports.initialMinimumFederationStake = initialMinimumFederationStake;
module.exports.initialFundingForPartners = initialFundingForPartners;
