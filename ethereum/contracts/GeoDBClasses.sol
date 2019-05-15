pragma solidity ^0.5.2;

contract GeoDBClasses {

  // Struct containing a federation member stake and its withdrawal attempts.
  struct FederationStake {
    uint256 stake; // Member token staking
    bool approved; // Member's voted admission by the rest of the federation
    uint256 releaseRequestIndex; // Incremental index containing most recent withdrawal request
    mapping(uint256 => uint256) withdrawApprovals;  // Stake used by the rest of the federation supporting a withdrawal request
    mapping(bytes32 => bool) withdrawApprovers; // List of voters that are supporting this withdrawal request so that they do not vote twice
  }

  // Struct containing a ballot for an address to join the federation. Before
  // joining, the address must have staked tokens
  struct FederationJoinBallot {
    uint256 requestIndex; // If an address should exit and enter the federation multiple times, we must keep an index of admittance requests
    bool[] used; // Mark if a request has been already been used to join the federation
    uint256[] approvals; // Stake used by the rest of the federation supporting a join request
    mapping(bytes32 => bool) approvers; // List of voters that are supporting this join request so that they do not vote twice
  }

  struct FederationStakingBallot {
    uint256 stake;
    bool approved;
    address proposer;
    uint256 approvals;
    mapping(address => bool) approvers;
    uint256 deadline;
  }


}
