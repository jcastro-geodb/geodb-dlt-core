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
  uint256 constant public initialStakeRequirement = 100000; // 1 GEO
  string constant public name = "GeoDB Token";
  string public symbol = "GEO";


  // Federation

  uint256[] public federationStakeProposals;
  uint256 public currentFederationStakeProposal;
  uint256 public totalStake;

  mapping(address => FederationStake) public federationStakes;
  FederationStakingBallot[] public federationStakingBallots;

  constructor() public {
    _mint(msg.sender, 10000000000000); // Team allocation
    currentFederationStakeProposal = 0;
    federationStakeProposals.push(initialStakeRequirement);

    // Initial stake given to the owner
    _mint(address(this), federationStakeProposals[0]);
    federationStakes[msg.sender].approved = true;
    totalStake = totalStake.add(federationStakeProposals[0]);
    federationStakes[msg.sender].stake = federationStakeProposals[0];

  }

  function getCurrentFederationStakeRequirement() public view returns (uint256){
    return federationStakeProposals[currentFederationStakeProposal];
  }

  function federationStakeLock(uint256 amount) public returns (uint256){

    federationStakes[msg.sender].approved = true; // Delete when voting to join federation is available 

    uint256 summedStakes = federationStakes[msg.sender].stake.add(amount);
    require(summedStakes >= federationStakeProposals[currentFederationStakeProposal], "Staked amount is not enough");
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

  function voteStakeWithdrawalRequest(address addr, uint16 index) public callerMustBeFederated {
    require(addr != msg.sender, "Your votes will be automatically added when you call federationStakeWithdraw()");
    require(index > 0, "Index must be greater than 0");
    require(federationStakes[addr].releaseRequestIndex == index, "Index must be equal to current request");
    bytes32 withdrawApprover = keccak256(abi.encode(index, msg.sender));
    require(federationStakes[addr].withdrawApprovers[withdrawApprover] == false, "You cannot vote twice");

    federationStakes[addr].withdrawApprovals[index] = federationStakes[addr].withdrawApprovals[index].add(federationStakes[msg.sender].stake);
    federationStakes[addr].withdrawApprovers[withdrawApprover] = true;


  }

  function newStakingBallot(uint256 stake) public {

    address[] memory approvers = new address[](0);

    approvers[0] = msg.sender;

    federationStakingBallots.push(FederationStakingBallot({
      stake: stake,
      approved: false,
      approvers: approvers,
      block: block.number
    }));
  }



  function releaseRewards(address userAddress, uint256 reward) public onlyOwner {
    require(federationStakes[msg.sender].stake >= federationStakeProposals[currentFederationStakeProposal], "Staked amount is not enough");

    if(totalSupply() + reward < maxSupply){
      _mint(userAddress, reward);
    }
  }

  modifier callerMustHaveStake() {
    require(federationStakes[msg.sender].stake > 0, "There is no stake for this address");
    _;
  }

  modifier callerMustBeFederated() {
      require(federationStakes[msg.sender].stake >= federationStakeProposals[currentFederationStakeProposal], "Caller must be part of the federation");
      _;
  }

}
