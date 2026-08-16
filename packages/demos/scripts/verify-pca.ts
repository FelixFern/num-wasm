import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { centerAndCov, generatePcaData, powerIterate } from "../src/lib/pca";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const pts = generatePcaData(nw, 240, 5);
  const cov = centerAndCov(nw, pts);
  const history = await powerIterate(nw, cov, {
    iterations: 50,
    onStep: (s) => {
      if (s.iteration % 5 === 0) {
        console.log(`iter ${s.iteration.toString().padStart(3)}  ratio ${(s.ratio * 100).toFixed(2)}%  angle ${s.angle.toFixed(2)}°`);
      }
    },
  });
  cov.free();

  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const norm = Math.hypot(last.vec[0], last.vec[1]);
  const stable = Math.abs(last.angle - prev.angle) < 1e-2;
  console.log(
    `\nfinal  ratio ${(last.ratio * 100).toFixed(2)}%  angle ${last.angle.toFixed(2)}°  |v| ${norm.toFixed(4)}  stable ${stable}`,
  );

  const ok = last.ratio > 0.6 && Math.abs(norm - 1) < 1e-3 && stable;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
