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

async function main() {
  const t0 = Date.now();
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const train = parseGridCsv(fs.readFileSync(trainPath, "utf8"));
  const test = parseGridCsv(fs.readFileSync(testPath, "utf8"));
  console.log(`train ${train.y.length} samples, test ${test.y.length} samples`);

  const hidden = (process.env.HIDDEN || "64,32,16").split(",").map((x) => parseInt(x, 10));
  const iters = parseInt(process.env.ITERS || "300", 10);
  const model = initModel(nw, 784, hidden, 10, 42);
  const history = await trainModel(model, train, {
    iterations: iters,
    alpha: 0.2,
    reportEvery: 50,
    batchSize: parseInt(process.env.BATCH || "256", 10),
    onProgress: (p) =>
      console.log(`iter ${String(p.iteration).padStart(4)}  acc ${(p.accuracy * 100).toFixed(1)}%  loss ${p.loss.toFixed(4)}`),
  });
  const final = history[history.length - 1];
  console.log(`\ntrain acc ${(final.accuracy * 100).toFixed(1)}%  loss ${final.loss.toFixed(4)}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  let correct = 0;
  for (let i = 0; i < test.y.length; i++) {
    const pred = await predictSample(model, test.x[i]);
    if (pred.label === test.y[i]) correct++;
  }
  console.log(`test acc ${((correct / test.y.length) * 100).toFixed(1)}%  (${test.y.length} samples)`);

  freeModel(model);
  const ok = final.accuracy > 0.7 && correct / test.y.length > 0.6;
  console.log(ok ? "VERIFY OK" : "VERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
