pragma solidity ^0.5.0;

import "./utils/Pausable.sol";
import "./interfaces/IGeoToken.sol";
import "@openzeppelin/contracts/access/roles/MinterRole.sol";

contract BatchMint is Pausable, MinterRole {

    IGeoToken public tokenAddress;

    constructor(address _tokenAddress) public {
        tokenAddress = IGeoToken(_tokenAddress);
    }

    mapping(address => uint) rewards;

    function batchMint(address[] memory recipients, uint[] memory amounts)
        public onlyMinter
        returns (bool) {
        require(recipients.length > 0 && recipients.length == amounts.length, "recipients and amounts length mismatch");
        for(uint i = 0; i < recipients.length; i = i + 1) {
            require(recipients[i] != address(0), "Cannot mint to the 0x0 address");
            require(amounts[i] > 0, "Cannot mint a 0 amount");
            tokenAddress.releaseReward(recipients[i], amounts[i]);
        }


        return true;
    }

    function singleMint(address to, uint amount) public onlyMinter returns (bool) {
        return tokenAddress.releaseReward(to, amount);
    }

}
