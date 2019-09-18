import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";

class InitLocalTestnet extends BaseScriptRunner {
  constructor() {
    super(null, null);
  }

  run = () => {
    if (this.events["updateProgress"]) this.events.updateProgress("Initializing network");

    return new Promise((resolve, reject) => {
      try {
        const cwd = path.resolve(process.cwd(), "../network/build-local-testnet");
        const args = [];
        const p = shell("./initialize.sh", args, cwd);

        if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

        if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

        p.on("close", code => {
          if (code === 0) resolve(code);
          else reject(`Could not bootstrap the network. Exit code: ${code}`);
        });
      } catch (e) {
        reject(e);
      }
    });
  };
}

const initLocalTestnet = params => {
  return new InitLocalTestnet(params);
};

export default initLocalTestnet;
