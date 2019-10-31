# !/bin/bash

jsonEth="{\"eth_addr\":\"0x666666666666\",\"lat\":\"21431\",\"long\":\"432\",\"timestamp\":\"1412412413\"}"

echo "-------------------------------PRINTING JSON---------------------"
echo "CHAINCODE   \"$jsonEth\""
echo "-------------------------------PRINTINF ECHO CHAINDOCE CALL---------------"
echo "peer chaincode invoke -n geodb -c  '{\"Args\":[\"putUserData\", \"${jsonEth}\"] -C rewards"
echo "-------------------------------INVOKING CHAINCODE------------------" 
peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55\",\"lat\":\"21234561431\",\"long\":\"412345632\",\"timestamp\":\"112345678412412413\"}"]}' -C rewards

sleep 5

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55\",\"lat\":\"2142221131\",\"long\":\"22211432\",\"timestamp\":\"1412412422211113\"}"]}' -C rewards

sleep 5

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55\",\"lat\":\"2143111121\",\"long\":\"43111122\",\"timestamp\":\"141241111212413\"}"]}' -C rewards

sleep 5

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55\",\"lat\":\"214376761\",\"long\":\"4936662\",\"timestamp\":\"14124124966613\"}"]}' -C rewards

sleep 5 

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7D039295C40a9518E59d48321670055224077cE3\",\"lat\":\"2147778831\",\"long\":\"4356732\",\"timestamp\":\"14122342412413\"}"]}' -C rewards

sleep 5 

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7D039295C40a9518E59d48321670055224077cE3\",\"lat\":\"216666431\",\"long\":\"4323346662\",\"timestamp\":\"14124123\"}"]}' -C rewards

sleep 5 

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7D039295C40a9518E59d48321670055224077cE3\",\"lat\":\"21435451\",\"long\":\"466632\",\"timestamp\":\"14124342312413\"}"]}' -C rewards

sleep 5 

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7D039295C40a9518E59d48321670055224077cE3\",\"lat\":\"214312222\",\"long\":\"42132\",\"timestamp\":\"1412411112413\"}"]}' -C rewards

sleep 5 

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7D039295C40a9518E59d48321670055224077cE3\",\"lat\":\"2145345\",\"long\":\"325232\",\"timestamp\":\"14124532242413\"}"]}' -C rewards

sleep 5 

peer chaincode invoke -n geodb -c '{"Args":["putUserData", "{\"eth_addr\":\"0x7769DBfe0F90f10c9E366b14D33cf9bd23c22A55\",\"lat\":\"2343231\",\"long\":\"432\",\"timestamp\":\"1412412413\"}"]}' -C rewards

sleep 5 

