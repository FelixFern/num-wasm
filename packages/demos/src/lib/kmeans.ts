import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ~normal noise from num-wasm `random`: (sum of 8 uniforms) − 4.
export function gaussianField(nw: NumWasm, n: number, seed: number, scale = 1): number[] {
  const S = 8;
  const u = nw.random([n, S], seed);
  const sm = nw.sum(u, { axis: 1 }) as NdArray;
  u.free();
  const c = nw.addScalar(sm, -S / 2);
  sm.free();
  const out = nw.mulScalar(c, scale);
  c.free();
  const arr = out.toArray();
  out.free();
  return arr;
}

// Synthetic blob clusters. num-wasm has no trig ops, so blob centers sit on a
// deterministic ring (JS geometry); every random value — the blob noise — comes
// from num-wasm `random`, and a sum of uniforms approximates a normal for round
// blobs.
export function generateClusterData(
  nw: NumWasm,
  n: number,
  k: number,
  seed: number,
  spread = 0.032,
): KMeansPoint[] {
  const centers = Array.from({ length: k }, (_, j) => {
    const t = (j / k) * Math.PI * 2;
    return { x: 0.5 + 0.28 * Math.cos(t), y: 0.5 + 0.28 * Math.sin(t) };
  });

  const S = 8;
  const mkNoise = (s: number) => {
    const u = nw.random([n, S], seed + s);
    const sm = nw.sum(u, { axis: 1 }) as NdArray;
    u.free();
    const c = nw.addScalar(sm, -S / 2);
    sm.free();
    const out = nw.mulScalar(c, spread);
    c.free();
    return out;
  };

  const nx = mkNoise(1);
  const ny = mkNoise(2);
  const nxArr = nx.toArray();
  const nyArr = ny.toArray();
  nx.free();
  ny.free();

  const pts = new Array(n);
  for (let i = 0; i < n; i++) {
    const c = centers[i % k];
    pts[i] = { x: c.x + nxArr[i], y: c.y + nyArr[i] };
  }
  return pts;
}

// K-means++ init: centroids seeded far apart, all scoring in num-wasm
// (squaredDistances + min + random); the cumulative index walk is plain JS.
export function initCentroids(nw: NumWasm, points: KMeansPoint[], k: number, seed: number): NdArray {
  const n = points.length;
  const P = nw.array(points.map((p) => [p.x, p.y]));
  const rnd = (s: number) => {
    const u = nw.random([1], seed + s);
    const v = u.toArray()[0];
    u.free();
    return v;
  };
  const randIdx = (s: number) => Math.min(n - 1, Math.floor(rnd(s) * n));
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
    let r = rnd(d) * total;
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

// D[i][j] = ||p_i - c_j||^2 via  |p|^2 + |c|^2 - 2 p·c^T  (all num-wasm ops).
export function squaredDistances(nw: NumWasm, P: NdArray, C: NdArray): NdArray {
  const n = P.shape[0];
  const k = C.shape[0];
  const PP = nw.multiply(P, P);
  const pNorm = nw.sum(PP, { axis: 1 }) as NdArray;
  PP.free();
  const p2 = nw.reshape(pNorm, [n, 1]);
  pNorm.free();
  const CC = nw.multiply(C, C);
  const cNorm = nw.sum(CC, { axis: 1 }) as NdArray;
  CC.free();
  const c2 = nw.reshape(cNorm, [1, k]);
  cNorm.free();
  const CT = nw.transpose(C);
  const PC = nw.matmul(P, CT);
  CT.free();
  const twoPC = nw.mulScalar(PC, 2);
  PC.free();
  const s1 = nw.add(p2, c2);
  p2.free();
  c2.free();
  const D = nw.subtract(s1, twoPC);
  s1.free();
  twoPC.free();
  return D;
}

// One-hot membership matrix G (n,k) via broadcast `equal` against arange.
export function oneHotAssignments(nw: NumWasm, assignments: NdArray, k: number): NdArray {
  const n = assignments.shape[0];
  const aCol = nw.reshape(assignments, [n, 1]);
  const labels = nw.arange(0, k, 1);
  const lRow = nw.reshape(labels, [1, k]);
  labels.free();
  const G = nw.equal(aCol, lRow);
  aCol.free();
  lRow.free();
  return G;
}

// centroids = (G^T P) / colSums  — single matmul, no per-cluster loop.
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
      const assignments = argmin.toArray().map((v) => Math.round(v));
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
