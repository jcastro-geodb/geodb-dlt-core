pragma solidity >= 0.5.0 <6.0.0;

// import "./GeoToken.sol";
import "../externals/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC777/IERC777.sol";
import "../externals/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../externals/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC777/IERC777Recipient.sol";
import "../externals/openzeppelin-solidity/contracts/token/ERC777/IERC777Sender.sol";
import "../externals/openzeppelin-solidity/contracts/introspection/IERC1820Registry.sol";

contract GeoTokenLock777 is Ownable, Pausable, IERC777Recipient, IERC777Sender {
  using SafeMath for uint256;

  IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
  bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
  bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

  uint256 public constant UINT256_MAX = ~uint256(0); // Max value for uint256
  uint256 public constant blocksPerDay = 5760;

  IERC777 private _token; // ERC20 basic token contract being held

  address private _beneficiary; // beneficiary of tokens after they are released

  uint256 private _lockBlock; // Block when this contract was instantiated
  uint256 private _unlockBlock; // Block when the full funds of the contract will be unlocked

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

  /*
    Note that the period of lock time must be specified in DAYS
  */
  constructor(IERC777 token, address beneficiary, uint256 lockTimeInDays) public {
    _token = token;
    _beneficiary = beneficiary;
    _lockBlock = block.number;
    _unlockBlock = block.number.add(blocksPerDay.mul(lockTimeInDays));

    // Register as a token receiver
    _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    // Register as a token sender
    _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
  }

  modifier onlyOwnerOrBeneficiary {
    require(msg.sender == _beneficiary || msg.sender == owner(), "GeoTokenLock: You must be the owner or beneficiary");
    _;
  }

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

  function tokensReceived(
      address operator,
      address from,
      address to,
      uint256 amount,
      bytes calldata userData,
      bytes calldata operatorData
  ) external whenNotPaused {

    _lockedAmount = _lockedAmount.add(amount);
    emit LogTokensReceived(operator, from, amount);

  }

  // function lockBalance() public onlyOwner returns (bool) {
  //   uint256 balance =  _token.balanceOf(address(this));
  //   require(balance > 0, "GeoTokenLock: Not enough balance locked"); // require(balance > _lockTime) ? para evitar bloqueo de fondos
  //   require(_lockedAmount == 0, "GeoTokenLock: Lock has been set already");
  //   emit LogBalanceLocked(msg.sender, balance);
  //   _lockedAmount = balance;
  // }

  function unlock(uint256 withdrawAmount) public onlyOwnerOrBeneficiary whenNotPaused returns (uint256) {
      _token.send(_beneficiary, withdrawAmount, "");
  }

  // function claimBack() public onlyOwner {
  //   require(_lockedAmount == 0, "GeoTokenLock: Balance was already locked");
  //   uint256 balance = _token.balanceOf(address(this));
  //   require(balance > 0, "GeoTokenLock: This contract has no funds");
  //   emit LogClaimBack(msg.sender, balance);
  //   // _token.safeTransfer(msg.sender, balance);
  // }

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
   * @return the time when the tokens are released.
   */
  function lockBlock() public view returns (uint256) {
      return _lockBlock;
  }

  function unlockBlock() public view returns (uint256) {
    return _unlockBlock;
  }

  function lockedAmount() public view returns (uint256) {
    return _lockedAmount;
  }

  function withdrawnAmount() public view returns (uint256) {
    return _withdrawnAmount;
  }

  function computeAllowance() public view returns (uint256) {
    uint256 mUnlockBlock = _unlockBlock;
    uint256 mLockBlock = _lockBlock;
    return block.number >= mUnlockBlock ? UINT256_MAX : // If lock time has passed, allow to retrieve all funds
      // else, compute the allowance as allowancePerBlock * numberOfBlocks
      block.number.sub(mLockBlock) // Number of blocks since contract creation
      .mul(
        _lockedAmount.div(mUnlockBlock.sub(mLockBlock)) // Allowance per block
      );
  }
}
