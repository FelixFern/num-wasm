import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One num-wasm draw, read back as a plain number.
export function randomScalar(nw: NumWasm, seed: number): number {
  const u = nw.random([1], seed);
  const v = u.toArray()[0];
  u.free();
  return v;
}

// Read an index-valued array (argmin/argmax output) back as ints.
export function idxVec(v: NdArray): number[] {
  return v.toArray().map((x) => Math.round(x));
}

// Approximate standard-normal noise via the sum of S uniforms minus S/2
// (a crude 12-point Irwin–Hall). num-wasm's `random` is uniform, and there is
// no trig, so Box–Muller is off the table. Deterministic per seed.
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

// Deterministic ring of k centers — num-wasm has no trig, so the geometry is JS.
export function ringCenters(
  k: number,
  r = 0.28,
  cx = 0.5,
  cy = 0.5,
): { x: number; y: number }[] {
  return Array.from({ length: k }, (_, j) => {
    const t = (j / k) * Math.PI * 2;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  });
}

export interface BlobPoint {
  x: number;
  y: number;
  label: number;
}

// Noise around fixed centers; point i belongs to center i % k (round-robin).
export function generateBlobs(
  nw: NumWasm,
  n: number,
  centers: { x: number; y: number }[],
  seed: number,
  spread = 0.032,
): BlobPoint[] {
  const k = centers.length;
  const nx = gaussianField(nw, n, seed + 1, spread);
  const ny = gaussianField(nw, n, seed + 2, spread);
  const pts: BlobPoint[] = [];
  for (let i = 0; i < n; i++) {
    const c = centers[i % k];
    pts.push({ x: c.x + nx[i], y: c.y + ny[i], label: i % k });
  }
  return pts;
}

export function generateRingBlobs(
  nw: NumWasm,
  n: number,
  k: number,
  seed: number,
  spread = 0.032,
): BlobPoint[] {
  return generateBlobs(nw, n, ringCenters(k), seed, spread);
}

// k well-separated random centers in the unit square, rejection-sampled with
// num-wasm `random`. Deterministic per seed — Regenerate bumps the seed.
export function randomBlobCenters(
  nw: NumWasm,
  k: number,
  seed: number,
  opts?: { margin?: number; minDist?: number },
): { x: number; y: number }[] {
  const margin = opts?.margin ?? 0.15;
  const minDist = opts?.minDist ?? 0.3;
  const lo = margin;
  const hi = 1 - margin;
  const centers: { x: number; y: number }[] = [];
  const tooClose = (c: { x: number; y: number }) =>
    centers.some((o) => (o.x - c.x) ** 2 + (o.y - c.y) ** 2 < minDist * minDist);
  let tries = 0;
  const maxTries = 800;
  while (centers.length < k && tries < maxTries) {
    const x = lo + randomScalar(nw, seed + 1 + tries * 2) * (hi - lo);
    const y = lo + randomScalar(nw, seed + 2 + tries * 2) * (hi - lo);
    tries++;
    if (!tooClose({ x, y })) centers.push({ x, y });
  }
  // fallback (rare): finish on a small inner ring so k is always satisfied
  while (centers.length < k) {
    const t = (centers.length / k) * Math.PI * 2;
    centers.push({ x: 0.5 + (minDist / 2) * Math.cos(t), y: 0.5 + (minDist / 2) * Math.sin(t) });
  }
  return centers;
}

// D[i][j] = ||p_i - c_j||² via the  |p|² + |c|² − 2·p·Cᵀ  expansion.
// All num-wasm ops: multiply/sum for the norms, one matmul for the cross term.
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

// One-hot rows from an index column:  G[i][j] = (a[i] == j),  via broadcast equal.
export function oneHotFromIdx(nw: NumWasm, idx: NdArray, columns: number): NdArray {
  const rows = idx.shape[0];
  const col = nw.reshape(idx, [rows, 1]);
  const labels = nw.arange(0, columns, 1);
  const row = nw.reshape(labels, [1, columns]);
  labels.free();
  const G = nw.equal(col, row);
  col.free();
  row.free();
  return G;
}