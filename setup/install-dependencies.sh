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

  sleep 1s

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

  sleep 1s

  apt-get install docker.io -y

  addUser=`logname`
  usermod -a -G docker $addUser
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

  sleep 1s

  apt-get install docker-compose -y
}

installLibtool(){

  echo
  echo "========================================================="
  echo "Now installing libtool"
  echo "========================================================="
  echo

  sleep 1s

  apt-get install libtool libltdl-dev -y
}

if [ `id -u` != "0" ]; then
  echo "Please, run as root"
  exit 1
fi


checkCURL

checkDocker

checkDockerCompose

installLibtool

echo
echo "========================================================="
echo "It is required to reboot before continuing the setup"
echo "========================================================="
echo
