import path from "path";
import shell from "../cli/spawn/shell.js";
import portastic from "portastic";

const { rootCAPort, localTestnetCredentials } = require("./../constants/ca.json");

class SetupCertificates {
  constructor(params) {
    this.params = params;
  }

  on(event, callback) {
    if (this.events === undefined) this.events = {};
    this.events[event] = callback;
    return this;
  }

  run() {
    const params = this.params;
    return new Promise((resolve, reject) => {
      portastic
        .find({
          min: 7600,
          max: 7699
        })
        .then(ports => {
          const intermediateCAPort = ports[Math.floor(Math.random() * ports.length)];

          const cwd = path.resolve(process.cwd(), "./../network");

          const args = [
            `--orgs`,
            `${params.domain}:1:0:${rootCAPort}:${localTestnetCredentials}:${intermediateCAPort}`
          ];

          if (params.overwrite) args.push(`--recreate`, `${params.overwrite}`);

          const p = shell("./generate-crypto-materials.sh", args, cwd);

          if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

          if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

          p.on("close", code => {
            if (code === 0) resolve(code);
            else reject(code);
          });
        });
    });
  }
}

const setupCertificates = params => {
  return new SetupCertificates(params);
};

export default setupCertificates;

// const setupCertificates = (params, onStdout, onStderr, onClose) => {
//   portastic
//     .find({
//       min: 7600,
//       max: 7699
//     })
//     .then(ports => {
//       const intermediateCAPort = ports[Math.floor(Math.random() * ports.length)];
//
//       const cwd = path.resolve(process.cwd(), "./../network");
//
//       const args = [`--orgs`, `${params.domain}:1:0:${rootCAPort}:${localTestnetCredentials}:${intermediateCAPort}`];
//
//       if (params.overwrite) args.push(`--recreate`, `${params.overwrite}`);
//
//       const p = shell("./generate-crypto-materials.sh", args, cwd);
//
//       p.stdout.on("data", onStdout);
//
//       p.stderr.on("data", onStderr);
//
//       p.on("close", onClose);
//     });
// };
//
// export default setupCertificates;
