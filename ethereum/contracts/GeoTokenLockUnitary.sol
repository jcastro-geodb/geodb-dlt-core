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
contract GeoTokenLockUnitary is Pausable, IERC777Recipient, IERC777Sender {
  using SafeMath for uint256;

  struct Lock {
    uint256 balance;
    uint256 withdrawn;
    uint256 lockTimestamp;
    uint256 unlockTimestamp;
  }

  IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24); // See EIP1820
  bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender"); // See EIP777
  bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient"); // See EIP777

  IERC777 public token; // ERC777 basic token contract being held
  mapping(address => Lock) public locks;


  event LogTokensReceived(
    address indexed operator,
    address indexed from,
    uint256 amount
  );

  event LogTokensSent(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256 amount
  );

  event LogTokensLocked(
    address indexed to,
    uint256 amount,
    uint256 unlockTimestamp
  );

  /**
   * @dev note that the duration must be specified in DAYS. This will be translated to EVM timestamp (Unix timestamp)
   * in seconds.
   *
   * @param _token IERC777 address of the ERC777 contract
   */
  constructor(IERC777 _token) public {
    require(address(_token) != address(0), "Token address cannot be 0x0");
    token = _token;
    // Register as a token receiver
    _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    // Register as a token sender
    _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
  }

  /*
    @dev: This function is the default callback for the contract.

    We do not want to accept any ether.
  */
  function() external {
    revert();
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
      bytes calldata /*operatorData*/
  ) external whenNotPaused {
    require(msg.sender == address(token), "Can only be called by the GeoDB GeoTokens contract");
    require(from == address(this));

    emit LogTokensSent(operator, bytesToAddress(userData), to, amount);
  }

  /**
   * @dev ERC777 Hook. It will be called when this contract receives tokens.
   * This function will update and increase the owner's funds.
   * Flow should be: token.send() calls => token.tokensReceived(this) calls => this.tokensReceived()
   */
  function tokensReceived(
      address operator,
      address from,
      address /*to*/,
      uint256 amount,
      bytes calldata /*userData*/,
      bytes calldata /*operatorData*/
  ) external whenNotPaused {
    require(msg.sender == address(token), "Can only receive GeoDB GeoTokens");
    address owner = owner();
    locks[owner].balance = locks[owner].balance.add(amount);
    emit LogTokensReceived(operator, from, amount);
  }

  function lock(address beneficiary, uint256 amount, uint256 lockTimeInDays) public onlyOwner whenNotPaused returns (bool) {
    
    require(beneficiary != address(0), "Cannot lock amounts for the 0x0 address");
    require(beneficiary != owner(), "Cannot self-lock tokens");
    require(amount > 0, "The amount to lock must be greater than 0");
    require(lockTimeInDays > 0, "Lock time must be greater than 0");
    require(locks[beneficiary].balance == 0, "This address already has funds locked");

    locks[msg.sender].balance = locks[msg.sender].balance.sub(amount);
    locks[beneficiary].balance = amount;
    locks[beneficiary].lockTimestamp = now;
    uint256 unlockTimestamp = now.add(lockTimeInDays.mul(1 days));
    locks[beneficiary].unlockTimestamp = unlockTimestamp;
    emit LogTokensLocked(beneficiary, amount, unlockTimestamp);
    return true;
  }

  function batchLock(address[] memory beneficiaries, uint256 amount, uint256 lockTimeInDays) public onlyOwner whenNotPaused returns (bool) {
    require(beneficiaries.length > 0);
    uint8 i = 0;

    for(i; i < beneficiaries.length; i++) {
      lock(beneficiaries[i], amount, lockTimeInDays);
    }

    return true;
  }

  function send(address to, uint256 amount) public returns (bool) {
    require(amount <= computeAllowance(msg.sender));
    require(amount > 0);
    require(to != address(0));

    locks[msg.sender].withdrawn = locks[msg.sender].withdrawn.add(amount);
    token.send(to, amount, abi.encodePacked(msg.sender));
    return true;
  }

  function unlock() public returns (bool) {
    uint256 allowance = computeAllowance(msg.sender);
    require(allowance > 0, "No allowance on this contract");

    locks[msg.sender].withdrawn = locks[msg.sender].withdrawn.add(allowance);
    token.send(msg.sender, allowance, abi.encodePacked(msg.sender));
    return true;
  }

  function ownerUnlock(address beneficiary) public onlyOwner whenNotPaused returns (bool) {
    require(beneficiary != address(0), "Cannot unlock for the 0 address");
    uint256 allowance = computeAllowance(beneficiary);
    require(allowance > 0, "No allowance on this contract");

    locks[beneficiary].withdrawn = locks[beneficiary].withdrawn.add(allowance);
    token.send(beneficiary, allowance, abi.encodePacked(beneficiary));
    return true;
  }

  function batchOwnerUnLock(address[] memory beneficiaries) public onlyOwner whenNotPaused returns (bool) {
    require(beneficiaries.length > 0);
    uint8 i = 0;

    for(i; i < beneficiaries.length; i++) {
      ownerUnlock(beneficiaries[i]);
    }

    return true;
  }

  /**
   * @dev computes the total amount of tokens that could be retrieved at this point in time.
   * @return uint256 the total amount of tokens that the sender is entitled to at this point in time.
   */
  function computeAllowance(address from) public view returns (uint256) {

    uint256 lockTimestamp = locks[from].lockTimestamp;
    uint256 unlockTimestamp = locks[from].unlockTimestamp;
    uint256 lockedAmount = locks[from].unlockTimestamp;

    uint256 totalAllowance = now >= unlockTimestamp ? lockedAmount : // If lock time has passed, allow to retrieve all funds
      // else, compute the proportional allowance
      now.sub(lockTimestamp) // Elapsed seconds since contract creation
      .mul(
        lockedAmount.div(unlockTimestamp.sub(lockTimestamp)) // Allowance per block
      );

    return totalAllowance.sub(locks[from].withdrawn);
  }

  /**
   * @dev returns the balance that was originally locked - the total presale entitlement of the holder.
   * @return uint256 field balance of mapping
   */
  function balanceOf(address addr) public view returns (uint256) {
    return locks[addr].balance;
  }

  function bytesToAddress(bytes memory bys) private pure returns (address addr) {
    require(bys.length == 20);
    assembly {
      addr := mload(add(bys,20))
    }
  }




}
