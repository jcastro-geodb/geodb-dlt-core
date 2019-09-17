import path from "path";
import shell from "../cli/spawn/shell";

export const NO_MODE_SPECIFIED = -1;
export const NETWORK_RUNNING = 0;
export const NETWORK_NOT_RUNNING = 1;

export const checkNetwork = mode => {
  return new Promise((resolve, reject) => {
    if (!mode) resolve(NO_MODE_SPECIFIED);

    try {
      const cwd = path.resolve(process.cwd(), "./src/helpers");
      const args = [];
      const p = shell("./checkLocalTestnet.sh", args, cwd);

      p.on("close", code => {
        if (code === NETWORK_RUNNING || code === NETWORK_NOT_RUNNING) resolve(code);
        else reject(`Could not determine network status. Exit code: ${code}`);
      });
    } catch (e) {
      reject(e);
    }
  });
};
