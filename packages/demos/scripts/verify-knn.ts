import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { classifyGrid, generateKnnData } from "../src/lib/knn";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const perClass = 40;
  const classes = 4;
  const seed = 3;
  const train = generateKnnData(nw, perClass, classes, seed);
  const g = 24;
  const k = 5;
  const grid = classifyGrid(nw, train, g, k);

  // reference: Voronoi of the ring centers (geometry, not RNG)
  const centers = Array.from({ length: classes }, (_, c) => {
    const t = (c / classes) * Math.PI * 2;
    return { x: 0.5 + 0.28 * Math.cos(t), y: 0.5 + 0.28 * Math.sin(t), label: c };
  });
  let hit = 0;
  const cells = g * g;
  for (let i = 0; i < cells; i++) {
    const x = ((i % g) + 0.5) / g;
    const y = (Math.floor(i / g) + 0.5) / g;
    let best = 0;
    let bd = Infinity;
    for (const c of centers) {
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d < bd) {
        bd = d;
        best = c.label;
      }
    }
    if (grid[i] === best) hit++;
  }
  const acc = hit / cells;
  console.log(`knn grid ${g}x${g} k=${k}  classes=${classes}  match-vs-voronoi ${(acc * 100).toFixed(1)}%`);

  const ok = acc > 0.9;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
