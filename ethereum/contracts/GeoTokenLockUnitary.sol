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

  IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24); // See EIP1820
  bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender"); // See EIP777
  bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient"); // See EIP777

  IERC777 public token; // ERC777 basic token contract being held

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

  /**
   * @dev note that the duration must be specified in DAYS. This will be translated to EVM timestamp (Unix timestamp)
   * in seconds.
   *
   * @param _token IERC777 address of the ERC777 contract
   */
  constructor(IERC777 _token) public {
    token = _token;
    // Register as a token receiver
    _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    // Register as a token sender
    _erc1820.setInterfaceImplementer(address(this), TOKENS_SENDER_INTERFACE_HASH, address(this));
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
      bytes calldata /*userData*/,
      bytes calldata /*operatorData*/
  ) external whenNotPaused {

    require(msg.sender == address(token), "Can only be called by the GeoDB GeoTokens contract");
    emit LogTokensSent(operator, from, to, amount);
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
      address /*to*/,
      uint256 amount,
      bytes calldata /*userData*/,
      bytes calldata /*operatorData*/
  ) external whenNotPaused {

    require(msg.sender == address(token), "Can only receive GeoDB GeoTokens");
    emit LogTokensReceived(operator, from, amount);
  }
}
