# Testing chaincode with identities

In this documentation we will se how to test chaincode functions as if we were an actor in Hyperledger fabric network

# Imported Packages

## MockStub - mocked chaincode stub

Mocking is a unit testing phenomenon which helps to test objects in isolation by replacing dependent objects with complex behavior with test objects with pre-defined/simulated behavior. These test objects are called as Mock objects.
The `shim` package contains a `MockStub` implementation that wraps calls to a chaincode, simulating its behavior in the HLF peer environment. MockStub does not need to start multiple docker containers. It implements almost every function the actual stub does, but in memory.


## GingkGo

Ginkgo makes use of Go’s existing `testing` package, which means that you don’t need elaborate setup to start using and benefiting from it.
Ginkgo allows you to group tests in `Describe` and `Context` container blocks. Ginkgo provides the `It` and `Specify` blocks which can hold your assertions.


## Gomega

Gomega is a matcher/assertion library. It is best paired with the Ginkgo BDD test framework, but can be adapted for use in other contexts too.


## CCKit

CCKit testing package contains:

- MockStub with implemented GetTransient and others methods and event subscription feature
- Test identity creation helpers
- Chaincode response expect helpers


# Creating test suite

## Testing in Go

Go has a built-in testing command called `go test` and a package `testing` which gives a minimal but complete testing experience. In our example we use Ginkgo - BDD-style Go testing framework, built on Go’s testing package, and allows to write readable tests in an efficient manner. It is best paired with the Gomega matcher library, but is designed to be matcher-agnostic.


## Test package

To write a new test suite, create a file whose name ends _test.go that contains the TestXxx functions, in our case will be `appstore_test.go`. Test file must be in the same directory as the chaincode file and the artifacts folder.

## Dependencies

In order to run the test suite we need to import all golang dependencies by executing:
​
- `go get github.com/hyperledger/fabric`
- `go get -u github.com/onsi/ginkgo`
- `go get -u github.com/onso/gomega`
- `go get -u github.com/s7techlab/cckit/testing`
- `go get -u github.com/s7techlab/cckit/testing/expect`

## Import matchers and helpers

To get started, we need to import the `matcher` functionality from the Ginkgo testing package so we can use different comparison mechanisms like comparing response objects or status codes.

We import the `ginkgo` and `gomega` packages with the `.` namespace, so that we can use functions from these packages without the package prefix. This allows us to use `Describe` instead of `ginkgo.Describe`.

We also import the `expect` and `testing` packages form `CCkit`.

## Bootstrap

The call to `RegisterFailHandler` registers a handler, the `Fail` function from the `Ginkgo` package, with Gomega. This creates the coupling between `Ginkgo` and `Gomega`.
Calling `RunSpecs` hands over the control to Ginkgo which runs the test suite.
The final line (`var _ = Describe("Carfactory", func() {})`) evaluates the `Describe` block.

```go
package main

import (
	"fmt"
	"testing"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	testcc "github.com/s7techlab/cckit/testing"
	expectcc "github.com/s7techlab/cckit/testing/expect"
)

func TestMockstub(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "MockStub suite")
}

var _ = Describe(`CarFactory`, func() {
	
}
```


## Test Structure

We will use the `Describe` function to describe a container and the `it`function to specify a single spec (specification that comes from behavior driven testing). In this example we can group the test of adding a new car value and the blockchain value check in the same `Car insertion` block

```go
var _ = Describe(`CarFactory`, func() {

	...
	
    Describe("Car insertion", func() {

        It("Adding car value", func() {
			...
		}   
		
        It("Checking if the saved result is correct", func() {
			...
		} 

    }
}
```

## Creating chaincode instance
First of all we have to instantiate the chaincode before calling its methods
```go
var _ = Describe(`CarFactory`, func() {
	// Chaincode instance	
	scc := new(Chaincode)
	stub := testcc.NewMockStub("Chaiconde", scc)

	...

}
```


## CCKit Testing

During CCKit testing we can check Response attribute:

- Status (error or success)
- Message string (contains error description)
- Payload contents (marshaled JSON or Protobuf)

Testing package contains multiple helpers / wrappers on ginkgo expect functions.

Most frequently used helpers are:

- `ResponseOk` (response peer.Response) expects that peer response contains `ok` status code(`200`)
- `ResponseError` (response peer.Response) expects that peer response contains error statuc code (`500`). Optionally you can pass expected error substring.
- `PayloadIs`(response peer.Response, target **interface{}) expects that peer response contains `ok` status code (`200`) and converts response to target type using  `CCKit` convert package

For example we can simply test that `Init` method (invoked when the chaincode is initialised) returns successful status code:

```go
var _ = Describe(`CarFactory`, func() {
	
	...

	Describe("Chaincode initialization ", func() {
		It("Allow to provide contract types attributes  during chaincode creation [init]", func() {
			expectcc.ResponseOk(stub.Init())
		})
	})
}
```

## Identity Test

Each actor(peer, orderer, client, administrator and more) in Hyperledger Fabric has a digital identity encapsulated in an X.509 digital certificate. These identities really matter because they determine the exact permissions over resources and access to information that actors have in a blockchain network. The appstore chaincode contains logic to control who can invoke `carInsert` method.
CCKit offer us a way to load certificates from a pem file: 
```go
var _ = Describe(`CarFactory`, func() {
	// Chaincode instance	
	scc := new(Chaincode)
	stub := testcc.NewMockStub("Chaiconde", scc)

	// Get certificate identities from folder /artifacts
	mspId := "geodbMSP"
	identitiesFolder := "artifacts/adminCertificate"
	adminIdentity, _ := testcc.IdentityFromFile(mspId, identitiesFolder, ioutil.ReadFile)

	...
	
}
```

Test use `From` MockStub method to set certificate and MSP id of invoker.
```go
var _ = Describe(`CarFactory`, func() {
	
	...

	Describe(`Car insertion`, func() {
		It("Adding car value", func() {
			key := "Alice"
			value := "Mustang"
			expectcc.ResponseOk(stub.From(adminIdentity).Invoke("carInsert", key, value))
		})

	...

```

# Running test

To run the test suite you have to simply run the command in the repository where the test suite and the chaincode are located:
`go test`
