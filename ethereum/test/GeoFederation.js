const GeoToken = artifacts.require("GeoToken.sol");
const GeoFederation = artifacts.require("GeoFederation.sol");

const { fundPartnersWithGeoTokens, addMembersToFederation, exitFederation } = require("./helpers");

const { initialMinimumFederationStake, initialFundingForPartners } = require("./helpers/geoconstants");
const ErrorMsgs = require("./helpers/errorMessages.js");

const { BN, expectEvent, shouldFail } = require("openzeppelin-test-helpers");

contract("GeoFederation", ([_, geodb, partner, partner2, emptyAccount, ...accounts]) => {
  beforeEach("Deploy token contract and federation contract", async () => {
    this.token = await GeoToken.new({ from: geodb });

    this.federation = await GeoFederation.new(this.token.address, {
      from: geodb
    });

    this.token.transferOwnership(this.federation.address, { from: geodb });

    await this.token.approve(this.federation.address, initialMinimumFederationStake, {
      from: geodb
    });

    await this.federation.increaseStake(initialMinimumFederationStake, {
      from: geodb
    });

    await fundPartnersWithGeoTokens(
      initialMinimumFederationStake.mul(new BN("10")),
      geodb,
      [partner, partner2],
      this.token
    );
  });

  describe("Contract initialization", () => {
    it("signs GeoDB as first federation member", async () => {
      const federationStake = await this.federation.federationStakes(geodb);

      federationStake.stake.should.be.bignumber.equal(initialMinimumFederationStake);
      federationStake.approved.should.be.equal(true);
    });

    it("has balance assigned to the federation", async () => {
      (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(initialMinimumFederationStake);
    });

    it("transfers ownership to the federation contract", async () => {
      const owner = await this.token.owner();
      owner.should.be.equal(this.federation.address);
    });
  });

  describe("Federation join process", () => {
    describe("When creating a ballot", () => {
      describe("With sufficient funds", () => {
        let newJoinBallotLogs;

        beforeEach("Approve transfer and create ballot", async () => {
          await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
          const { logs } = await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });
          newJoinBallotLogs = logs;
        });

        it("allows to make a new join ballot", async () => {
          const event = expectEvent.inLogs(newJoinBallotLogs, "LogNewJoinBallot", { sender: partner });

          event.args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

          (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
            initialMinimumFederationStake.mul(new BN("2"))
          );

          (await this.token.balanceOf(partner)).should.be.bignumber.equal(
            initialFundingForPartners.sub(initialMinimumFederationStake)
          );

          const ballot = await this.federation.federationJoinBallots(partner);

          ballot.approvals.should.be.bignumber.equal(new BN("0"));
          ballot.resolved.should.be.equal(false);

          const federationStake = await this.federation.federationStakes(partner);

          federationStake.stake.should.be.bignumber.equal(initialMinimumFederationStake);
          federationStake.approved.should.be.equal(false);
        });

        it("allows to vote the ballot", async () => {
          const { tx, logs } = await this.federation.voteJoinBallot(partner, { from: geodb });

          const event = expectEvent.inLogs(logs, "LogVoteJoinBallot", { sender: geodb, ballot: partner });

          event.args.voteWeight.should.be.bignumber.equal(initialMinimumFederationStake);
          event.args.approvals.should.be.bignumber.equal(initialMinimumFederationStake);
        });

        it("resolves ballot positively if there is quorum", async () => {
          await this.federation.voteJoinBallot(partner, { from: geodb });

          const { tx, logs } = await this.federation.resolveJoinBallot({ from: partner });

          expectEvent
            .inLogs(logs, "LogNewMember", { sender: partner })
            .args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

          expectEvent.inLogs(logs, "LogResolveJoinBallot", { sender: partner }).args.result.should.be.equal(true);

          (await this.federation.isFederated(partner)).should.be.equal(true);
        });

        it("resolves ballot negatively and retrieves stake if there is no quorum", async () => {
          const { tx, logs } = await this.federation.resolveJoinBallot({ from: partner });

          expectEvent.inLogs(logs, "LogResolveJoinBallot", { sender: partner }).args.result.should.be.equal(false);

          (await this.federation.isFederated(partner)).should.be.equal(false);

          (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
            initialMinimumFederationStake
          );
        });

        describe("When the deadline has passed", () => {
          it("rejects votes", async () => {
            const delta = 2 * 24 * 3600;

            await web3.currentProvider.send(
              { jsonrpc: "2.0", method: "evm_increaseTime", params: [delta], id: 123 },
              (err, result) => {
                if (err) {
                  console.error(err);
                  return;
                }
              }
            );

            await shouldFail.reverting.withMessage(
              this.federation.voteJoinBallot(partner, { from: geodb }),
              ErrorMsgs.deadlineHasPassed
            );
          });
        });

        describe("When double voting", () => {
          it("rejects votes", async () => {
            await this.federation.voteJoinBallot(partner, { from: geodb });
            await shouldFail.reverting.withMessage(
              this.federation.voteJoinBallot(partner, { from: geodb }),
              ErrorMsgs.cannotVoteTwice
            );
          });
        });

        describe("When double resolving", () => {
          it("rejects transaction", async () => {
            await this.federation.voteJoinBallot(partner, { from: geodb });
            await this.federation.resolveJoinBallot({ from: partner });
            await shouldFail.reverting.withMessage(
              this.federation.resolveJoinBallot({ from: partner }),
              ErrorMsgs.thisBallotHasAlreadyBeenResolved
            );
          });
        });
      });

      describe("Without sufficient funds", () => {
        it("rejects ballot creation", async () => {
          await shouldFail.reverting.withMessage(
            this.federation.newJoinBallot(initialMinimumFederationStake, { from: emptyAccount }),
            ErrorMsgs.safeMathSubstractionOverflow
          );
        });
      });
    });
  });

  describe("Federation exit process", () => {
    describe("When caller is federated", () => {
      let newExitBallotLogs;

      beforeEach("Add partners to federation and create ballot", async () => {
        const voters = await addMembersToFederation(
          [geodb],
          [partner, partner2],
          initialMinimumFederationStake,
          this.token,
          this.federation
        );

        const { logs } = await this.federation.newExitBallot({ from: partner });
        newExitBallotLogs = logs;
      });

      it("allows to create the ballot", async () => {
        const event = expectEvent.inLogs(newExitBallotLogs, "LogNewExitBallot", { sender: partner });

        const ballot = await this.federation.federationExitBallots(partner);
        ballot.approvals.should.be.bignumber.equal(initialMinimumFederationStake);
      });

      describe("When voting the exit ballot", () => {
        it("should add votes and stake of federated members", async () => {
          const { logs } = await this.federation.voteExitBallot(partner, { from: geodb });

          const event = expectEvent.inLogs(logs, "LogVoteExitBallot", { sender: geodb });

          const ballot = await this.federation.federationExitBallots(partner);
          ballot.approvals.should.be.bignumber.equal(initialMinimumFederationStake.mul(new BN("2")));
        });
        it("should reject votes of non federated members", async () => {
          await shouldFail.reverting.withMessage(
            this.federation.voteExitBallot(partner, { from: emptyAccount }),
            ErrorMsgs.callerMustBeFederated
          );
        });
        it("should reject votes if the deadline has passed", async () => {
          const delta = 2 * 24 * 3600;

          await web3.currentProvider.send(
            { jsonrpc: "2.0", method: "evm_increaseTime", params: [delta], id: 123 },
            (err, result) => {
              if (err) {
                console.error(err);
                return;
              }
            }
          );

          await shouldFail.reverting.withMessage(
            this.federation.voteExitBallot(partner, { from: geodb }),
            ErrorMsgs.deadlineHasPassed
          );
        });
        it("should reject votes if the ballot has been resolved", async () => {
          await this.federation.voteExitBallot(partner, { from: geodb });
          await this.federation.resolveExitBallot({ from: partner });

          await shouldFail.reverting.withMessage(
            this.federation.voteExitBallot(partner, { from: partner2 }),
            ErrorMsgs.thisBallotHasAlreadyBeenResolved
          );
        });

        it("should reject double voting", async () => {
          await this.federation.voteExitBallot(partner, { from: geodb });

          shouldFail.reverting.withMessage(
            this.federation.voteExitBallot(partner, { from: geodb }),
            ErrorMsgs.cannotVoteTwice
          );
          shouldFail.reverting.withMessage(
            this.federation.voteExitBallot(partner, { from: partner }),
            ErrorMsgs.cannotVoteTwice
          );
        });
      });

      describe("When resolving the exit ballot", () => {
        it("should allow to exit and retrieve stake if ballot was resolved positively", async () => {
          await this.federation.voteExitBallot(partner, { from: geodb });

          const { logs } = await this.federation.resolveExitBallot({ from: partner });

          expectEvent.inLogs(logs, "LogResolveExitBallot", { sender: partner }).args.result.should.be.equal(true);
          expectEvent
            .inLogs(logs, "LogMemberExit", { sender: partner })
            .args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

          const partnerFederationStake = await this.federation.federationStakes(partner);

          partnerFederationStake.approved.should.be.equal(false);
          partnerFederationStake.stake.should.be.bignumber.equal(new BN("0"));

          (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
            initialMinimumFederationStake.mul(new BN("2"))
          );

          (await this.token.balanceOf(partner)).should.be.bignumber.equal(initialFundingForPartners);

          (await this.federation.isFederated(partner)).should.be.equal(false);
        });
        it("should end the vote and make no changes if ballot was resolved negatively", async () => {
          const { logs } = await this.federation.resolveExitBallot({ from: partner });

          expectEvent.inLogs(logs, "LogResolveExitBallot", { sender: partner }).args.result.should.be.equal(false);
        });

        it("should reject trying to resolve the ballot twice", async () => {
          await this.federation.voteExitBallot(partner, { from: geodb });
          await this.federation.resolveExitBallot({ from: partner });

          shouldFail.reverting.withMessage(
            this.federation.resolveExitBallot({ from: partner }),
            ErrorMsgs.callerMustBeFederated
          );
        });
        it("should reject trying to resolve the ballot when the deadline has passed", async () => {
          await this.federation.voteExitBallot(partner, { from: geodb });

          const delta = 2 * 24 * 3600;

          await web3.currentProvider.send(
            { jsonrpc: "2.0", method: "evm_increaseTime", params: [delta], id: 123 },
            (err, result) => {
              if (err) {
                console.error(err);
                return;
              }
            }
          );

          await shouldFail.reverting.withMessage(
            this.federation.resolveExitBallot({ from: partner }),
            ErrorMsgs.deadlineHasPassed
          );
        });
      });

      describe("After resolving a ballot positively", () => {
        beforeEach("exit the federation", async () => {
          await exitFederation([geodb, partner2], partner, this.federation);
        });

        it("should allow to create a new join ballot", async () => {
          await this.token.approve(this.federation.address, initialMinimumFederationStake, { from: partner });
          const { logs } = await this.federation.newJoinBallot(initialMinimumFederationStake, { from: partner });

          expectEvent
            .inLogs(logs, "LogNewJoinBallot", { sender: partner })
            .args.stake.should.be.bignumber.equal(initialMinimumFederationStake);

          (await this.token.balanceOf(this.federation.address)).should.be.bignumber.equal(
            initialMinimumFederationStake.mul(new BN("3"))
          );

          (await this.token.balanceOf(partner)).should.be.bignumber.equal(
            initialFundingForPartners.sub(initialMinimumFederationStake)
          );

          const ballot = await this.federation.federationJoinBallots(partner);

          ballot.approvals.should.be.bignumber.equal(new BN("0"));
          ballot.resolved.should.be.equal(false);

          const federationStake = await this.federation.federationStakes(partner);

          federationStake.stake.should.be.bignumber.equal(initialMinimumFederationStake);
          federationStake.approved.should.be.equal(false);
        });
      });
    });

    describe("When caller is not federated", () => {
      it("rejects creating ballot", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.newExitBallot({ from: emptyAccount }),
          ErrorMsgs.callerMustBeFederated
        );
      });
    });

    describe("When no previous ballot was created", () => {
      it("rejects voting", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.voteExitBallot(partner, { from: geodb }),
          ErrorMsgs.deadlineHasPassed
        );
      });
      it("rejects resolving", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.resolveExitBallot({ from: geodb }),
          ErrorMsgs.deadlineHasPassed
        );
      });
    });
  });

  describe("Federation stake requirement change", () => {
    beforeEach("Setup federation", async () => {
      const voters = await addMembersToFederation(
        [geodb],
        [partner, partner2],
        initialMinimumFederationStake,
        this.token,
        this.federation
      );
    });

    describe("When caller is federated", () => {
      let newStakeProposal = initialMinimumFederationStake.mul(new BN("2"));

      it("rejects ballot if proposal is 0", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.newStakeRequirementBallot(new BN("0"), { from: geodb }),
          ErrorMsgs.stakeProposalCannotBeZero
        );
      });

      it("allows to create the ballot", async () => {
        const { logs } = await this.federation.newStakeRequirementBallot(newStakeProposal, { from: geodb });

        expectEvent
          .inLogs(logs, "LogNewStakeRequirementBallot", { sender: geodb })
          .args.stakeProposal.should.be.bignumber.equal(newStakeProposal);
      });

      describe("When voting the ballot", () => {
        beforeEach("create the ballot", async () => {
          await this.federation.newStakeRequirementBallot(newStakeProposal, {
            from: geodb
          });
        });

        it("allows to vote", async () => {
          const { logs } = await this.federation.voteStakeRequirementBallot(geodb, { from: partner });

          const event = expectEvent.inLogs(logs, "LogVoteStakeRequirementBallot", { sender: partner, ballot: geodb });

          event.args.approvals.should.be.bignumber.equal(newStakeProposal);
          event.args.voteWeight.should.be.bignumber.equal(initialMinimumFederationStake);
        });

        it("rejects voting if the caller is not federated", async () => {
          await shouldFail.reverting.withMessage(
            this.federation.voteStakeRequirementBallot(geodb, { from: emptyAccount }),
            ErrorMsgs.callerMustBeFederated
          );
        });

        it("rejects voting if the ballot is resolved", async () => {
          await this.federation.resolveStakeRequirementBallot({ from: geodb });

          await shouldFail.reverting.withMessage(
            this.federation.voteStakeRequirementBallot(geodb, { from: partner }),
            ErrorMsgs.thisBallotHasAlreadyBeenResolved
          );
        });

        it("rejects voting if the deadline has passed", async () => {
          const delta = 2 * 24 * 3600;

          await web3.currentProvider.send(
            { jsonrpc: "2.0", method: "evm_increaseTime", params: [delta], id: 123 },
            (err, result) => {
              if (err) {
                console.error(err);
                return;
              }
            }
          );

          await shouldFail.reverting.withMessage(
            this.federation.voteStakeRequirementBallot(geodb, { from: partner }),
            ErrorMsgs.deadlineHasPassed
          );
        });

        it("should reject double voting", async () => {
          await this.federation.voteStakeRequirementBallot(geodb, { from: partner });

          await shouldFail.reverting.withMessage(
            this.federation.voteStakeRequirementBallot(geodb, { from: partner }),
            ErrorMsgs.cannotVoteTwice
          );

          await shouldFail.reverting.withMessage(
            this.federation.voteStakeRequirementBallot(geodb, { from: geodb }),
            ErrorMsgs.cannotVoteTwice
          );
        });
      });

      describe("When resolving the ballot", () => {
        beforeEach("create the ballot", async () => {
          await this.federation.newStakeRequirementBallot(newStakeProposal, {
            from: geodb
          });
        });

        it("changes the stake requirement if the resolution is positive", async () => {
          await this.federation.voteStakeRequirementBallot(geodb, { from: partner });

          const { logs } = await this.federation.resolveStakeRequirementBallot({ from: geodb });

          expectEvent
            .inLogs(logs, "LogResolveStakeRequirementBallot", { sender: geodb })
            .args.result.should.be.equal(true);
          expectEvent
            .inLogs(logs, "LogFederationStakeRequirementChange", { sender: geodb })
            .args.newStakeRequirement.should.be.bignumber.equal(newStakeProposal);

          (await this.federation.federationMinimumStake()).should.be.bignumber.equal(newStakeProposal);

          (await this.federation.stakeRequirementBallots(geodb)).resolved.should.be.equal(true);
        });

        it("closes the ballot if the resolution is negative, does not modify stake", async () => {
          const { logs } = await this.federation.resolveStakeRequirementBallot({ from: geodb });

          expectEvent
            .inLogs(logs, "LogResolveStakeRequirementBallot", { sender: geodb })
            .args.result.should.be.equal(false);

          (await this.federation.federationMinimumStake()).should.be.bignumber.equal(initialMinimumFederationStake);

          (await this.federation.stakeRequirementBallots(geodb)).resolved.should.be.equal(true);
        });

        it("rejects resolving if the member is not federated", async () => {
          await exitFederation([partner, partner2], geodb, this.federation);

          await shouldFail.reverting.withMessage(
            this.federation.resolveStakeRequirementBallot({ from: geodb }),
            ErrorMsgs.callerMustBeFederated
          );
        });

        it("rejects resolving if the deadline has passed", async () => {
          const delta = 2 * 24 * 3600;

          await web3.currentProvider.send(
            { jsonrpc: "2.0", method: "evm_increaseTime", params: [delta], id: 123 },
            (err, result) => {
              if (err) {
                console.error(err);
                return;
              }
            }
          );

          await shouldFail.reverting.withMessage(
            this.federation.resolveStakeRequirementBallot({ from: geodb }),
            ErrorMsgs.deadlineHasPassed
          );
        });
      });
    });

    describe("When no previous ballot was created", () => {
      it("rejects voting", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.voteStakeRequirementBallot(geodb, { from: partner }),
          ErrorMsgs.deadlineHasPassed
        );
      });
      it("rejects resolving", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.resolveStakeRequirementBallot({ from: geodb }),
          ErrorMsgs.deadlineHasPassed
        );
      });
    });

    describe("When caller is not federated", () => {
      it("rejects creating ballot", async () => {
        await shouldFail.reverting.withMessage(
          this.federation.newStakeRequirementBallot(new BN("1"), { from: emptyAccount }),
          ErrorMsgs.callerMustBeFederated
        );
      });
    });
  });

  describe("Token - Federation contract interaction", () => {
    it("allows token minting from federation", async () => {
      const { tx, logs } = await this.federation.releaseReward(accounts[0], "100", { from: geodb });
    });
  });
});
