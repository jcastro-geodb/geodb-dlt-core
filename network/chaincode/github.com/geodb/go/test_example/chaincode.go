package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/lib/cid"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// Simple Chaincode implementation
type Chaincode struct {
}

func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("=========== Instantiated chaincode ===========")
	return shim.Success(nil)
}

func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	fmt.Printf("Invoke function: %s\n", function)
	fmt.Printf("\targs: %s\n", args)

	if function == "carInsert" {
		return t.carInsert(stub, args)
	}
	return shim.Error("Invalid invoke function name. Expecting \"invoke\" \"delete\" \"query\"")
}

// Admin user insert a car in the blockchain
func (t *Chaincode) carInsert(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Check if admin is calling the method
	if !t.checkCertificateName(stub, "admin") {
		return shim.Error("You don't have permissions")
	}

	// Arguments validation
	if len(args) != 2 {
		return shim.Error("Incorrent arguments. Expecting application and acquirer")
	}

	key := args[0]
	value := args[1]

	err := stub.PutState(key, []byte(value))
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(nil)
}

// Check certificate name
func (t *Chaincode) checkCertificateName(stub shim.ChaincodeStubInterface, name string) bool {
	certificate, _ := cid.GetX509Certificate(stub)

	if certificate.Subject.CommonName == name {
		return true
	}
	return false
}

func main() {
	err := shim.Start(new(Chaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
