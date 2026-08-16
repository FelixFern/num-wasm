import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { KERNELS, SIZE, convolve, generatePatternImage, normalizeImage } from "../src/lib/convolve";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const img = generatePatternImage(nw, "rings", 9);
  const outSize = SIZE - 2;

  // identity kernel must reproduce the inner region (valid conv keeps the center pixel)
  const identity = KERNELS.find((k) => k.name === "identity")!;
  const convI = convolve(nw, img, identity.kernel);
  const flatI = convI.toArray();
  let idHit = 0;
  for (let r = 0; r < outSize; r++) {
    for (let c = 0; c < outSize; c++) {
      if (Math.abs(flatI[r * outSize + c] - img[(r + 1) * SIZE + c + 1]) < 1e-9) idHit++;
    }
  }
  console.log(`identity reproduces inner region: ${idHit}/${outSize * outSize}`);
  convI.free();

  // box blur must reduce contrast (variance)
  const blur = KERNELS.find((k) => k.name === "box blur")!;
  const convB = convolve(nw, img, blur.kernel);
  const normB = normalizeImage(nw, convB);
  convB.free();
  const meanB = normB.reduce((a, v) => a + v, 0) / normB.length;
  const varB = normB.reduce((a, v) => a + (v - meanB) ** 2, 0) / normB.length;

  // edge kernel must produce high contrast output (min != max after normalize)
  const edge = KERNELS.find((k) => k.name === "edge")!;
  const convE = convolve(nw, img, edge.kernel);
  const normE = normalizeImage(nw, convE);
  convE.free();
  const rangeE = Math.max(...normE) - Math.min(...normE);

  console.log(`box blur output variance ${varB.toFixed(4)}  edge output range ${rangeE.toFixed(3)}`);
  const ok = idHit === outSize * outSize && varB < 0.12 && rangeE > 0.8;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
