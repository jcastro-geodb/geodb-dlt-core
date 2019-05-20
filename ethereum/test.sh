# !/bin/bash

if [ -z "$FILE" ]; then
  FILE=./test/*.test.js
fi

mocha -w $FILE

# while inotifywait -e close_write ./test/*.js; do truffle test; done
