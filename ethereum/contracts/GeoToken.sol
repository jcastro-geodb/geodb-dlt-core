pragma solidity >= 0.5.0 <6.0.0;

import "../externals/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../externals/openzeppelin-solidity/contracts/math/SafeMath.sol";
// Replace the two above for:
// import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
// import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
// in production

contract GeoToken is Ownable, ERC20Burnable {
  using SafeMath for uint256;
  // Token constants

  uint256 constant public maxSupply = 100000000000000;
  uint32 constant public decimals = 5;
  string constant public name = "GeoDB Token";
  string public symbol = "GEO";

  constructor(address[] memory presaleHolders, uint[] memory presaleAmounts) public {
    _mint(msg.sender, 10000000000000); // Team allocation

    for(uint i = 0; i < presaleHolders.length; i++){
      _mint(presaleHolders[i], presaleAmounts[i]);
    }
  }

  event LogReward(
    address indexed from,
    address indexed to,
    uint256 amount
  );

  function releaseReward(address to, uint256 reward) public onlyOwner() returns (bool) {
    if(totalSupply().add(reward) < maxSupply){
      emit LogReward(tx.origin, to, reward);
      _mint(to, reward);
      return true;
    }

    return false;
  }

}
