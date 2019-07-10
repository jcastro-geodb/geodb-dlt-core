const GeoToken = artifacts.require("./GeoToken777.sol");
const { BN, expectEvent } = require("openzeppelin-test-helpers");
const { toWei } = require("web3-utils");
const { erc1820, geoconstants } = require("./helpers");

const { symbol, name } = geoconstants;

const preAssignedTokensInMillions = new BN("300");
const tokenDecimals = new BN("18");

contract("GeoToken", ([geodb, ...accounts]) => {
  let erc1820contractAddress, contract;

  const deployERC1820 = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "eth_sendRawTransaction", params: [erc1820.rawTx], id: 1 },
        (err, result) => {
          if (err) {
            console.error(err);
            reject(err);
          }

          if (result.error) {
            console.error(result.error);
            reject(result.error);
          }
          resolve(result);
        }
      );
    });
  };

  const getERC1820DeploymentReceipt = txHash => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txHash], id: 1 },
        (err, result) => {
          if (err) {
            console.error(err);
            reject(err);
          }

          if (result.error) {
            console.error(result.error);
            reject(result.error);
          }
          resolve(result);
        }
      );
    });
  };

  const setERC1820Address = result => {
    console.log("setERC1820Address()");
    console.log(result);
  };

  before("Fund ERC1820 account and deploy ERC1820 registry", async () => {
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: erc1820.deployAccount,
      value: toWei("0.08", "ether")
    });

    const { result: txHash } = await deployERC1820();
    const { result: receipt } = await getERC1820DeploymentReceipt(txHash);

    erc1820contractAddress = receipt.contractAddress;
    console.log(erc1820contractAddress);
  });

  beforeEach("Initialize contract and ERC1820 registry", async () => {
    // const erc1820txReceipt = await web3.currentProvider.send(
    //   { jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [erc1820txHash], id: 1 },
    //   (err, result) => {
    //     if (err) {
    //       console.error(err);
    //       return;
    //     }
    //   }
    // );

    // console.log(erc1820txReceipt);

    contract = await GeoToken.new(name, symbol, [], { from: geodb });
  });

  describe("The contract is initialized correctly", () => {
    it("contract owner is geodb", async () => {
      (await contract.owner()).should.be.equal(geodb);
    });

    it("team allocation is 300 millions tokens", async () => {
      const base = new BN("10");
      const exp = new BN("6");
      const millions = base.pow(exp);
      const decimals = base.pow(tokenDecimals);

      const preAssigned = preAssignedTokensInMillions.mul(millions).mul(decimals);

      (await contract.balanceOf(geodb)).should.be.bignumber.equal(preAssigned);
    });
  });

  // describe("The contract allows minting new tokens if called by owner", () => {
  //   const reward = new BN("10000");
  //
  //   it("allows minting tokens", async () => {
  //     const from = geodb;
  //     const to = accounts[0];
  //     const amount = new BN("10000");
  //
  //     const { logs } = await contract.releaseReward(to, amount, { from });
  //
  //     const event = expectEvent.inLogs(logs, "LogReward", {
  //       from,
  //       to,
  //       amount
  //     });
  //
  //     event.args.from.should.be.equal(from);
  //     event.args.to.should.be.equal(to);
  //     event.args.amount.should.be.bignumber.equal(amount);
  //   });
  // });
});
