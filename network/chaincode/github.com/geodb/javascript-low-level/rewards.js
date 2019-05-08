/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

"use strict";
const shim = require("fabric-shim");
const util = require("util");
const Members = require("./schemas/member");

let Validator = require("jsonschema").Validator;

const walletAddress = "0xDCF7bAECE1802D21a8226C013f7be99dB5941bEa";

let Chaincode = class {
  // Stub interface => Init()
  async Init(stub) {
    console.info("=========== Instantiated fabcar chaincode ===========");
    try {
      const cid = new shim.ClientIdentity(stub);
      const mspId = cid.mspId;

      const members = [
        {
          mspId,
          status: Members.STATUS_VALID,
          walletAddress
        }
      ];
      // Add GEODB as first member of the federation
      await stub.putState("MEMBERS", Buffer.from(JSON.stringify(members)));

      // Smart contract address
      await stub.putState(
        "GEODB_SC_ADDRESS",
        Buffer.from("0xE745897C64c8DA0A15E11B000834F570eC7eA7Ad")
      );
    } catch (e) {
      console.error(e);
    }
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
      return shim.success(Buffer.from(payload));
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  /* TODO: federation members live update */

  // async requestFederationJoin(stub, args) {
  //   if (args.length != 1) {
  //     throw new Error("Incorrect number of arguments. Expecting 1");
  //   }
  //
  //   const walletAddress = args[0];
  //   const cid = new shim.ClientIdentity(stub);
  //   const mspId = cid.mspId;
  //
  //   let members = JSON.parse(await stub.getState("MEMBERS"));
  //
  //   for (let i = 0; i < members.length; i++) {
  //     if (
  //       mspId === members[i].mspId ||
  //       walletAddress === members[i].walletAddress
  //     )
  //       throw new Error(
  //         `Member has already applied to join the federation. Current status: ${
  //           members[i].status
  //         }`
  //       );
  //   }
  //
  //   members.push({
  //     mspId,
  //     walletAddress,
  //     status: Members.APPROVING
  //   });
  //
  //   await stub.putState("MEMBERS", Buffer.from(JSON.stringify(members)));
  // }

  // async queryAvailableFunctions(stub, args) {
  //   console.info(this);
  //   const result = Object.keys(this).filter(
  //     key => typeof this[key] === "function"
  //   );
  //
  //   return JSON.stringify(result);
  // }

  async addClaimableBalanceToAddress(stub, args) {
    console.info("======== START : addClaimableBalanceToAddress ========");

    if (args.length != 2) {
      throw new Error("Incorrect number of arguments. Expecting 2");
    }

    const cid = new shim.ClientIdentity(stub);
    const mspId = cid.mspId;

    const members = JSON.parse(Buffer.from(await stub.getState("MEMBERS")));
    let member = null;

    for (let i = 0; i < members.length; i++) {
      if (
        members[i].mspId === mspId &&
        members[i].status === Members.STATUS_VALID
      ) {
        member = members[i];
        break;
      }
    }

    if (member === null) throw new Error("Unauthorized operation");

    const ethAddress = args[0];
    const amount = args[1];

    let claimableBalances = JSON.parse(
      Buffer.from(await stub.getState(ethAddress))
    );
    claimableBalances.push({ amount, mspId, timestamp: Date.now() });

    await stub.putState(
      ethAddress,
      Buffer.from(JSON.stringify(claimableBalances))
    );
    console.info("======== END : addClaimableBalanceToAddress ========");
  }

  async getClaimableBalance(stub, args) {
    console.info("======== START : getClaimableBalance ========");

    if (args.length != 1)
      throw new Error("Incorrect number of arguments. Expecting 1");

    const ethAddress = args[0];

    return JSON.stringify(await stub.getState(ethAddress));
    console.info("======== END : getClaimableBalance ========");
  }

  async claimBalance(stub, args) {}

  async transferClaimableBalance(stub, args) {}

  async querySmartContractAddress(stub, args) {
    return await stub.getState("GEODB_SC_ADDRESS");
  }

  async queryFederationMembers(stub, args) {
    return JSON.stringify(await stub.getState("MEMBERS"));
    // const startKey = "MEMBER0";
    // const endKey = "MEMBER9999";
    //
    // const iterator = await stub.getStateByRange(startKey, endKey);
    //
    // const allResults = [];
    // while (true) {
    //   const res = await iterator.next();
    //
    //   if (res.value && res.value.value.toString()) {
    //     console.log(res.value.value.toString("utf8"));
    //
    //     const Key = res.value.key;
    //     let Record;
    //     try {
    //       Record = JSON.parse(res.value.value.toString("utf8"));
    //     } catch (err) {
    //       console.log(err);
    //       Record = res.value.value.toString("utf8");
    //     }
    //     allResults.push({ Key, Record });
    //   }
    //   if (res.done) {
    //     console.log("end of data");
    //     await iterator.close();
    //     console.info(allResults);
    //     return JSON.stringify(allResults);
    //   }
    // }
  }
};

shim.start(new Chaincode());
