// Utilidad para ejecutar comandos en el S.O.
const exec = require("child_process").exec;

function shell(command) {
  return new Promise((resolve, reject) => {
    try {
      exec(command, (error, stdout, stderr) => {
        if (error) reject(error, stderr);
        else resolve(stdout);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export default shell;
