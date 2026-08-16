import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { runMonteCarlo } from "../src/lib/monte";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const history = await runMonteCarlo(nw, {
    samples: 20000,
    batch: 2000,
    seed: 21,
    onStep: (s) =>
      console.log(
        `samples ${s.total.toString().padStart(6)}  est ${s.estimate.toFixed(4)}  err ${s.error.toExponential(1)}`,
      ),
  });
  const last = history[history.length - 1];
  console.log(`\nfinal  π ≈ ${last.estimate.toFixed(4)}  (π = ${Math.PI.toFixed(4)})  error ${last.error.toExponential(1)}`);

  const ok = last.error < 0.05;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
