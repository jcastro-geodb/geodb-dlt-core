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

type RewardsBlock struct {
	DelegatePeer string    `json:"delegatePeer"`
	Rewards      []Rewards `json:"rewards"`
	Status       string    `json:"status"`
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
	var rewardsBlocks []RewardsBlock
	json.Unmarshal(responseBytes.GetPayload(), &rewardsBlocks)
	fmt.Println("rewardsBlocks BLOCKS")
	fmt.Println(rewardsBlocks)
	for i := 0; i < len(rewardsBlocks); i++ {
		//TODO: Call smart contract
		chName := "privatenode1"
		chainName := "web3Node"
		blockToSend, _ := json.Marshal(rewardsBlocks[i])
		chaincodeArgs = util.ToChaincodeArgs("mint", string(blockToSend))
		stub.InvokeChaincode(chainName, chaincodeArgs, chName)
		rewardsBlocks[i].Status = "emitted"
		chaincodeArgs = util.ToChaincodeArgs("putBlockData", string(blockToSend))
		stub.InvokeChaincode(chaincodeName, chaincodeArgs, channelName)
	}
	fmt.Println("----------------------------------- END GET ETHEREUM REWARDS -----------------------------------")
	return shim.Success(nil)
}

func main() {
	err := shim.Start(new(Chaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
