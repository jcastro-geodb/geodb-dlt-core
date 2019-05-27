const gulp = require("gulp");
const watch = require("gulp-watch");
const exec = require("child_process").exec;

gulp.task("default", async () => {
  console.log("Options: ", "test");
});

gulp.task("watch", async cb => {
  runTest();

  watch(["./contracts/**/*.sol", "./test/**/*.js"], () => {
    runTest();
  });
});

const runTest = () => {
  console.log("\n===============\nRunning tests\n===============\n");
  exec("rm -rf ./build; truffle test", function(err, stdout, stderr) {
    console.error(stderr);
    console.log(stdout);
  });
};
