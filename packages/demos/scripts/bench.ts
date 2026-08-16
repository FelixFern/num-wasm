import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { parseGridCsv } from "../src/lib/data";
import { freeModel, initModel, predictSample, trainModel } from "../src/lib/mlp";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");
const trainPath = path.resolve(here, "../public/dataset.csv");
const testPath = path.resolve(here, "../public/mnist_test.csv");

const configs = [
  { hidden: [64, 32, 16], iters: 300, alpha: 0.2 },
  { hidden: [64, 48, 32], iters: 300, alpha: 0.2 },
  { hidden: [48, 32, 16], iters: 350, alpha: 0.2 },
  { hidden: [64, 32, 16, 8], iters: 300, alpha: 0.2 },
];

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const train = parseGridCsv(fs.readFileSync(trainPath, "utf8"));
  const test = parseGridCsv(fs.readFileSync(testPath, "utf8"));

  for (const c of configs) {
    const t0 = Date.now();
    const model = initModel(nw, 784, c.hidden, 10, 42);
    const history = await trainModel(model, train, {
      iterations: c.iters,
      alpha: c.alpha,
      reportEvery: Math.round(c.iters / 10),
    });
    let correct = 0;
    for (let i = 0; i < test.y.length; i++) {
      const pred = await predictSample(model, test.x[i]);
      if (pred.label === test.y[i]) correct++;
    }
    const final = history[history.length - 1];
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `${c.hidden.join("x")} iters=${c.iters} alpha=${c.alpha}  train=${(final.accuracy * 100).toFixed(1)}% test=${((correct / test.y.length) * 100).toFixed(1)}% loss=${final.loss.toFixed(3)} time=${elapsed}s`,
    );
    freeModel(model);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
