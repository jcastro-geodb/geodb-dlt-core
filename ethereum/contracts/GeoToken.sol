pragma solidity >= 0.5.0 <6.0.0;

import "../externals/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";
// Replace the two above for:
// import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
// import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
// in production

contract GeoToken is Ownable, ERC20Burnable {
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

  function releaseReward(address to, uint256 reward) public onlyOwner() {
    if(totalSupply() + reward < maxSupply){
      _mint(to, reward);
      emit LogReward(tx.origin, to, reward);
    }
  }

}
