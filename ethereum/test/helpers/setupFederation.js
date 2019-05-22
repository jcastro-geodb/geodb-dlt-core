const setupFederation = async (accounts, contractProxy) => {
  // Setup the federation to achieve 5 orgs with 20% stake each

  await addMemberToFederation("org1", accounts, contractProxy);
  await addMemberToFederation("org2", accounts, contractProxy);
  await addMemberToFederation("org3", accounts, contractProxy);
  await addMemberToFederation("org4", accounts, contractProxy);
};

const addMemberToFederation = async (org, accounts, contractProxy) => {
  (await contractProxy[org].requestFederationJoin()).wait();

  for (let key in accounts) {
    const isFederated = await contractProxy[key].isFederated(
      accounts[key].address
    );

    if (isFederated)
      await contractProxy[key].voteFederationJoin(accounts[org].address);
  }

  await contractProxy[org].resolveFederationJoin(true);

  // const test = await contractProxy[org].isFederated(accounts[org].address);
  //
  // console.log(test);
};

module.exports = setupFederation;
