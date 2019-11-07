package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"testing"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	testcc "github.com/s7techlab/cckit/testing"
	expectcc "github.com/s7techlab/cckit/testing/expect"
)

// Check the state of a key in the blockchain
func checkState(stub *testcc.MockStub, key string, value string) {
	bytes := stub.State[key]
	if bytes == nil {
		fmt.Println("State", key, "failed to get value")

	}
	if string(bytes) != value {
		fmt.Println("State value", key, "was not", value, "as expected")
		fmt.Println("State value", key, "was: ", string(bytes))
	}
	Expect(string(bytes)).To(Equal(value))
}

func TestMockstub(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Mockstub Suite")
}

var _ = Describe(`CarFactory`, func() {
	// Chaincode instance
	scc := new(Chaincode)
	stub := testcc.NewMockStub("Chaiconde", scc)

	Describe("Chaincode initialization ", func() {
		It("Allow to provide contract types attributes  during chaincode creation [init]", func() {
			expectcc.ResponseOk(stub.Init())
		})
	})
	Describe("Block Creation", func() {
		var numberPutHashArr []byte
		It("Adding user data", func() {
			value := "{\"eth_addr\":\"0x7769DBfe0F22232c9E366b14D33cf9b222222A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"
			valueBytes, _ := json.Marshal(value)
			valueHash := sha256.Sum256(valueBytes)
			numberPutHashArr = append(numberPutHashArr, valueHash[:]...)
			expectcc.ResponseOk(stub.Invoke("putUserData", value))
		})
		It("Adding user data", func() {
			value := "{\"eth_addr\":\"0x7769DBfe0F90222555666b14D33cf9bd23c22A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"
			valueBytes, _ := json.Marshal(value)
			valueHash := sha256.Sum256(valueBytes)
			numberPutHashArr = append(numberPutHashArr, valueHash[:]...)
			expectcc.ResponseOk(stub.Invoke("putUserData", value))
		})
		It("Adding user data", func() {
			value := "{\"eth_addr\":\"0x7769DBfe0F90333c9E111b14D33cf9bd23c22A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"
			valueBytes, _ := json.Marshal(value)
			valueHash := sha256.Sum256(valueBytes)
			numberPutHashArr = append(numberPutHashArr, valueHash[:]...)
			expectcc.ResponseOk(stub.Invoke("putUserData", value))
		})
		It("Adding user data", func() {
			value := "{\"eth_addr\":\"0x7769DBfe0F966666c9E366b14D33cf9bd23c22A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"
			valueBytes, _ := json.Marshal(value)
			valueHash := sha256.Sum256(valueBytes)
			numberPutHashArr = append(numberPutHashArr, valueHash[:]...)
			expectcc.ResponseOk(stub.Invoke("putUserData", value))
		})
		It("Adding user data", func() {
			value := "{\"eth_addr\":\"0x7769DBfe0F90f887859E366b14D33cf9bd23c22A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"
			valueBytes, _ := json.Marshal(value)
			valueHash := sha256.Sum256(valueBytes)
			numberPutHashArr = append(numberPutHashArr, valueHash[:]...)
			expectcc.ResponseOk(stub.Invoke("putUserData", value))
		})
		It("Checking if the created block is correct", func() {
			expectedValue := "{\"eth_addr\":\"0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"
			userHashes := sha256.Sum256(numberPutHashArr)
			userHashesString := fmt.Sprintf("%x", userHashes)
			checkState(stub, userHashesString, expectedValue)
		})
	})
})
