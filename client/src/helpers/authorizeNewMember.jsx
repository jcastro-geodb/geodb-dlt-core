import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";

class AuthorizeNewMember extends BaseScriptRunner {
  constructor(params, db, mode) {
    super(db, mode);
    this.params = params;
  }

  run = () => {
    const { db, mode } = this;
    const { cli, orderer, channel, artifactsPath, commit } = this.params;

    if (this.events["updateProgress"]) this.events.updateProgress("Authorizing member");

    return new Promise((resolve, reject) => {
      try {
        const cwd = path.resolve(process.cwd(), "./../network");

        let args = ["-c", cli, "-u", orderer, "-C", channel, "-o", `${artifactsPath}/configtx-print.json`];
        if (commit === true) args.push("--commit");

        const p = shell("./authorize-new-member.sh", args, cwd);

        if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

        if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

        p.on("close", code => {
          if (code === 0) resolve(code);
          else reject(code);
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  };
}

const authorizeNewMember = (params, db, mode) => {
  return new AuthorizeNewMember(params, db, mode);
};

export default authorizeNewMember;
