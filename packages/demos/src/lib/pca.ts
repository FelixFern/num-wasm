import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";
import { gaussianField, sleep } from "./util";

export interface PcaStep {
  iteration: number;
  ratio: number;
  angle: number;
  vec: [number, number];
}

// Anisotropic 2D gaussian: elongated along x-ish, correlated.
export function generatePcaData(nw: NumWasm, n: number, seed: number, scale = 1.4): { x: number; y: number }[] {
  const nx = gaussianField(nw, n, seed + 1);
  const ny = gaussianField(nw, n, seed + 2);
  const pts = new Array(n);
  for (let i = 0; i < n; i++) {
    pts[i] = { x: nx[i] * scale, y: 0.35 * nx[i] + 0.85 * ny[i] };
  }
  return pts;
}

// Covariance = (P − μ)ᵀ(P − μ) / n, all num-wasm ops.
export function centerAndCov(nw: NumWasm, pts: { x: number; y: number }[]): NdArray {
  const n = pts.length;
  const P = nw.array(pts.map((p) => [p.x, p.y])); // (n,2)
  const mu = nw.mean(P, { axis: 0 }) as NdArray;
  const muRow = nw.reshape(mu, [1, 2]);
  mu.free();
  const C = nw.subtract(P, muRow); // (n,2)
  muRow.free();
  const CT = nw.transpose(C);
  const cov = nw.matmul(CT, C); // (2,2)
  const covN = nw.mulScalar(cov, 1 / n);
  cov.free();
  C.free();
  CT.free();
  P.free();
  return covN;
}

// Power iteration: v ← cov·v, normalized. λ = vᵀ(cov·v), ratio = λ/trace.
export async function powerIterate(
  nw: NumWasm,
  cov: NdArray,
  opts: { iterations: number; delayMs?: number; onStep?: (s: PcaStep) => void },
): Promise<PcaStep[]> {
  const { iterations, delayMs = 0 } = opts;
  let v = nw.random([2, 1], 1234); // (2,1)
  const covArr = cov.toArray();
  const trace = covArr[0] + covArr[3];
  const history: PcaStep[] = [];
  try {
    for (let i = 0; i < iterations; i++) {
      const Cv = nw.matmul(cov, v); // (2,1)
      const sq = nw.multiply(Cv, Cv);
      const norm = Math.sqrt(nw.sum(sq) as number);
      sq.free();
      const vnew = nw.mulScalar(Cv, 1 / Math.max(norm, 1e-12));
      Cv.free();
      v.free();
      v = vnew;
      const arr = v.toArray();
      const Cv2 = nw.matmul(cov, v);
      const fv = nw.flatten(v);
      const fc = nw.flatten(Cv2);
      const lam = nw.dot(fv, fc);
      fv.free();
      fc.free();
      Cv2.free();
      const angle = (Math.atan2(arr[1], arr[0]) * 180) / Math.PI;
      const step: PcaStep = { iteration: i + 1, ratio: Math.abs(lam) / trace, angle, vec: [arr[0], arr[1]] };
      history.push(step);
      opts.onStep?.(step);
      await sleep(delayMs);
    }
  } finally {
    v.free();
  }
  return history;
}
