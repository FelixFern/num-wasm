import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";
import {
  generateBlobs,
  idxVec,
  oneHotFromIdx,
  randomBlobCenters,
  randomScalar,
  sleep,
  squaredDistances,
} from "./util";

export type { BlobPoint };
export { gaussianField, oneHotFromIdx, ringCenters, squaredDistances } from "./util";

export interface KMeansPoint {
  x: number;
  y: number;
}

export interface KMeansStep {
  iteration: number;
  inertia: number;
  assignments: number[];
  centroids: KMeansPoint[];
  sizes: number[];
}

export interface KMeansOptions {
  iterations: number;
  seed?: number;
  reportEvery?: number;
  delayMs?: number;
  onStep?: (step: KMeansStep) => void;
}

import type { BlobPoint } from "./util";

// Synthetic blob clusters with randomized, well-separated center placement —
// new layout on every seed (Regenerate bumps the seed).
export function generateClusterData(
  nw: NumWasm,
  n: number,
  k: number,
  seed: number,
  spread = 0.032,
): KMeansPoint[] {
  const centers = randomBlobCenters(nw, k, seed);
  return generateBlobs(nw, n, centers, seed, spread).map(({ x, y }) => ({ x, y }));
}

// K-means++ init: centroids seeded far apart, all scoring in num-wasm
// (squaredDistances + min + random); the cumulative index walk is plain JS.
export function initCentroids(nw: NumWasm, points: KMeansPoint[], k: number, seed: number): NdArray {
  const n = points.length;
  const P = nw.array(points.map((p) => [p.x, p.y]));
  const randIdx = (s: number) => Math.min(n - 1, Math.floor(randomScalar(nw, seed + s) * n));
  const chosen: number[] = [randIdx(0)];
  let d = 1;
  while (chosen.length < k) {
    const Ccur = nw.array(chosen.map((i) => [points[i].x, points[i].y]));
    const D = squaredDistances(nw, P, Ccur);
    const dmin = nw.min(D, { axis: 1 }) as NdArray;
    const dArr = dmin.toArray();
    dmin.free();
    D.free();
    Ccur.free();
    let total = 0;
    for (let i = 0; i < n; i++) total += dArr[i];
    if (total <= 0) break;
    let r = randomScalar(nw, seed + d) * total;
    let pick = n - 1;
    for (let i = 0; i < n; i++) {
      r -= dArr[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    chosen.push(pick);
    d++;
  }
  while (chosen.length < k) {
    const fallback = randIdx(d++);
    if (!chosen.includes(fallback)) chosen.push(fallback);
  }
  P.free();
  return nw.array(chosen.map((i) => [points[i].x, points[i].y])); // (k,2)
}

// One-hot membership matrix G (n,k) via broadcast `equal` against arange.
export function oneHotAssignments(nw: NumWasm, assignments: NdArray, k: number): NdArray {
  return oneHotFromIdx(nw, assignments, k);
}

// centroids = (GᵀP) / colSums  — single matmul, no per-cluster loop.
export function updateCentroids(nw: NumWasm, P: NdArray, G: NdArray): NdArray {
  const k = G.shape[1];
  const counts = nw.sum(G, { axis: 0 }) as NdArray;
  const safe = nw.maximumScalar(counts, 1);
  counts.free();
  const GT = nw.transpose(G);
  const sums = nw.matmul(GT, P);
  GT.free();
  const C = nw.divide(sums, nw.reshape(safe, [k, 1]));
  safe.free();
  sums.free();
  return C;
}

export function clusterInertia(nw: NumWasm, D: NdArray, G: NdArray): number {
  const masked = nw.multiply(D, G);
  const total = nw.sum(masked) as number;
  masked.free();
  return total;
}

export async function fitKMeans(
  nw: NumWasm,
  points: KMeansPoint[],
  k: number,
  opts: KMeansOptions,
): Promise<KMeansStep[]> {
  const { iterations, seed = 1337, reportEvery = 1 } = opts;
  const n = points.length;
  const P = nw.array(points.map((p) => [p.x, p.y])); // (n,2)
  let C = initCentroids(nw, points, k, seed);
  const history: KMeansStep[] = [];
  try {
    for (let it = 1; it <= iterations; it++) {
      const D = squaredDistances(nw, P, C);
      const argmin = nw.argmin(D, { axis: 1 }) as NdArray;
      const G = oneHotAssignments(nw, argmin, k);
      const inertia = clusterInertia(nw, D, G);
      D.free();
      const Cnew = updateCentroids(nw, P, G);
      C.free();
      C = Cnew;
      const assignments = idxVec(argmin);
      argmin.free();
      G.free();
      const sizes = new Array(k).fill(0);
      for (let i = 0; i < n; i++) sizes[assignments[i]]++;
      if (it % reportEvery === 0 || it === iterations) {
        const cArr = C.toArray();
        const centroids: KMeansPoint[] = [];
        for (let j = 0; j < k; j++) centroids.push({ x: cArr[j * 2], y: cArr[j * 2 + 1] });
        const step: KMeansStep = { iteration: it, inertia, assignments, centroids, sizes };
        history.push(step);
        opts.onStep?.(step);
        await sleep(opts.delayMs ?? 0);
      }
    }
  } finally {
    P.free();
    C.free();
  }
  return history;
}