import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";

export interface MonteStep {
  iteration: number;
  total: number;
  inside: number;
  estimate: number;
  error: number;
  points: { x: number; y: number; inside: number }[];
}

export interface MonteOptions {
  samples: number;
  batch: number;
  delayMs?: number;
  seed: number;
  onStep?: (s: MonteStep) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// π via hit-or-miss sampling in the unit square: π ≈ 4·inside/total.
export async function runMonteCarlo(nw: NumWasm, opts: MonteOptions): Promise<MonteStep[]> {
  const { samples, batch, delayMs = 0, seed } = opts;
  const steps: MonteStep[] = [];
  let total = 0;
  let inside = 0;
  let step = 0;
  for (let done = 0; done < samples; done += batch) {
    const b = Math.min(batch, samples - done);
    const u = nw.random([b, 2], seed + step);
    const sq = nw.multiply(u, u);
    const norm = nw.sum(sq, { axis: 1 }) as NdArray;
    sq.free();
    const inC = nw.lessScalar(norm, 1);
    norm.free();
    const uArr = u.toArray();
    const inArr = inC.toArray();
    u.free();
    inC.free();
    let cnt = 0;
    for (let i = 0; i < b; i++) cnt += inArr[i];
    total += b;
    inside += cnt;
    const estimate = (4 * inside) / total;
    const pts: { x: number; y: number; inside: number }[] = [];
    for (let i = 0; i < b; i++) pts.push({ x: uArr[i * 2], y: uArr[i * 2 + 1], inside: inArr[i] });
    const s: MonteStep = { iteration: total, total, inside, estimate, error: Math.abs(estimate - Math.PI), points: pts };
    steps.push(s);
    opts.onStep?.(s);
    await sleep(delayMs);
    step++;
  }
  return steps;
}
