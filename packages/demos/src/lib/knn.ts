import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";
import { gaussianField, squaredDistances } from "./kmeans";

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
  const n = perClass * classes;
  const nx = gaussianField(nw, n, seed + 1, 0.035);
  const ny = gaussianField(nw, n, seed + 2, 0.035);
  const pts: KnnPoint[] = [];
  for (let i = 0; i < n; i++) {
    const label = i % classes;
    const t = (label / classes) * Math.PI * 2;
    pts.push({ x: 0.5 + 0.28 * Math.cos(t) + nx[i], y: 0.5 + 0.28 * Math.sin(t) + ny[i], label });
  }
  return pts;
}

// Majority vote over the k nearest training points, vectorised over a g×g grid.
// Distances via matmul (reuses kmeans squaredDistances); top-k by iterated
// argmin + masking; votes counted per cell.
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
    const a = am.toArray().map((v) => Math.round(v));
    am.free();
    for (let i = 0; i < cells; i++) votes[i * classes + labels[a[i]]]++;
    if (t < k - 1) {
      const aCol = nw.reshape(nw.array(a), [cells, 1]);
      const lRow = nw.reshape(arange, [1, n]);
      const eq = nw.equal(aCol, lRow);
      const big = nw.mulScalar(eq, 1e9);
      const D2 = nw.add(D, big);
      D.free();
      eq.free();
      big.free();
      aCol.free();
      lRow.free();
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
