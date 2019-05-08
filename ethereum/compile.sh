# !/bin/bash

rm -rf ./build
truffle compile

cp ./build/contracts/GeoDB.json ../network/chaincode/github.com/geodb/ethereum/abi/GeoDB.json
