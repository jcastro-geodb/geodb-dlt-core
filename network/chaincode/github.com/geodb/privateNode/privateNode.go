package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric/common/util"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// SimpleChaincode example simple Chaincode implementation
type Chaincode struct {
}

type Delegated struct {
	Delegado string    `json:"delegado"`
	Rewards  []Rewards `json:"rewards"`
	Status   string    `json:"status"`
}

type Rewards struct {
	EthAddr string `json:"eth_addr"`
	Amount  int    `json:"amount"`
}

func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	if function == "getEthereumRewards" {
		return t.getEthereumRewards(stub, args)
	}
	return shim.Error("Invalid invoke function name. Expecting \"invoke\" \"delete\" \"query\"")
}

func (t *Chaincode) getEthereumRewards(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	fmt.Println("----------------------------------- INIT GET ETHEREUM REWARDS -----------------------------------")
	channelName := "rewards"
	chaincodeName := "geodb"
	chaincodeArgs := util.ToChaincodeArgs("getDelegatedBlockByStatus", "pending")
	var responseBytes = stub.InvokeChaincode(chaincodeName, chaincodeArgs, channelName)
	var delegated []Delegated
	json.Unmarshal(responseBytes.GetPayload(), &delegated)
	fmt.Println("DELEGATED BLOCKS")
	fmt.Println(delegated)
	for i := 0; i < len(delegated); i++ {
		//TODO: Call smart contract
		chName := "privatenode1"
		chainName := "web3Node"
		blockToSend, _ := json.Marshal(delegated[i])
		chaincodeArgs = util.ToChaincodeArgs("mint", string(blockToSend))
		stub.InvokeChaincode(chainName, chaincodeArgs, chName)
		delegated[i].Status = "emitted"
		chaincodeArgs = util.ToChaincodeArgs("putBlockData", string(blockToSend))
		stub.InvokeChaincode(chaincodeName, chaincodeArgs, channelName)
	}
	fmt.Println("----------------------------------- END GET ETHEREUM REWARDS -----------------------------------")
	return shim.Success(nil)
}

/*
  async mintFunction(stub, args){
    let nodeKeyBytes = await stub.getState("nodeKeys");
    if (!nodeKeyBytes || nodeKeyBytes.toString().length <= 0) {
      throw new Error("node keys doesn't exist: ");
    }
    const PRIVATE_KEY = Buffer.from(nodeKeyBytes.toString().privateKey,'hex')
    web3.eth.getTransactionCount("0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55", (err, txCount) => {
      const trxObject =
      {
        nonce: web3.utils.toHex(txCount),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        gasLimit: web3.utils.toHex(210000),
        from: "0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55",
        to: "0xd938458b43ebe82cA43676B1d38f9ac0f04592F9",
        data: contract.methods.releaseReward("0x7D039295C40a9518E59d48321670055224077cE3", 100000).encodeABI()
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
  }
  }
*/

func main() {
	err := shim.Start(new(Chaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
