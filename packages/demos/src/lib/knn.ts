import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";
import { generateRingBlobs, idxVec, oneHotFromIdx, squaredDistances } from "./util";

export { generateRingBlobs } from "./util";

export interface KnnPoint {
  x: number;
  y: number;
  label: number;
}

export function generateKnnData(
  nw: NumWasm,
  perClass: number,
  classes: number,
  seed: number,
): KnnPoint[] {
  // Ring blobs give round, well-separated classes — same geometry as k-means.
  return generateRingBlobs(nw, perClass * classes, classes, seed, 0.035);
}

// Majority vote over the k nearest training points, vectorised over a g×g grid.
// Distances via matmul (shared squaredDistances); top-k by iterated argmin +
// masking; votes counted per cell.
export function classifyGrid(nw: NumWasm, train: KnnPoint[], g: number, k: number): number[] {
  const cells = g * g;
  const classes = Math.max(...train.map((p) => p.label)) + 1;
  const n = train.length;
  const gridPts = new Array(cells);
  for (let r = 0; r < g; r++) {
    for (let c = 0; c < g; c++) gridPts[r * g + c] = [(c + 0.5) / g, (r + 0.5) / g];
  }
  const P = nw.array(gridPts);
  const T = nw.array(train.map((p) => [p.x, p.y]));
  let D = squaredDistances(nw, P, T); // (cells, n)
  const labels = train.map((p) => p.label);
  const votes = new Float64Array(cells * classes);
  const arange = nw.arange(0, n, 1);
  for (let t = 0; t < k; t++) {
    const am = nw.argmin(D, { axis: 1 }) as NdArray;
    const a = idxVec(am);
    am.free();
    for (let i = 0; i < cells; i++) votes[i * classes + labels[a[i]]]++;
    if (t < k - 1) {
      const aArr = nw.array(a);
      const eq = oneHotFromIdx(nw, aArr, n);
      aArr.free();
      const big = nw.mulScalar(eq, 1e9);
      eq.free();
      const D2 = nw.add(D, big);
      D.free();
      big.free();
      D = D2;
    }
  }
  arange.free();
  D.free();
  P.free();
  T.free();

  const grid = new Array(cells);
  for (let i = 0; i < cells; i++) {
    let best = 0;
    for (let c = 1; c < classes; c++) if (votes[i * classes + c] > votes[i * classes + best]) best = c;
    grid[i] = best;
  }
  return grid;
}

export function classifyPoint(
  nw: NumWasm,
  train: KnnPoint[],
  x: number,
  y: number,
  k: number,
): { label: number; votes: number[]; neighbors: number[] } {
  const P = nw.array([[x, y]]);
  const T = nw.array(train.map((p) => [p.x, p.y]));
  const D = squaredDistances(nw, P, T); // (1, n)
  const d = D.toArray();
  D.free();
  P.free();
  T.free();
  const n = train.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d[a] - d[b]);
  const neighbors = order.slice(0, k);
  const classes = Math.max(...train.map((p) => p.label)) + 1;
  const votes = new Array(classes).fill(0);
  for (const i of neighbors) votes[train[i].label]++;
  let label = 0;
  for (let c = 1; c < classes; c++) if (votes[c] > votes[label]) label = c;
  return { label, votes, neighbors };
}