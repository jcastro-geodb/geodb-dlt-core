package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"crypto/sha256"

	"github.com/hyperledger/fabric/common/util"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/core/chaincode/shim/ext/cid"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// SimpleChaincode example simple Chaincode implementation
type Chaincode struct {
}

type Members struct {
	MspId         string `json:"mspId"`
	Status        string `json:"status"`
	WalletAddress string `json:"walletAddress"`
}

type EthereumAddress struct {
	Amount    string `json:"amount"`
	MspId     string `json:"mspId"`
	Timestamp int64  `json:"timestamp"`
}

type Delegated struct {
	Delegado    string        `json:"delegado"`
	Recompensas []Recompensas `json:"recompensas"`
}

type Recompensas struct {
	EthAddr  string `json:"eth_addr"`
	Cantidad int    `json:"cantidad"`
}

type UserData struct {
	EthAddr   string `json:"eth_addr"`
	Lat       string `json:"lat"`
	Long      string `json:"long"`
	Timestamp string `json:"timestamp"`
}

const WALLETADDRESS = "0xDCF7bAECE1802D21a8226C013f7be99dB5941bEa"

func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("=========== Instantiated chaincode ===========")

	mspId, err := cid.GetMSPID(stub)
	if err != nil {
		fmt.Println("Error getting the mspId")
	}
	members := []Members{
		Members{
			mspId,
			"STATUS_VALID",
			WALLETADDRESS,
		},
	}

	membersBytes, _ := json.Marshal(members)

	// Write the state to the ledger
	err = stub.PutState("MEMBERS", membersBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState("GEODB_TOKEN_ADDRESS", []byte("TOKEN"))
	if err != nil {
		return shim.Error(err.Error())
	}

	stub.PutState("numberPut", []byte(strconv.Itoa(0)))

	return shim.Success(nil)
}

func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	if function == "requestFederationJoin" {
		return t.requestFederationJoin(stub, args)
	} else if function == "queryAvailableFunctions" {
		return t.queryAvailableFunctions(stub, args)
	} else if function == "addClaimableBalanceToAddress" {
		return t.addClaimableBalanceToAddress(stub, args)
	} else if function == "getClaimableBalance" {
		return t.getClaimableBalance(stub, args)
	} else if function == "claimBalance" {
		return t.claimBalance(stub, args)
	} else if function == "transferClaimableBalance" {
		return t.transferClaimableBalance(stub, args)
	} else if function == "queryTokenAddress" {
		return t.queryTokenAddress(stub, args)
	} else if function == "getMSP" {
		return t.getMSP(stub, args)
	} else if function == "queryFederationMembers" {
		return t.queryFederationMembers(stub, args)
	} else if function == "putUserData" {
		return t.putUserData(stub, args)
	} else if function == "getUserData" {
		return t.getUserData(stub, args)
	} else if function == "getDelegatedBlock" {
		return t.getDelegatedBlock(stub, args)
	} else if function == "callSC" {
		return t.callSC(stub, args)
	}
	return shim.Error("Invalid invoke function name. Expecting \"invoke\" \"delete\" \"query\"")
}

func (t *Chaincode) requestFederationJoin(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	return shim.Success(nil)
}

func (t *Chaincode) queryAvailableFunctions(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	return shim.Success(nil)
}

func (t *Chaincode) addClaimableBalanceToAddress(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	mspId, err := cid.GetMSPID(stub)

	if err != nil {
		fmt.Println("Error getting the mspId")
	}

	members := []Members{}

	membersBytes, err := stub.GetState("MEMBERS")

	if err != nil {
		return shim.Error("Failed to get the members")
	}

	err = json.Unmarshal(membersBytes, &members)
	var member *Members

	for i := 0; i < len(members); i++ {
		if members[i].MspId == mspId && members[i].Status == "STATUS_VALID" {
			member = &members[i]
			break
		}
	}

	if member == nil {
		return shim.Error("Unautorized operation")
	}

	var ethAddress = args[0]
	var amount = args[1]

	claimableBalancesByte, err := stub.GetState(ethAddress)
	if err != nil {
		return shim.Error("Failed to get ethAddress")
	}

	ethereumAddresses := []EthereumAddress{}
	json.Unmarshal(claimableBalancesByte, &ethereumAddresses)

	now := time.Now()
	nanos := now.UnixNano()
	ethAddressModel := EthereumAddress{
		amount,
		mspId,
		nanos / 1000000,
	}
	ethereumAddresses = append(ethereumAddresses, ethAddressModel)

	ethereumAddressesByte, _ := json.Marshal(ethereumAddresses)

	stub.PutState(ethAddress, ethereumAddressesByte)

	fmt.Println("======== END : addClaimableBalanceToAddress ========")

	return shim.Success(nil)
}

func (t *Chaincode) getClaimableBalance(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	fmt.Println("======== START : getClaimableBalance ========")

	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting 1")
	}

	var ethAddress = args[0]
	var balance, _ = stub.GetState(ethAddress)
	fmt.Println("======== END : getClaimableBalance ========")

	return shim.Success(balance)

}

func (t *Chaincode) claimBalance(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	return shim.Success(nil)
}

func (t *Chaincode) transferClaimableBalance(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	return shim.Success(nil)
}

func (t *Chaincode) queryTokenAddress(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	geoDBToken, _ := stub.GetState("GEODB_TOKEN_ADDRESS")
	return shim.Success(geoDBToken)

}

func (t *Chaincode) getMSP(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	mspId, err := cid.GetMSPID(stub)
	if err != nil {
		fmt.Println("Error getting the mspId")
	}
	mspIdBytes, _ := json.Marshal(mspId)

	return shim.Success(mspIdBytes)

}

func (t *Chaincode) queryFederationMembers(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	return shim.Success(nil)
}

func (t *Chaincode) putUserData(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting 1")
	}
	userData := UserData{}
	json.Unmarshal([]byte(args[0]), &userData)

	dataBytes, _ := json.Marshal(userData)
	dataHash := sha256.Sum256(dataBytes)
	dataHashString := fmt.Sprintf("%x", dataHash)
	fmt.Println("Hash Address: ")
	fmt.Println(dataHashString)
	stub.PutState(dataHashString, dataBytes)

	var numberPutHashArr []byte
	numberPutHashBytes, _ := stub.GetState("numberPutHash")
	json.Unmarshal(numberPutHashBytes, &numberPutHashArr)
	numberPutHashArr = append(numberPutHashArr, dataHash[:]...)
	numberPutHashBytes, _ = json.Marshal(numberPutHashArr)
	stub.PutState("numberPutHash", numberPutHashBytes)

	var eth_addressesArr []string
	eth_addressesBytes, _ := stub.GetState("ethAddresses")
	json.Unmarshal(eth_addressesBytes, &eth_addressesArr)
	eth_addressesArr = append(eth_addressesArr, userData.EthAddr)
	eth_addressesBytes, _ = json.Marshal(eth_addressesArr)
	stub.PutState("ethAddresses", eth_addressesBytes)

	numberPut, _ := stub.GetState("numberPut")
	numberPutInt, _ := strconv.Atoi(string(numberPut))
	numberPutInt++
	numberPutStr := strconv.Itoa(numberPutInt)
	stub.PutState("numberPut", []byte(numberPutStr))

	if numberPutInt == 5 {
		mspId, _ := cid.GetMSPID(stub)
		var putHashArr []byte
		putHashBytes, _ := stub.GetState("numberPutHash")
		json.Unmarshal(putHashBytes, &putHashArr)
		dataHashes := sha256.Sum256(putHashArr)
		dataHashesString := fmt.Sprintf("%x", dataHashes)
		var recompensas []Recompensas
		var recompensa Recompensas
		for i := 0; i < 5; i++ {
			recompensa = Recompensas{
				eth_addressesArr[i],
				1,
			}
			recompensas = append(recompensas, recompensa)
		}
		delegated := Delegated{
			mspId,
			recompensas,
		}
		delegatedBytes, _ := json.Marshal(delegated)
		stub.PutState(dataHashesString, delegatedBytes)
		stub.PutState("ethAddresses", nil)
		stub.PutState("numberPutHash", nil)
		stub.PutState("numberPut", []byte(strconv.Itoa(0)))
		fmt.Println("Delegated Block HASH: ")
		fmt.Println(dataHashesString)
		return shim.Success(delegatedBytes)
	} else {
		fmt.Println(numberPutInt)
		return shim.Success(nil)
	}
}

func (t *Chaincode) getUserData(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting 1")
	}
	userData, _ := stub.GetState(args[0])
	return shim.Success(userData)
}

func (t *Chaincode) getDelegatedBlock(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting 1")
	}
	delegatedBlock, _ := stub.GetState(args[0])
	return shim.Success(delegatedBlock)
}

func (t *Chaincode) callSC(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	chainCodeArgs := util.ArrayToChaincodeArgs(args)
	response := stub.InvokeChaincode("geodbSmart", chainCodeArgs, "rewards")
	if response.Status != shim.OK {
		return shim.Error(response.Message)
	}
	return shim.Success(nil)
}

func main() {
	err := shim.Start(new(Chaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
