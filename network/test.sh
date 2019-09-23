# !/bin/bash

dirname="$1"
result="${dirname%"${dirname##*[!/]}"}" # extglob-free multi-trailing-/ trim
result="${result##*/}"

echo $result
