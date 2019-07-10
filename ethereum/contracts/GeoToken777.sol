pragma solidity >= 0.5.0 <6.0.0;

import "../externals/openzeppelin-solidity/contracts/token/ERC777/ERC777.sol";
import "../externals/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../externals/openzeppelin-solidity/contracts/math/SafeMath.sol";
// Replace the two above for:
// import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
// import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
// in production

contract GeoToken777 is Ownable, Pausable, ERC777 {
  using SafeMath for uint256;
  // Token constants

  // uint32 constant public decimals = 18;
  // string constant public name = "GeoDB Token";
  // string public symbol = "GEO";
  uint256 constant public maxSupply = 1000000000000000000000000000; // 1 thousand millions of tokens
  uint256 constant public preAssigned = 300000000000000000000000000; // 300 hundred millions of tokens

  event LogReward(
    address indexed sender,
    address indexed origin,
    address indexed to,
    uint256 amount
  );

  constructor(
    string memory name,
    string memory symbol,
    address[] memory defaultOperators
  ) ERC777(name, symbol, defaultOperators)
    public {
      _mint(msg.sender, msg.sender, preAssigned, "", "");
  }


  function releaseReward(address to, uint256 reward) public onlyOwner whenNotPaused returns (bool) {
    if(totalSupply().add(reward) < maxSupply) {
      emit LogReward(msg.sender, tx.origin, to, reward);
      _mint(msg.sender, to, reward, "", "");
      return true;
    }

    return false;
  }

}
