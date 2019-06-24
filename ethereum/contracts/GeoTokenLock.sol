pragma solidity >= 0.5.0 <6.0.0;

// import "./GeoToken.sol";
import "../externals/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract GeoTokenLock is IERC20, Ownable{
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  uint32 constant public decimals = 18;
  string constant public name = "Locked Geo Tokens";
  string public symbol = "GEO";

  // ERC20 basic token contract being held
  IERC20 private _token;

  // beneficiary of tokens after they are released
  address private _beneficiary;


  uint256 private _deliveryTime; // time when this contract was instantiated
  uint256 private _lockTime; // lock duration

  // amount of tokens held
  uint256 private _lockedAmount;
  uint256 private _withdrawnAmount;


  event LogBalanceLocked(
    address indexed sender,
    uint256 lockedAmount
  );

  event LogBalanceUnlocked(
    address indexed sender,
    uint256 unlockedAmount
  );

  constructor(IERC20 token, address beneficiary, uint256 releaseDate) public {
    _token = token;
    _beneficiary = beneficiary;
    _deliveryTime = now;
    _lockTime = releaseDate.sub(now); // Will fail if releaseDate is in the past
  }

  modifier onlyOwnerOrBeneficiary {
    require(msg.sender == _beneficiary || msg.sender == owner(), "You must be the owner or beneficiary");
    _;
  }

  /**
   * @return the token being held.
   */
  function token() public view returns (IERC20) {
      return _token;
  }

  /**
   * @return the beneficiary of the tokens.
   */
  function beneficiary() public view returns (address) {
      return _beneficiary;
  }

  /**
   * @return the time when the tokens were assigned
   */
  function deliveryTime() public view returns (uint256) {
      return _deliveryTime;
  }

  /**
   * @return the time when the tokens are released.
   */
  function lockTime() public view returns (uint256) {
      return _lockTime;
  }

  function lockedAmount() public view returns (uint256) {
    return _lockedAmount;
  }

  function withdrawnAmount() public view returns (uint256) {
    return _withdrawnAmount;
  }

  function setLockedBalance() public onlyOwner returns (bool) {
    uint256 balance =  _token.balanceOf(address(this));
    require(balance > 0);
    require(_lockedAmount == 0);
    emit LogBalanceLocked(msg.sender, balance);
    _lockedAmount = balance;

  }

  function unlock(uint256 withdrawAmount) public onlyOwnerOrBeneficiary returns (uint256) {
      uint256 currentLockedBalance = _token.balanceOf(address(this));
      require(withdrawAmount <= currentLockedBalance,
        "GeoTokenLock: You are trying to withdraw more tokens than what is locked in the contract");
      require(currentLockedBalance > 0, "GeoTokenLock: no tokens to release");

      uint256 assignedAmount = _lockedAmount;
      require(assignedAmount > 0, "GeoTokenLock: no tokens locked yet");

      uint256 elapsedTime = now.sub(_deliveryTime);
      uint256 lockedTime = _lockTime;

      uint256 allowancePercentage = elapsedTime > lockedTime ? 100 : (elapsedTime.mul(100)).div(lockedTime); // 0 - 100

      uint256 withdrawnBalance = _withdrawnAmount;
      uint256 usedAllowancePercentage = withdrawnBalance >= assignedAmount ? 100 : (withdrawnBalance.mul(100)).div(assignedAmount);

      require(usedAllowancePercentage <= allowancePercentage,
        "GeoTokenLock: You are trying to unlock more funds than what you are allowed right now");

      _withdrawnAmount = _withdrawnAmount.add(withdrawAmount);

      emit LogBalanceUnlocked(msg.sender, withdrawAmount);
      _token.safeTransfer(_beneficiary, withdrawAmount);
  }

  function totalSupply() external view returns (uint256) {
    return 0;
  }

  function balanceOf(address account) external view returns (uint256) {
    return account == _beneficiary ? _lockedAmount : 0;
  }

  function transfer(address recipient, uint256 amount) external returns (bool) {
    revert("This contract does not allow transfer(). Use unlock() to use your available funds");
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return 0;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    revert("This contract does not allow approve(). Use unlock() to use your available funds");
  }

  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
    revert("This contract does not allow transferFrom(). Use unlock() to use your available funds");
  }

}
