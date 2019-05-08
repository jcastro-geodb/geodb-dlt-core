const VALID = "valid";
const REVOKED = "revoked";
const APPROVING = "approving";

const schema = {
  mspId: "string",
  status: "string"
};

module.exports.STATUS_VALID = VALID;
module.exports.STATUS_REVOKED = REVOKED;
module.exports.STATUS_APPROVING = APPROVING;
module.exports.SCHEMA = schema;
