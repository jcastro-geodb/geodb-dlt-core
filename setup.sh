# !/bin/bash

checkCURL(){
  command -v curl >/dev/null 2>&1 || { installCURL; }
}

installCURL(){
  echo
  echo "========================================================="
  echo "Now installing CURL"
  echo "========================================================="
  echo
  apt-get install curl -y
}

checkDocker(){
  command -v docker >/dev/null 2>&1 || { installDocker; }
}

installDocker(){
  echo
  echo "========================================================="
  echo "Now installing docker"
  echo "========================================================="
  echo
  apt-get install docker.io -y
}

checkDockerCompose(){
  command -v docker-compose >/dev/null 2>&1 || { installDockerCompose; }
}

installDockerCompose(){
  echo
  echo "========================================================="
  echo "Now installing docker-compose"
  echo "========================================================="
  echo
  apt-get install docker-compose -y
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

  if [ -d "$HOME/go" ]; then
    echo "Removing $HOME/go"
    rm -rf $HOME/go
  fi

  wget https://dl.google.com/go/go1.12.5.linux-amd64.tar.gz -O /tmp/golang.tar.gz
  tar -xvf /tmp/golang.tar.gz --directory $HOME

}

checkEnvironment(){

  echo
  echo "========================================================="
  echo "Checking and setting ENV"
  echo "========================================================="
  echo

  while IFS="" read -r checkVar || [ -n "$p" ]
  do
    if grep -Fxq "$checkVar" $HOME/.profile
    then
        echo "$checkVar IS SET"
    else
        echo $checkVar >> $HOME/.profile
    fi
  done < fabric-environment
}


if [ `id -u` != "0" ]; then
  echo "Please run as root"
  exit 1
fi

checkCURL
checkDocker
checkDockerCompose
checkGo
checkEnvironment
curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.1 1.4.1 0.4.15
