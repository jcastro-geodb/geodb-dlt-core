import path from "path";
import shell from "../cli/spawn/shell";

export default () => {
  return new Promise((resolve, reject) => {
    try {
      const cwd = path.resolve(process.cwd(), "../network/build-local-testnet");
      const args = [];
      const p = shell("./initialize.sh", args, cwd);

      p.on("close", code => {
        if (code === 0 || code === 1) resolve(code);
        else reject(`Could not bootstrap the network. Exit code: ${code}`);
      });
    } catch (e) {
      reject(e);
    }
  });
};
