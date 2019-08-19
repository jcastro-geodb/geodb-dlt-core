#!/bin/bash

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... Proccess Succeed"
        else
                >&2 echo -e "ERROR.... Proccess ERROR: $1"
                echo -e "INFO:Please check errors and retry..."
                exit $1
        fi
}

checkDependencies(){
  programs=(curl make docker docker-compose jq)

  for program in "${programs[@]}"; do
      if ! command -v "$program" > /dev/null 2>&1; then
          echo "$program not found. Please, run sudo ./install-dependencies.sh";
          exit 1;
      fi
  done
}

checkGo(){
  command -v go >/dev/null 2>&1 || { installGo; }
}

installGo(){
  echo
  echo "========================================================="
  echo "Now installing go"
  echo "========================================================="
  echo

  sleep 1s

  if [ -d "/opt/go" ]; then
    echo "Removing /opt/go"
    rm -rf /opt/go
  fi

  wget https://dl.google.com/go/go1.12.5.linux-amd64.tar.gz -O /tmp/golang.tar.gz
  tar -xvf /tmp/golang.tar.gz --directory /opt

  chown -R $(logname) /opt/go

}

installFabric(){

  echo
  echo "========================================================="
  echo "Now installing Hyperledger Fabric"
  echo "========================================================="
  echo

  sleep 1s

  currDir=`pwd`

  if [ ! -d "/opt/hyperledger" ]; then
    echo "Creating /opt/hyperledger"
    mkdir /opt/hyperledger
  fi

  cd /opt/hyperledger

  if [ -d "fabric-samples-1.4.1" ]; then
    echo "Removing fabric-samples-1.4.1"
    rm -rf fabric-samples-1.4.1
  fi

  curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.1 1.4.1 0.4.15

  mv fabric-samples fabric-samples-1.4.1

  cd $currDir

  if [ ! -d "/opt/go-lib" ]; then
    echo "Creating /opt/go-lib"
    mkdir /opt/go-lib
  fi

  echo
  echo "========================================================="
  echo "Setting up FABRIC-CA"
  echo "========================================================="
  echo

  GOPATH=/opt/go-lib /opt/go/bin/go get -u github.com/hyperledger/fabric-ca/cmd/...
  /opt/go/bin/go clean -cache

  chown -R $(logname) /opt/go-lib
  GOCACHE=`echo "$(/opt/go/bin/go env GOCACHE)"`
  rm -rf $GOCACHE
}

installGeodb(){

  echo
  echo "========================================================="
  echo "Now installing GeoDB bootstrap scripts"
  echo "========================================================="
  echo

  sleep 1s

  if [ -d "$HOME/geodb" ]; then
    echo "Removing $HOME/geodb"
    rm -rf $HOME/geodb
  fi

  git clone https://github.com/GeoDB-Limited/geodb-federation-fabric-prototype $HOME/geodb
  chown -R $(logname) $HOME/geodb
}

if [ `id -u` != "0" ]; then
  echo "Please, run as root"
  exit 1
fi

checkDependencies
check_returnCode $?

checkGo
check_returnCode $?

installFabric
check_returnCode $?

installGeodb
check_returnCode $?

echo
echo "========================================================="
echo "Setup is now complete. Please reboot the system."
echo "========================================================="
echo
