import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";

export const SIZE = 28;
export const KERN = 3;

export interface KernelDef {
  name: string;
  kernel: number[][];
  desc: string;
}

export const KERNELS: KernelDef[] = [
  { name: "identity", kernel: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], desc: "no change" },
  { name: "box blur", kernel: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]], desc: "local average" },
  { name: "sharpen", kernel: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], desc: "boost contrast" },
  { name: "edge", kernel: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], desc: "laplacian" },
  { name: "sobel-x", kernel: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], desc: "horizontal gradient" },
  { name: "emboss", kernel: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], desc: "relief" },
];

export type PatternKind = "rings" | "diag" | "checker" | "noise";

export function generatePatternImage(nw: NumWasm, kind: PatternKind, seed: number): number[] {
  const W = SIZE;
  if (kind === "noise") {
    const r = nw.random([W * W], seed);
    const out = r.toArray().map((v) => Math.floor(v * 256));
    r.free();
    return out;
  }
  const img = new Array(W * W).fill(0);
  if (kind === "rings") {
    const c = W / 2;
    for (let r = 0; r < W; r++) {
      for (let c2 = 0; c2 < W; c2++) {
        const d = Math.hypot(r - c, c2 - c);
        img[r * W + c2] = d % 4 < 2 ? 220 : 30;
      }
    }
  } else if (kind === "diag") {
    for (let r = 0; r < W; r++) {
      for (let c2 = 0; c2 < W; c2++) img[r * W + c2] = (r + c2) % 6 < 3 ? 220 : 30;
    }
  } else {
    for (let r = 0; r < W; r++) {
      for (let c2 = 0; c2 < W; c2++) {
        img[r * W + c2] = (Math.floor(r / 4) + Math.floor(c2 / 4)) % 2 ? 30 : 220;
      }
    }
  }
  return img;
}

// Sliding 3×3 patches → single matmul against the flattened kernel.
export function convolve(nw: NumWasm, img: number[], kernel: number[][]): NdArray {
  const H = SIZE;
  const W = SIZE;
  const outH = H - KERN + 1;
  const outW = W - KERN + 1;
  const rows: number[][] = [];
  for (let r = 0; r < outH; r++) {
    for (let c = 0; c < outW; c++) {
      const row = new Array(KERN * KERN);
      let p = 0;
      for (let dr = 0; dr < KERN; dr++) {
        for (let dc = 0; dc < KERN; dc++) row[p++] = img[(r + dr) * W + c + dc];
      }
      rows.push(row);
    }
  }
  const P = nw.array(rows); // (outH*outW, 9)
  const K = nw.array(kernel.flat());
  const kCol = nw.reshape(K, [KERN * KERN, 1]);
  K.free();
  const out = nw.matmul(P, kCol); // (outH*outW, 1)
  P.free();
  kCol.free();
  return out;
}

// Min-max scale to [0,1] using num-wasm min/max.
export function normalizeImage(nw: NumWasm, flat: NdArray): number[] {
  const mn = nw.min(flat) as number;
  const mx = nw.max(flat) as number;
  const span = Math.max(mx - mn, 1e-9);
  const shifted = nw.addScalar(flat, -mn);
  const scaled = nw.mulScalar(shifted, 1 / span);
  shifted.free();
  const out = scaled.toArray();
  scaled.free();
  return out;
}
