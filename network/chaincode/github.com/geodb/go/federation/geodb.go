package main

import (
	"encoding/json"
	"fmt"
	"strconv"

	"crypto/sha256"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/core/chaincode/shim/ext/cid"
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

type UserData struct {
	EthAddr   string `json:"eth_addr"`
	Lat       string `json:"lat"`
	Long      string `json:"long"`
	Timestamp string `json:"timestamp"`
}

func (t *Chaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("=========== Instantiated chaincode ===========")
	return shim.Success(nil)
}

func (t *Chaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()

	if function == "putUserData" {
		return t.putUserData(stub, args)
	} else if function == "putBlockData" {
		return t.putBlockData(stub, args)
	} else if function == "getDelegatedBlockByStatus" {
		return t.getDelegatedBlockByStatus(stub, args)
	}

	return shim.Error("Invalid invoke function name. Expecting \"invoke\" \"delete\" \"query\"")
}

// Save all the userData and turns them into a block
func (t *Chaincode) putUserData(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting 1")
	}
	userData := UserData{}
	json.Unmarshal([]byte(args[0]), &userData)

	// Save user's data hash
	dataBytes, _ := json.Marshal(userData)
	dataHash := sha256.Sum256(dataBytes)
	dataHashString := fmt.Sprintf("%x", dataHash)
	stub.PutState(dataHashString, dataBytes)

	// Array with all data users hash
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
		var rewards []Rewards
		var reward Rewards
		for i := 0; i < 5; i++ {
			reward = Rewards{
				eth_addressesArr[i],
				1,
			}
			rewards = append(rewards, reward)
		}
		rewardsBlock := RewardsBlock{
			mspId,
			rewards,
			"pending",
		}
		rewardsBlockBytes, _ := json.Marshal(rewardsBlock)
		stub.PutState(dataHashesString, rewardsBlockBytes)
		stub.PutState("ethAddresses", nil)
		stub.PutState("numberPutHash", nil)
		stub.PutState("numberPut", []byte(strconv.Itoa(0)))

		indexName := "status~hash"

		statusIndexKey, err := stub.CreateCompositeKey(indexName, []string{rewardsBlock.Status, dataHashesString})
		if err != nil {
			return shim.Error(err.Error())
		}
		//  Save index entry to state. Only the key name is needed, no need to store a duplicate copy of the marble.
		//  Note - passing a 'nil' value will effectively delete the key from state, therefore we pass null character as value
		value := []byte{0x00}
		stub.PutState(statusIndexKey, value)
		return shim.Success(rewardsBlockBytes)
	}
	return shim.Success(nil)
}

// Save block of rewards into the blockchain
func (t *Chaincode) putBlockData(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	fmt.Println("----------------------------------- INIT PUT BLOCK DATA -----------------------------------")
	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting 1")
	}

	rewardsBlock := RewardsBlock{}
	json.Unmarshal([]byte(args[0]), &rewardsBlock)

	fmt.Println("----------------------------------- END PUT BLOCK DATA -----------------------------------")
	return shim.Success(nil)
}

// Returns all the blocks by state
func (t *Chaincode) getDelegatedBlockByStatus(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	fmt.Println("----------------------------------- INIT GET DELEGATED BLOCK STATUS -----------------------------------")
	if len(args) != 1 {
		shim.Error("Incorrect number of arguments. Expecting status value")
	}
	status := args[0]
	var rewardsBlocks []RewardsBlock

	statusResultsIterator, err := stub.GetStateByPartialCompositeKey("status~hash", []string{status})
	if err != nil {
		return shim.Error(err.Error())
	}
	defer statusResultsIterator.Close()

	// Iterate through result set and for each marble found, transfer to newOwner
	var i int
	for i = 0; statusResultsIterator.HasNext(); i++ {
		// Note that we don't get the value (2nd return variable), we'll just get the marble name from the composite key
		responseRange, err := statusResultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		_, compositeKeyParts, err := stub.SplitCompositeKey(responseRange.Key)
		if err != nil {
			return shim.Error(err.Error())
		}
		returnedHash := compositeKeyParts[1]
		var rewardsBlock RewardsBlock
		rewardsBlockBytes, _ := stub.GetState(returnedHash)
		json.Unmarshal(rewardsBlockBytes, &rewardsBlock)
		rewardsBlocks = append(rewardsBlocks, rewardsBlock)
	}

	rewardsBlocksBytes, _ := json.Marshal(rewardsBlocks)
	fmt.Println("----------------------------------- END GET rewards BLOCK STATUS -----------------------------------")
	return shim.Success(rewardsBlocksBytes)
}

func main() {
	err := shim.Start(new(Chaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
