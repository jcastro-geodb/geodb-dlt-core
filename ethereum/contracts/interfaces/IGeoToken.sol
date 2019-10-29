pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC777/IERC777.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract IGeoToken is IERC777, Ownable {
    function releaseReward(address to, uint256 reward) public returns (bool);
}
