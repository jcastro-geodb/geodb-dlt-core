pragma solidity >= 0.5.0 <6.0.0;

// import "./GeoToken.sol";
import "../externals/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";
import "./utils/Pausable.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC777/IERC777Recipient.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC777/IERC777Sender.sol";
import "../externals/openzeppelin-solidity/contracts/introspection/IERC1820Registry.sol";

/**
 * @dev Contract to hold and release in steps the funds of GEO for the presale investors. ERC777 Implementation
 *
 * This contract will be passed a BENEFICIARY (ADDRESS) and a lock DURATION IN DAYS. The constructor will compute
 * the timestamp at which the funds should be released. Then the beneficiary or the owner can call the unlock function
 * to release an amount of tokens proportional to the time that has passed since the lock, eg: if a lock of 180 days
 * has been passed to the constructor, and 10 (10e18) tokens have been assigned, then the user will be able to
 * withdraw 5 (5e18) tokens approximately. It is important that the amount of tokens being held is divisible by
 * the duration of the lock in seconds, otherwise the amount will be fully locked until the complete time has passed,
 * missing the stepped release (ie, if lock duration is 180 days = 15 552 000 seconds, and less than 15 552 000 tokens
 * are locked, then the division yields 0 tokens per step, and won't be able to unlock the tokens until 15 552 000
 * seconds have passed).
 *
 * The contract takes advantage of the ERC777 specification in a way that it is not possible to lose tokens.
 * Sending tokens to the contract will update the locked amount for the beneficiary to withdraw, but it will not
 * update the timestamp for the full unlock.
 */
contract GeoTokenLock is Pausable, IERC777Recipient, IERC777Sender {
  using SafeMath for uint256;

  IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24); // See EIP1820
  bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender"); // See EIP777
  bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient"); // See EIP777

  IERC777 private _token; // ERC777 basic token contract being held

  address private _beneficiary; // beneficiary of tokens after they are released

  uint256 private _lockTimestamp; // timestamp of the moment the contract is instantiated
  uint256 private _unlockTimestamp; // timestamp of the moment when the funds are fully available

  uint256 private _lockedAmount; // amount of tokens that are going to be locked
  uint256 private _withdrawnAmount; // amount of tokens that have been withdrawn

  event LogTokensReceived(
    address indexed operator,
    address indexed from,
    uint256 amount
  );

  event LogTokensSent(
    address indexed operator,
    address indexed from,
    uint256 amount
  );

  /**
   * @dev note that the duration must be specified in DAYS. This will be translated to EVM timestamp (Unix timestamp)
   * in seconds.
   *
   * @param token IERC777 address of the ERC777 contract
   * @param beneficiary address address of the beneficiary of the contract
   * @param lockTimeInDays uint256 specifies the period of time from now that the funds will be locked for the user
   */
  constructor(IERC777 token, address beneficiary, uint256 lockTimeInDays) public {
    _token = token;
    _beneficiary = beneficiary;
    _lockTimestamp = now;
    _unlockTimestamp = now.add(lockTimeInDays.mul(1 days));

    // Register as a token receiver
    _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    // Register as a token sender
    _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
  }


  modifier onlyOwnerOrBeneficiary {
    require(msg.sender == _beneficiary || msg.sender == owner(), "GeoTokenLock: You must be the owner or beneficiary");
    _;
  }


  /**
   * @dev ERC777 Hook. It will be called when this contract sends tokens to any address.
   * This function will update the withdrawn amount by the beneficiary, keeping the internal balance record so that
   * no more than the allowed amount for the time passed is withdrawn.
   * Flow should be: this.unlock() calls => token.send() calls => token.tokensToSend(this) calls => this.tokensToSend()
   */
  function tokensToSend(
      address operator,
      address from,
      address to,
      uint256 amount,
      bytes calldata userData,
      bytes calldata operatorData
  ) external whenNotPaused {

    require(to == _beneficiary);
    uint256 allowance = computeAllowance();
    uint256 usedAllowance = _withdrawnAmount.add(amount);
    require(
      usedAllowance <= allowance,
      "GeoTokenLock: You are trying to unlock more funds than what you are allowed right now"
    );
    _withdrawnAmount = usedAllowance;

    emit LogTokensSent(operator, from, amount);
  }

  /**
   * @dev ERC777 Hook. It will be called when this contract receives tokens.
   * This function will update and increase the locked amount for the beneficiary, but it will not
   * update the lock's timestamp for the funds to be released.
   * Flow should be: token.send() calls => token.tokensReceived(this) calls => this.tokensReceived()
   */
  function tokensReceived(
      address operator,
      address from,
      address to,
      uint256 amount,
      bytes calldata userData,
      bytes calldata operatorData
  ) external whenNotPaused {

    require(msg.sender == address(_token), "Can only receive GeoDB GeoTokens");
    _lockedAmount = _lockedAmount.add(amount);
    emit LogTokensReceived(operator, from, amount);

  }

  /**
   * @dev Unlock function. Will unlock the requested amount (if allowed).
   *
   * @param withdrawAmount the amount to unlock
   */
  function unlock(uint256 withdrawAmount) public onlyOwnerOrBeneficiary whenNotPaused returns (bool) {
      _token.send(_beneficiary, withdrawAmount, "");
      return true;
  }

  /**
   * @return the token being held.
   */
  function token() public view returns (IERC777) {
      return _token;
  }

  /**
   * @return the beneficiary of the tokens.
   */
  function beneficiary() public view returns (address) {
      return _beneficiary;
  }

  /**
   * @return the moment this contract was instantiated
   */
  function lockTimestamp() public view returns (uint256) {
    return _lockTimestamp;
  }

  /**
   * @return the moment this contract will allow full access to the funds
   */
  function unlockTimestamp() public view returns (uint256) {
    return _unlockTimestamp;
  }

  /**
   * @return how many tokens have been locked in the contract. Not current amount, but sum of all historic locked funds.
   */
  function lockedAmount() public view returns (uint256) {
    return _lockedAmount;
  }

  /**
   * @return how many tokens have been locked in the contract. Not current amount, but sum of all historic locked funds.
   */
  function withdrawnAmount() public view returns (uint256) {
    return _withdrawnAmount;
  }

  /**
   * @return how many tokens have been locked in the contract. Not current amount, but sum of all historic locked funds.
   */
  function computeAllowance() public view returns (uint256) {

    uint256 mLockTimestamp = _lockTimestamp;
    uint256 mUnlockTimestamp = _unlockTimestamp;
    uint256 mLockedAmount = _lockedAmount;

    return now >= mUnlockTimestamp ? mLockedAmount : // If lock time has passed, allow to retrieve all funds
      // else, compute the allowance as allowancePerBlock * numberOfBlocks
      now.sub(mLockTimestamp) // Elapsed seconds since contract creation
      .mul(
        _lockedAmount.div(mUnlockTimestamp.sub(mLockTimestamp)) // Allowance per block
      );
  }
}
