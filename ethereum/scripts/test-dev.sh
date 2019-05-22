# !/bin/bash

if [ -z "$FILE" ]; then
  FILE=*.test.js
fi

mocha -w ./test/$FILE

# while inotifywait -e close_write ./test/*.js; do truffle test; done
