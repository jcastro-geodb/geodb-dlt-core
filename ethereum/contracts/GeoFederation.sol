pragma solidity >= 0.5.0 <6.0.0;

import "../externals/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";
// Replace the two above for:
// import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
// import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
// in production

import "./GeoToken.sol";
import "./GeoDBClasses.sol";

/**
* @title GeoDB ERC20 Token
*/
contract GeoFederation is GeoDBClasses, Ownable{
  using SafeMath for uint256;
  // Token

  GeoToken token;

  // Federation

  uint256 public federationMinimumStake;
  uint256 public totalStake;

  mapping(address => FederationStake) public federationStakes;

  mapping(address => Ballot) public federationJoinBallots;
  mapping(address => Ballot) public federationExitBallots;

  // FederationStakingBallot[] public federationStakingBallots;

  constructor(address tokenContract) public {
    federationMinimumStake = 100000; // Initial minimum stake: 1 GEO
    token = GeoToken(tokenContract);
    federationStakes[msg.sender] = FederationStake(0, true);
  }

  event LogIncreaseStake(
    address indexed sender,
    uint256 amount,
    uint256 total
  );

  event LogNewJoinBallot(
    address indexed sender,
    uint256 stake,
    uint256 deadline
  );

  event LogVoteJoinBallot(
    address indexed sender,
    address indexed ballot,
    uint256 voteWeight,
    uint256 approvals
  );

  event LogResolveJoinBallot(
    address indexed sender,
    bool result
  );

  event LogNewMember(
    address indexed sender,
    uint256 stake
  );

  event LogNewExitBallot(
    address indexed sender,
    uint256 deadline
  );

  event LogVoteExitBallot(
    address indexed sender,
    address indexed ballot,
    uint256 voteWeight,
    uint256 approvals
  );

  event LogResolveExitBallot(
    address indexed sender,
    bool result
  );

  event LogMemberExit(
    address indexed sender,
    uint256 stake
  );

  modifier callerMustBeApproved(){
    require(isApproved(msg.sender), "Caller must be approved");
    _;
  }

  modifier callerMustBeFederated() {
    require(isFederated(msg.sender), "Caller must be federated");
    _;
  }

  modifier ballotMustBeWithinDeadline(Ballot storage ballot) {
    require(now <= ballot.deadline, "The deadline has passed");
    _;
  }

  modifier ballotCannotBeResolved(Ballot storage ballot){
    require(ballot.resolved == false, "This ballot has already been resolved");
    _;
  }

  modifier callerCannotBeApproved(){
    require(isApproved(msg.sender) == false, "Caller cannot be approved");
    _;
  }

  modifier callerCannotHaveStake() {
    require(getStake() == 0, "Caller cannot have stake");
    _;
  }

  function increaseStake(uint256 amount) public callerMustBeApproved() {
      uint256 summedStakes = federationStakes[msg.sender].stake.add(amount);
      require(summedStakes >= federationMinimumStake, "Staked amount is not enough");
      totalStake = totalStake.add(amount);
      federationStakes[msg.sender].stake = summedStakes;
      emit LogIncreaseStake(msg.sender, amount, totalStake);
      require(token.transferFrom(msg.sender, address(this), amount));
  }

  function newJoinBallot(uint256 amount) public callerCannotBeApproved() callerCannotHaveStake() {
    require(amount >= federationMinimumStake, "Not enough stake");
    federationJoinBallots[msg.sender] = Ballot({
      approvals: 0,
      deadline: (block.timestamp + 1 days),
      resolved: false
    });
    federationStakes[msg.sender].stake = amount;
    emit LogNewJoinBallot(msg.sender, amount, federationJoinBallots[msg.sender].deadline);
    require(token.transferFrom(msg.sender, address(this), amount));
  }

  function voteJoinBallot(address newMember) public
    callerMustBeFederated()
    ballotMustBeWithinDeadline(federationJoinBallots[newMember])
    ballotCannotBeResolved(federationJoinBallots[newMember]) {

    require(federationJoinBallots[newMember].approvers[msg.sender] == false, "Cannot vote twice");
    federationJoinBallots[newMember].approvals = federationJoinBallots[newMember].approvals.add(getStake());
    federationJoinBallots[newMember].approvers[msg.sender] = true;
    emit LogVoteJoinBallot(msg.sender, newMember, getStake(), federationJoinBallots[newMember].approvals);

  }

  function resolveJoinBallot() public ballotCannotBeResolved(federationJoinBallots[msg.sender]){
    federationJoinBallots[msg.sender].resolved = true;
    federationStakes[msg.sender].approved = federationJoinBallots[msg.sender].approvals >= totalStake.div(2);
    emit LogResolveJoinBallot(msg.sender, federationStakes[msg.sender].approved);

    if(federationStakes[msg.sender].approved){
      totalStake = totalStake.add(federationStakes[msg.sender].stake);
      emit LogNewMember(msg.sender, federationStakes[msg.sender].stake);
    }else{
      uint256 stake = federationStakes[msg.sender].stake;
      federationStakes[msg.sender].stake = 0;
      require(token.transfer(msg.sender, stake), "Could not return back stake");
    }
  }

  function newExitBallot() public callerMustBeFederated() {
    federationExitBallots[msg.sender] = Ballot({
      approvals: federationStakes[msg.sender].stake,
      deadline: (block.timestamp + 1 days),
      resolved: false
    });
    federationExitBallots[msg.sender].approvers[msg.sender] = true;
    emit LogNewExitBallot(msg.sender, federationExitBallots[msg.sender].deadline);
  }

  function voteExitBallot(address member) public
    callerMustBeFederated()
    ballotCannotBeResolved(federationExitBallots[member])
    ballotMustBeWithinDeadline(federationExitBallots[member]) {

    require(federationExitBallots[member].approvers[msg.sender] == false, "Cannot vote twice");
    federationExitBallots[member].approvals = federationExitBallots[member].approvals.add(getStake());
    federationExitBallots[member].approvers[msg.sender] = true;
    emit LogVoteExitBallot(msg.sender, member, getStake(), federationExitBallots[member].approvals);

  }

  function resolveExitBallot() public
    callerMustBeFederated()
    ballotCannotBeResolved(federationExitBallots[msg.sender])
    ballotMustBeWithinDeadline(federationExitBallots[msg.sender]) {

    federationExitBallots[msg.sender].resolved = true;

    bool result = federationExitBallots[msg.sender].approvals >= totalStake.div(2);
    emit LogResolveExitBallot(msg.sender, result);

    if(result){
      uint256 stake = federationStakes[msg.sender].stake;
      federationStakes[msg.sender].approved = false;
      federationStakes[msg.sender].stake = 0;
      totalStake = totalStake.sub(stake);
      emit LogMemberExit(msg.sender, stake);
      require(token.transfer(msg.sender, stake), "Could not return back stake");
    }
  }



  function releaseReward(address to, uint256 reward) public callerMustBeFederated() {
    require(token.releaseReward(to, reward), "Could not release reward");
  }

  // Getters
  function isApproved(address addr) public view returns(bool) {
    return federationStakes[addr].approved;
  }

  function isFederated(address addr) public view returns (bool) {
    return federationStakes[addr].approved && federationStakes[addr].stake >= federationMinimumStake;
  }

  function getStake() public view returns(uint256){
    return federationStakes[msg.sender].stake;
  }


  // // Stake management
  //
  // function getStake() public view returns(uint256){
  //   return federationStakes[msg.sender].stake;
  // }
  //
  // function increaseStake(uint256 amount) public callerMustBeApproved() {
  //   uint256 summedStakes = federationStakes[msg.sender].stake.add(amount);
  //   require(summedStakes >= federationMinimumStake, "Staked amount is not enough");
  //   transfer(address(this), amount);
  //   totalStake = totalStake.add(amount);
  //   federationStakes[msg.sender].stake = summedStakes;
  // }
  //
  // function withdrawStake() public callerMustHaveStake() {
  //
  //   // if(federationStakes[msg.sender].approved == false){
  //   //   _withdrawStake(msg.sender);
  //   //   return;
  //   // }else if(federationStakes[msg.sender].approved && federationStakes[msg.sender].stake < federationMinimumStake){
  //   //   totalStake = totalStake.sub(federationStakes[msg.sender].stake);
  //   //   _withdrawStake(msg.sender);
  //   //   return;
  //   // }
  //
  //   require(federationStakes[msg.sender].releaseRequestIndex > 0, "Request stake withdrawal first");
  //   require(
  //      federationStakes[msg.sender].withdrawApprovals[federationStakes[msg.sender].releaseRequestIndex]
  //      + federationStakes[msg.sender].stake
  //      >= totalStake.div(2), "Voting stake is not enough"
  //    );
  //
  //   totalStake = totalStake.sub(federationStakes[msg.sender].stake);
  //   _withdrawStake(msg.sender);
  // }
  //
  // // Internal helper function for withdrawkStake()
  // function _withdrawStake(address addr) internal {
  //   uint256 stake = federationStakes[addr].stake;
  //   federationStakes[addr].stake = 0;
  //   federationStakes[addr].approved = false;
  //   GeoDB selfReference = GeoDB(address(this));
  //   selfReference.transfer(addr, stake);
  // }
  //
  // function requestStakeWithdrawal() public callerMustHaveStake() {
  //   federationStakes[msg.sender].releaseRequestIndex = federationStakes[msg.sender].releaseRequestIndex.add(1);
  // }
  //
  // function voteStakeWithdrawalRequest(address addr, uint256 index) public callerMustBeFederated() {
  //   require(addr != msg.sender, "Your votes will be automatically added when you call federationStakeWithdraw()");
  //   require(index > 0, "Index must be greater than 0");
  //   require(federationStakes[addr].releaseRequestIndex == index, "Index must be equal to current request");
  //   bytes32 withdrawApprover = keccak256(abi.encode(index, msg.sender));
  //   require(federationStakes[addr].withdrawApprovers[withdrawApprover] == false, "You cannot vote twice");
  //
  //   federationStakes[addr].withdrawApprovals[index] = federationStakes[addr].withdrawApprovals[index].add(federationStakes[msg.sender].stake);
  //   federationStakes[addr].withdrawApprovers[withdrawApprover] = true;
  // }
  //
  // // TODO: add deadline
  // function purgeMember(address addr) public callerMustBeFederated(){
  //   require(federationStakes[addr].stake < federationMinimumStake && federationStakes[addr].approved, "Member cannot be purged");
  //   uint256 stake = federationStakes[addr].stake;
  //   federationStakes[addr].stake = 0;
  //   federationStakes[addr].approved = false;
  //   totalStake = totalStake.sub(stake);
  //   GeoDB selfReference = GeoDB(address(this));
  //   selfReference.burn(stake);
  // }
  //
  // // Federation join / approve member process
  //
  // function requestFederationJoin() public callerCannotBeFederated() callerCannotHaveStake() {
  //   transfer(address(this), federationMinimumStake);
  //   federationJoinBallots[msg.sender].requestIndex = federationJoinBallots[msg.sender].requestIndex.add(1);
  //   federationStakes[msg.sender].stake = federationMinimumStake;
  // }
  //
  // function voteFederationJoin(address addr) public callerMustBeFederated(){
  //   require(federationJoinBallots[addr].requestIndex > 0, "Index must be greater than 0");
  //   uint256 index = federationJoinBallots[addr].requestIndex;
  //   require(federationJoinBallots[addr].used[index] == false, "This join request has already been resolved");
  //   bytes32 approver = keccak256(abi.encode(index, msg.sender));
  //   require(federationJoinBallots[addr].approvers[approver] == false, "You cannot vote twice");
  //
  //   federationJoinBallots[addr].approvers[approver] = true;
  //   federationJoinBallots[addr].approvals[index] = federationJoinBallots[addr].approvals[index].add(federationStakes[msg.sender].stake);
  // }
  //
  // function resolveFederationJoin(bool commit) public callerMustHaveStake() callerCannotBeFederated() {
  //   uint256 index = federationJoinBallots[msg.sender].requestIndex;
  //   require(index > 0, "Index must be greater than 0");
  //   require(federationJoinBallots[msg.sender].used[index] == false, "This join request has already been resolved");
  //
  //   federationJoinBallots[msg.sender].used[index] = true;
  //   if(commit){
  //     require(federationJoinBallots[msg.sender].approvals[index] > totalStake.div(2), "Voting stake is not enough"); // Untested
  //     federationStakes[msg.sender].approved = true;
  //     totalStake = totalStake.add(federationStakes[msg.sender].stake);
  //   }else{
  //     _withdrawStake(msg.sender);
  //   }
  // }
  //
  // // Federation minimum stake modification process
  //
  // function getCurrentFederationStakeRequirement() public view returns (uint256){
  //   return federationMinimumStake;
  // }
  //
  // function newStakingBallot(uint256 stake) public callerMustBeFederated() {
  //
  //   FederationStakingBallot memory ballot = FederationStakingBallot({
  //     stake: stake,
  //     approved: false,
  //     proposer: msg.sender,
  //     approvals: federationStakes[msg.sender].stake,
  //     deadline: (block.timestamp + 1 days)
  //   });
  //
  //   federationStakingBallots.push(ballot);
  // }
  //
  // function voteStakingBallot(uint256 index) public callerMustBeFederated() stakingBallotIsValid(index) {
  //   require(!federationStakingBallots[index].approvers[msg.sender] && msg.sender != federationStakingBallots[index].proposer, "You cannot vote twice");
  //   federationStakingBallots[index].approvers[msg.sender] = true;
  //   federationStakingBallots[index].approvals = federationStakingBallots[index].approvals.add(federationStakes[msg.sender].stake);
  // }
  //
  // function resolveStakingBallot(uint256 index) public callerMustBeFederated() stakingBallotIsValid(index){
  //   require(federationStakingBallots[index].approvals >
  //     totalStake.div(2),
  //     "Voting stake is not enough"
  //   );
  //
  //   federationStakingBallots[index].approved = true;
  //   federationMinimumStake = federationStakingBallots[index].stake;
  //
  // }
  //
  // function getStakingBallotsCount() public view returns (uint256){
  //   return federationStakingBallots.length;
  // }
  //
  // // Rewards
  //
  // function releaseRewards(address userAddress, uint256 reward) public callerMustBeFederated() {
  //   if(totalSupply() + reward < maxSupply){
  //     _mint(userAddress, reward);
  //   }
  // }
  //
  // // Getters
  //
  // function getStatusForJoinFederationBallot(address addr, uint index) public view returns (bool) {
  //   return federationJoinBallots[addr].used[index];
  // }
  //
  // function getApprovalsForJoinFederationBallot(address addr, uint index) public view returns (uint) {
  //   return federationJoinBallots[addr].approvals[index];
  // }
  //
  // function getApproverForJoinFederationBallot(address addr, address approverAddr, uint index) public view returns (bool) {
  //   bytes32 approverHash = keccak256(abi.encode(index, approverAddr));
  //   return federationJoinBallots[addr].approvers[approverHash];
  // }
  //
  // function isFederated(address addr) public view returns (bool) {
  //   return federationStakes[addr].stake >= federationMinimumStake
  //     && federationStakes[addr].approved;
  // }
  //
  // function getApprovalsWithdrawRquest(address addr, uint index) public view returns (uint) {
  //   return federationStakes[addr].withdrawApprovals[index];
  // }
  //
  // function getApproverWithdrawRequest(address addr, address approverAddr, uint index) public view returns (bool) {
  //   bytes32 approverHash = keccak256(abi.encode(index, approverAddr));
  //   return federationStakes[addr].withdrawApprovers[approverHash];
  // }
  //
  // function getApproverForStakingBallot(address approver, uint index) public view returns (bool) {
  //   return federationStakingBallots[index].approvers[approver];
  // }
  //
  // // Modifiers
  //
  // modifier callerMustHaveStake() {
  //   require(federationStakes[msg.sender].stake > 0, "There is no stake for this address");
  //   _;
  // }
  //
  // modifier callerCannotHaveStake() {
  //   require(federationStakes[msg.sender].stake == 0, "First withdraw your stake");
  //   _;
  // }
  //
  // modifier callerMustBeApproved() {
  //   require(federationStakes[msg.sender].approved, "Caller must be approved to join the federation");
  //   _;
  // }
  //
  // modifier callerMustBeFederated() {
  //   require(isFederated(msg.sender),
  //     "Caller must be part of the federation");
  //   _;
  // }
  //
  // modifier callerCannotBeFederated() {
  //   require(!federationStakes[msg.sender].approved,
  //     "Caller cannot be part of the federation");
  //   _;
  // }
  //
  // modifier stakingBallotIsValid(uint256 index){
  //   require(index < federationStakingBallots.length, "Index does not exist");
  //   require(now <= federationStakingBallots[index].deadline, "The deadline has passed");
  //   require(federationStakingBallots[index].approved == false, "This ballot has already been approved"); // Untested
  //   _;
  // }

}
