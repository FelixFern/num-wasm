import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm } from "@felixfern/num-wasm/browser";
import { fitKMeans, generateClusterData } from "../src/lib/kmeans";

const here = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(here, "../node_modules/@felixfern/num-wasm/dist/num-wasm.wasm");

// best label mapping purity over all cluster-id permutations
function bestAccuracy(assignments: number[], trueLabels: number[], k: number): number {
  const perms: number[][] = [];
  const cur: number[] = [];
  const used = new Array(k).fill(false);
  const rec = () => {
    if (cur.length === k) {
      perms.push([...cur]);
      return;
    }
    for (let i = 0; i < k; i++) {
      if (!used[i]) {
        used[i] = true;
        cur.push(i);
        rec();
        cur.pop();
        used[i] = false;
      }
    }
  };
  rec();
  let best = 0;
  for (const p of perms) {
    let hit = 0;
    for (let i = 0; i < assignments.length; i++) if (p[assignments[i]] === trueLabels[i]) hit++;
    best = Math.max(best, hit / assignments.length);
  }
  return best;
}

async function main() {
  const nw = await NumWasm.initFromBytes(fs.readFileSync(wasmPath));
  const k = 4;
  const n = 300;
  const seed = 7;

  const points = generateClusterData(nw, n, k, seed);
  const history = await fitKMeans(nw, points, k, {
    iterations: 40,
    reportEvery: 5,
    seed,
    onStep: (s) =>
      console.log(`iter ${s.iteration.toString().padStart(3)}  inertia ${s.inertia.toFixed(3)}  sizes ${s.sizes.join("·")}`),
  });

  const last = history[history.length - 1];
  const trueLabels = points.map((_, i) => i % k);
  const acc = bestAccuracy(last.assignments, trueLabels, k);
  const mono = history.every((s, i, arr) => i === 0 || s.inertia <= arr[i - 1].inertia + 1e-6);
  console.log(`\nfinal  inertia: ${last.inertia.toFixed(3)}  purity: ${(acc * 100).toFixed(1)}%  monotone: ${mono}`);

  const ok = acc > 0.9 && mono;
  console.log(ok ? "\nVERIFY OK" : "\nVERIFY FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
