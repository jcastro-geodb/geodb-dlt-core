const exitFederation = async (voters, exitter, federation) => {
  await federation.newExitBallot({ from: exitter });

  for (voter of voters) {
    await federation.voteExitBallot(exitter, { from: voter });
  }

  await federation.resolveExitBallot({ from: exitter });
};

module.exports = exitFederation;
