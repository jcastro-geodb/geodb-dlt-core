/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

"use strict";
const shim = require("fabric-shim");
const Web3 = require('web3');
const EthereumTx = require("ethereumjs-tx");
var web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/f13168791f5d499c814256cd755ca982"));
const contract = require("./contract")();

let Chaincode = class {
  // Stub interface => Init()
  async Init(stub) {
    console.info("=========== Instantiated chaincode ===========");
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

  async account_balance(stub, args){
    contract.methods.balanceOf("0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55").call((err, result) => {
      console.log(result);
      return "OK";
    });
  }

  bin2String(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
      result += String.fromCharCode(parseInt(array[i], 2));
    }
    return result;
  }

  async send(stub, args){
    let channelName = "privatenode1";
    let responseKey = await stub.invokeChaincode('privatenode1', ["getNodePrivateKey"], channelName);
    console.log("responseKey BEFOREEEEEEEEEE")
    console.log(responseKey.payload)
    console.log("responseKey AFTEEEEEEEEEEER")
    console.log(this.bin2String(responseKey))
    console.log("BYTE1 BEFOREEEEEEEEEE")
    console.log(this.bin2String(responseKey.payload))
    console.log("BYTE2 BEFOREEEEEEEEEE")
    /*const PRIVATE_KEY = Buffer.from(PRIVATE_KEY,'hex')
    web3.eth.getTransactionCount("0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55", (err, txCount) => {
      const trxObject =
      {
        nonce: web3.utils.toHex(txCount),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        gasLimit: web3.utils.toHex(210000),
        from: "0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55",
        to: "0xd938458b43ebe82cA43676B1d38f9ac0f04592F9",
        data: contract.methods.transfer("0x7D039295C40a9518E59d48321670055224077cE3", 1).encodeABI()
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
    });*/
  }
};

shim.start(new Chaincode());
