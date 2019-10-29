pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

contract IGeoToken is IERC777 {
    function releaseReward(address to, uint256 reward) public returns (bool);
}
