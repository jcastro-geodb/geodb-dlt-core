const addMembersToFederation = async (voters, joiners, stake, token, federation) => {
  for (joiner of joiners) {
    await token.approve(federation.address, stake, { from: joiner });
    await federation.newJoinBallot(stake, { from: joiner });

    for (voter of voters) {
      await federation.voteJoinBallot(joiner, { from: voter });
    }

    await federation.resolveJoinBallot({ from: joiner });
    voters.push(joiner);
  }
  return voters;
};

module.exports = addMembersToFederation;
