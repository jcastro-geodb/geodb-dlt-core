# !/bin/bash
function checkMandatoryEnvironmentVariable() {

  varName=$1; shift
  ENV_VAR=${!varName}

  if [ -z "$ENV_VAR" ]; then
    echo "$varName is not set as environment variable"
    exit 1
  fi
}

function checkFatalError() {
  if [ $1 -ne 0 ]; then
    fatal "Operation returned code $1 instead of 0. Cannot continue"
  fi
}

# Print a fatal error message and exit
function fatal {
   printError $*
   >&2 echo "at function ${FUNCNAME[1]}, line ${BASH_LINENO[0]}"
   exit 1
}

# Print a message surrounded by #, separating it from the rest of the output
function printSection() {
  local l=`printf '#%.s' $(eval "echo {1.."$((${#1} + 20))"}")`
	printf "\n$l\n##        $1        ##\n$l\n\n"
}

# Message with red color
function printError() {
  >&2 echo -e "\e[1;91mERROR:\e[0m $*"
}

# Message with yellow color
function printWarning() {
  echo -e "\e[33mWARNING:\e[0m $*"
}

# Message with yellow color
function printInfo() {
  echo -e "\e[36mINFO:\e[0m $*"
}

operationsWithPeer() {
  printInfo "Running a peer command with the following parameters: $@"
  CLI=$1; shift
  docker exec $CLI bash -c "$@"
  checkFatalError $?
}
