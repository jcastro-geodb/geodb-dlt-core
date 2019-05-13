pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./GeoDBClasses.sol";

/**
* @title GeoDB ERC20 Token
*/
contract GeoDB is GeoDBClasses, ERC20, Ownable{

  // Contract constants

  uint256 constant public maxSupply = 100000000000000;
  uint32 constant public decimals = 5;
  string constant public name = "GeoDB Token";
  string public symbol = "GEO";


  // Federation

  uint256 public federationMinimumStake;
  uint256 public totalStake;

  mapping(address => FederationStake) public federationStakes;
  mapping(address => FederationJoinBallot) public federationJoinBallots;
  FederationStakingBallot[] public federationStakingBallots;

  constructor() public {
    _mint(msg.sender, 10000000000000); // Team allocation

    federationMinimumStake = 100000; // Initial minimum stake: 1 GEO

    // Initial stake given to the owner
    _mint(address(this), federationMinimumStake);
    federationStakes[msg.sender].approved = true;
    totalStake = totalStake.add(federationMinimumStake);
    federationStakes[msg.sender].stake = federationMinimumStake;

  }

  // Stake management

  function federationStakeLock(uint256 amount) public returns (uint256){

    federationStakes[msg.sender].approved = true; // Delete when voting to join federation is available

    uint256 summedStakes = federationStakes[msg.sender].stake.add(amount);
    require(summedStakes >= federationMinimumStake, "Staked amount is not enough");
    transfer(address(this), amount);
    totalStake = totalStake.add(amount);
    federationStakes[msg.sender].stake = summedStakes;
  }

  function federationStakeWithdraw() public callerMustHaveStake {

    if(federationStakes[msg.sender].approved == false){
      withdrawStake(msg.sender);
      return;
    }

    require(federationStakes[msg.sender].releaseRequestIndex > 0, "Request stake withdrawal first");
    require(
       federationStakes[msg.sender].withdrawApprovals[federationStakes[msg.sender].releaseRequestIndex]
       + federationStakes[msg.sender].stake
       >= totalStake.div(2), "Voting stake is not enough"
     );

    totalStake = totalStake.sub(federationStakes[msg.sender].stake);
    withdrawStake(msg.sender);
  }

  function withdrawStake(address addr) internal {
    uint256 stake = federationStakes[addr].stake;
    federationStakes[addr].stake = 0;
    GeoDB selfReference = GeoDB(address(this));
    selfReference.transfer(addr, stake);
  }

  function getStake() public view returns(uint256){
    return federationStakes[msg.sender].stake;
  }

  function requestStakeWithdrawal() public callerMustHaveStake {
    require(federationStakes[msg.sender].releaseRequestIndex != 65535, "Withdrawal request depleted");
    federationStakes[msg.sender].releaseRequestIndex = federationStakes[msg.sender].releaseRequestIndex + 1;
  }

  function voteStakeWithdrawalRequest(address addr, uint16 index) public callerMustBeFederated() {
    require(addr != msg.sender, "Your votes will be automatically added when you call federationStakeWithdraw()");
    require(index > 0, "Index must be greater than 0");
    require(federationStakes[addr].releaseRequestIndex == index, "Index must be equal to current request");
    bytes32 withdrawApprover = keccak256(abi.encode(index, msg.sender));
    require(federationStakes[addr].withdrawApprovers[withdrawApprover] == false, "You cannot vote twice");

    federationStakes[addr].withdrawApprovals[index] = federationStakes[addr].withdrawApprovals[index].add(federationStakes[msg.sender].stake);
    federationStakes[addr].withdrawApprovers[withdrawApprover] = true;


  }

  // Federation minimum stake modification process

  function getCurrentFederationStakeRequirement() public view returns (uint256){
    return federationMinimumStake;
  }

  function newStakingBallot(uint256 stake) public callerMustBeFederated() {

    FederationStakingBallot memory ballot = FederationStakingBallot({
      stake: stake,
      approved: false,
      proposer: msg.sender,
      approvals: federationStakes[msg.sender].stake,
      deadline: (block.timestamp + 1 days)
    });

    federationStakingBallots.push(ballot);
  }

  function voteStakingBallot(uint256 index) public callerMustBeFederated stakingBallotIsValid(index) {
    require(!federationStakingBallots[index].approvers[msg.sender] && msg.sender != federationStakingBallots[index].proposer, "You cannot vote twice");
    federationStakingBallots[index].approvers[msg.sender] = true;
    federationStakingBallots[index].approvals = federationStakingBallots[index].approvals.add(federationStakes[msg.sender].stake);
  }

  function resolveStakingBallot(uint256 index) public callerMustBeFederated() stakingBallotIsValid(index){
    require(federationStakingBallots[index].approvals >
      totalStake.div(2),
      "Voting stake is not enough"
    );

    federationStakingBallots[index].approved = true;
    federationMinimumStake = federationStakingBallots[index].stake;

  }

  function getStakingBallotsCount() public view returns (uint256){
    return federationStakingBallots.length;
  }

  // Rewards

  function releaseRewards(address userAddress, uint256 reward) public callerMustBeFederated() {
    if(totalSupply() + reward < maxSupply){
      _mint(userAddress, reward);
    }
  }

  // Modifiers

  modifier callerMustHaveStake() {
    require(federationStakes[msg.sender].stake > 0, "There is no stake for this address");
    _;
  }

  modifier callerMustBeFederated() {
    require(federationStakes[msg.sender].stake >= federationMinimumStake
      && federationStakes[msg.sender].approved,
      "Caller must be part of the federation");
    _;
  }

  modifier stakingBallotIsValid(uint256 index){
    require(index < federationStakingBallots.length, "Index does not exist");
    require(now <= federationStakingBallots[index].deadline, "The deadline has passed");
    require(federationStakingBallots[index].approved == false, "This ballot has already been approved"); // Untested
    _;
  }

}
