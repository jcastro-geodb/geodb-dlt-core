package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type NodeKeys struct {
	PublicKey  string `json:"publicKey"`
	PrivateKey string `json:"privateKey"`
}

// SimpleChaincode example simple Chaincode implementation
type Chaincode struct {
}

func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("=========== Instantiated chaincode ===========")

	publicKey := "0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55"
	privateKey := ""
	nodeKeys := NodeKeys{
		publicKey,
		privateKey,
	}

	nodeBytes, _ := json.Marshal(nodeKeys)
	// Write the state to the ledger
	err := stub.PutState("nodeKeys", nodeBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(nil)
}

func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	if function == "getNodePrivateKey" {
		return t.getNodePrivateKey(stub, args)
	}
	return shim.Error("Invalid invoke function name. Expecting \"invoke\" \"delete\" \"query\"")
}

func (t *Chaincode) getNodePrivateKey(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var nodeKeys NodeKeys
	nodeBytes, _ := stub.GetState("nodeKeys")
	json.Unmarshal(nodeBytes, &nodeKeys)
	fmt.Println(nodeKeys.PrivateKey)
	node := []byte(nodeKeys.PrivateKey)
	fmt.Println(node)
	return shim.Success([]byte(nodeKeys.PrivateKey))
}

func main() {
	err := shim.Start(new(Chaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
