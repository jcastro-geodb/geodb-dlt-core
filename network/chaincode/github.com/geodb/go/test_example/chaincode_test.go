package main

import (
	"fmt"
	"io/ioutil"
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

	// Get certificate identities from folder /artifacts
	mspId := "geodbMSP"
	identitiesFolder := "artifacts/adminCertificate"
	adminIdentity, _ := testcc.IdentityFromFile(mspId, identitiesFolder, ioutil.ReadFile)

	Describe("Chaincode initialization ", func() {
		It("Allow to provide contract types attributes  during chaincode creation [init]", func() {
			expectcc.ResponseOk(stub.Init())
		})
	})
	Describe(`Car insertion`, func() {
		It("Adding car value", func() {
			key := "Alice"
			value := "Mustang"
			expectcc.ResponseOk(stub.From(adminIdentity).Invoke("carInsert", key, value))
		})
		It("Checking if the saved result is correct", func() {
			key := "Alice"
			expectedValue := "Mustang"
			checkState(stub, key, expectedValue)
		})
	})
})
