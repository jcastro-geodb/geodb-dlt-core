const { BN } = require("openzeppelin-test-helpers");

module.exports.symbol = "GEO";
module.exports.name = "GeoToken";
module.exports.preAssignedSupply = new BN("300000000000000000000000000");
module.exports.initialMinimumFederationStake = new BN("100000");
module.exports.initialFundingForPartners = new BN("100000").mul(new BN("10"));
module.exports.maxSupply = new BN("1000000000000000000000000000");
