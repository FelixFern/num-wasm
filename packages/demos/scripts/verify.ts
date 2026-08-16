import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { generateSyntheticDataset } from "../src/lib/data";
import { freeModel, initModel, trainModel, predictSample } from "../src/lib/mlp";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const ds = generateSyntheticDataset(30, 3);
  const model = initModel(nw, 784, [10, 10], 3, 42);

  const history = await trainModel(model, ds, {
    iterations: 300,
    alpha: 0.1,
    reportEvery: 20,
    onProgress: (p) =>
      console.log(
        `iter ${p.iteration.toString().padStart(4)}  acc ${(p.accuracy * 100).toFixed(1)}%  loss ${p.loss.toFixed(4)}`,
      ),
  });

  const finalReport = history[history.length - 1];
  console.log(
    `\nfinal  accuracy: ${(finalReport.accuracy * 100).toFixed(1)}%  loss: ${finalReport.loss.toFixed(4)}  lr: 0.10`,
  );

  // predict a held-out sample per class
  const perClass = 5;
  const heldOut = generateSyntheticDataset(perClass, 3);
  for (let k = 0; k < 3; k++) {
    const pred = await predictSample(model, heldOut.x[k * perClass]);
    const hit = pred.label === k ? "ok" : "miss";
    console.log(`class ${k}: predicted ${pred.label} (${Math.max(...pred.probs).toFixed(2)} conf) [${hit}]`);
  }

  freeModel(model);
  const ok = finalReport.accuracy > 0.8;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
