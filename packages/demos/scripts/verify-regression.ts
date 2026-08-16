import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { generateRegressionData, predictLabels, trainRegression } from "../src/lib/regression";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));

  // linear: recover y = 2.5x - 1
  const lin = generateRegressionData(nw, "linear", 120, 0.25, 11);
  const lhist = await trainRegression(nw, "linear", lin, {
    iterations: 1500,
    alpha: 0.5,
    reportEvery: 150,
    onStep: (s) =>
      console.log(`linear   iter ${s.iteration.toString().padStart(4)}  mse ${s.loss.toFixed(5)}  w ${s.w.toFixed(3)}  b ${s.b.toFixed(3)}`),
  });
  const lf = lhist[lhist.length - 1];
  console.log(`\nlinear   final  w ${lf.w.toFixed(3)} (want ~2.5)  b ${lf.b.toFixed(3)} (want ~-1)  mse ${lf.loss.toFixed(5)}`);
  const lOk = Math.abs(lf.w - 2.5) < 0.6 && Math.abs(lf.b + 1) < 0.6 && lf.loss < 0.3;

  // logistic: separable sigmoid(8(x-0.5))
  const logi = generateRegressionData(nw, "logistic", 120, 0, 12);
  const ghist = await trainRegression(nw, "logistic", logi, {
    iterations: 2500,
    alpha: 2.0,
    reportEvery: 250,
    onStep: (s) =>
      console.log(`logistic iter ${s.iteration.toString().padStart(4)}  logloss ${s.loss.toFixed(4)}  w ${s.w.toFixed(3)}  b ${s.b.toFixed(3)}`),
  });
  const gf = ghist[ghist.length - 1];
  const preds = predictLabels(nw, logi.x, gf.w, gf.b);
  let correct = 0;
  for (let i = 0; i < logi.y.length; i++) if (preds[i] === logi.y[i]) correct++;
  const acc = correct / logi.y.length;
  console.log(`logistic final  acc ${(acc * 100).toFixed(1)}%  logloss ${gf.loss.toFixed(4)}`);
  const gOk = acc > 0.8 && gf.loss < 0.5;

  const ok = lOk && gOk;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
