pragma solidity >= 0.5.0 <6.0.0;

// import "./GeoToken.sol";
import "../externals/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract GeoTokenLock is IERC20, Ownable{
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  uint256 public constant UINT256_MAX = ~uint256(0); // Max value for uint256
  uint256 public constant oneDayInSeconds = 1 days; // seconds within 1 day

  uint32 constant public decimals = 18; // decimals for the lock contract, should be the same as GEO
  string constant public name = "Locked Geo Tokens"; // Indication that this contract is a lock
  string public symbol = "GEO"; // Should be the same as GEO

  IERC20 private _token; // ERC20 basic token contract being held

  address private _beneficiary; // beneficiary of tokens after they are released

  uint256 private _deliveryTime; // time when this contract was instantiated
  uint256 private _lockTime; // lock duration


  uint256 private _lockedAmount; // amount of tokens that are going to be locked
  uint256 private _withdrawnAmount; // amount of tokens that have been withdrawn


  event LogBalanceLocked(
    address indexed sender,
    uint256 lockedAmount
  );

  event LogBalanceUnlocked(
    address indexed sender,
    uint256 unlockedAmount
  );

  event LogClaimBack(
    address indexed sender,
    uint256 balance
  );

  /*
    Note that the period of lock time must be specified in DAYS
  */
  constructor(IERC20 token, address beneficiary, uint256 lockTimeInDays) public {
    _token = token;
    _beneficiary = beneficiary;
    _deliveryTime = now;
    _lockTime = lockTimeInDays.mul(oneDayInSeconds);
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

  function lockBalance() public onlyOwner returns (bool) {
    uint256 balance =  _token.balanceOf(address(this));
    require(balance > 0, "Not enough balance locked"); // require(balance > _lockTime) ? para evitar bloqueo de fondos
    require(_lockedAmount == 0, "Lock has been set already");
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

      uint256 allowance = computeAllowance();

      uint256 withdrawnBalance = _withdrawnAmount.add(withdrawAmount);
      uint256 usedAllowance = withdrawnBalance >= assignedAmount ? UINT256_MAX : withdrawnBalance;

      require(usedAllowance <= allowance && allowance > 0,
        "GeoTokenLock: You are trying to unlock more funds than what you are allowed right now");

      _withdrawnAmount = withdrawnBalance;

      emit LogBalanceUnlocked(msg.sender, withdrawAmount);
      _token.safeTransfer(_beneficiary, withdrawAmount);
  }

  function claimBack() public onlyOwner {
    require(_lockedAmount == 0, "Balance was already locked");
    uint256 balance = _token.balanceOf(address(this));
    require(balance > 0, "GeoTokenLock: This contract has no funds");
    emit LogClaimBack(msg.sender, balance);
    _token.safeTransfer(msg.sender, balance);
  }

  function getElapsedTime() public view returns (uint256) {
    return now.sub(_deliveryTime);
  }

  function computeAllowance() public view returns (uint256) {
    uint256 elapsedTime = getElapsedTime();
    uint256 lockedTime = _lockTime;

    return elapsedTime > lockedTime ? UINT256_MAX : (_lockedAmount.mul(elapsedTime)).div(lockedTime);
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
