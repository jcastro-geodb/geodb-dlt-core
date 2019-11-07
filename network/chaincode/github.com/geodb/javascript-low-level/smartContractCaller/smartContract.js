/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

"use strict";
const shim = require("fabric-shim");
const Web3 = require('web3');
const util = require('util');
const EthereumTx = require("ethereumjs-tx");
var web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/00cfc467ae9e4aa885024e0302a58a0c"));
const contract = require("./contractInfo")();

let Chaincode = class {
  // Stub interface => Init()
  async Init(stub) {
    console.info("=========== Instantiated chaincode ===========");
    let nodeKeys = {
      publicKey: "0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55",
      privateKey: "",
    };
    await stub.putState("nodeKeys",Buffer.from(JSON.stringify(nodeKeys)))
    return shim.success();
  }

  // Stub interface => Invoke()
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];

    if (!method) {
      console.error("no function of name:" + ret.fcn + " found");
      throw new Error("Received unknown function " + ret.fcn + " invocation");
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }


  async mint(stub, args){
    console.log("----------------------------------------------INIT MINT--------------------------------------------");
    let nodeKeyBytes = await stub.getState("nodeKeys");
    if (!nodeKeyBytes || nodeKeyBytes.toString().length <= 0) {
      throw new Error("node keys doesn't exist: ");
    }
    var nodeKey = JSON.parse(nodeKeyBytes);
    const PRIVATE_KEY = Buffer.from(nodeKey.privateKey.toString(),'hex');
    var rewardsBlock = JSON.parse(args[0]);
    var recipents = [];
    var amounts = [];
    for (var i = 0; i < rewardsBlock.rewards.length; i++){
      recipents.push(rewardsBlock.rewards[i].eth_addr);
      amounts.push(rewardsBlock.rewards[i].amount);
    }

    web3.eth.getTransactionCount("0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55", (err, txCount) => {
      const trxObject =
      {
        nonce: web3.utils.toHex(txCount),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        gasLimit: web3.utils.toHex(210000),
        from: "0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55",
        to: "0xA0498F7BE41b6a258eCa49eE78474648A913FD40",
        data: contract.methods.batchMint(recipents, amounts).encodeABI()
      }

      var tx = new EthereumTx(trxObject);
      tx.sign(PRIVATE_KEY);

      const serializedTrx = tx.serialize();
      const raw = '0x' + serializedTrx.toString('hex');

      web3.eth.sendSignedTransaction(raw, (err, txHash) => {
      console.log(err);
      console.log("HASHHHHHHHHHH");
      console.log(txHash);
      });
    });
    console.log("----------------------------------------------END MINT--------------------------------------------");
  }
};

shim.start(new Chaincode());
