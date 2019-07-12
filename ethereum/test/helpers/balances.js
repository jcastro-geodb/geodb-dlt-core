const { BN } = require("openzeppelin-test-helpers");

/*
  address: the address of the user that we want to check the balance of
  contract: ERC20 / ERC777 contract instance
  options: {from, to} can assign the period. Default: from current block to previous block
*/
const fungibleTokenBalanceDelta = (address, contract, options) => {
  return new Promise((resolve, reject) => {
    web3.eth
      .getBlockNumber()
      .then(currentBlock => {
        const fromBlockNumber = options && options.from ? options.from : currentBlock - 1;
        const toBlockNumber = options && options.to ? options.to : currentBlock;

        return Promise.all([
          contract.contract.methods.balanceOf(address).call(null, fromBlockNumber),
          contract.contract.methods.balanceOf(address).call(null, toBlockNumber)
        ]);
      })
      .then(result => {
        const oldBalance = new BN(result[0]);
        const newBalance = new BN(result[1]);

        resolve(newBalance.sub(oldBalance));
      })
      .catch(err => {
        reject(err);
      });
  });
};

module.exports = { erc20BalanceDelta: fungibleTokenBalanceDelta, erc777BalanceDelta: fungibleTokenBalanceDelta };
