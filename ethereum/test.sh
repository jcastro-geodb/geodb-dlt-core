# !/bin/bash
mocha -w ./test/*.test.js

# while inotifywait -e close_write ./test/*.js; do truffle test; done
