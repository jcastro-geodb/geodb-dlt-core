/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

"use strict";
const shim = require("fabric-shim");
const Web3 = require('web3');


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

  async callSmartContract(stub, args){
    console.log("INSIDE CALL SMART CONTRACT");
    const abiArray = [{"constant":true,"inputs":[],"name":"add_1","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"pure","type":"function"}]
    const contractAddress = "0x6073DB8506e74cD2862AB88b74831b0C103C93d2"
    var web3js = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io"));
    var contract = new web3js.eth.Contract(abiArray,contractAddress);
    contract.methods.add_1().call((err, result) => {
        console.log(result);
        return "OK";
    });
  }

};

shim.start(new Chaincode());
