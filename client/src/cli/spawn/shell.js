// Utilidad para ejecutar comandos en el S.O.
const spawn = require("child_process").spawn;

function shell(command, args, cwd) {
  let options = {};
  options.cwd = cwd ? cwd : null;

  return spawn(command, args, options).on("error", err => {
    console.error(err);
    throw err;
  });
}

export default shell;
