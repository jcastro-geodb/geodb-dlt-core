const advanceTime = async (delta, web3) => {
  await web3.currentProvider.send(
    { jsonrpc: "2.0", method: "evm_increaseTime", params: [delta], id: 123 },
    (err, result) => {
      if (err) {
        console.error(err);
        return;
      }
    }
  );
};

module.exports = { advanceTime };
