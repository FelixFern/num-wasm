import type { NdArray, NumWasm } from "@felixfern/num-wasm/browser";
import { gaussianField, sleep } from "./util";

export type RegressionKind = "linear" | "logistic";

export interface RegressionData {
  x: number[];
  y: number[];
}

export interface RegressionStep {
  iteration: number;
  loss: number;
  w: number;
  b: number;
}

export interface RegressionOptions {
  iterations: number;
  alpha: number;
  reportEvery?: number;
  delayMs?: number;
  onStep?: (step: RegressionStep) => void;
}

// sigmoid(z) = 1 / (1 + e^-z) composed from num-wasm primitives.
function sigmoid(nw: NumWasm, z: NdArray, ones: NdArray): NdArray {
  const neg = nw.negate(z);
  const e = nw.exp(neg);
  neg.free();
  const denom = nw.addScalar(e, 1);
  e.free();
  const p = nw.divide(ones, denom);
  denom.free();
  return p;
}

// Synthetic data, randomness fully from num-wasm `random`.
export function generateRegressionData(
  nw: NumWasm,
  kind: RegressionKind,
  n: number,
  noise: number,
  seed: number,
): RegressionData {
  const xArr = nw.random([n], seed); // uniform in [0,1]
  let yArr: NdArray;
  if (kind === "linear") {
    // y = 2.5x − 1 + noise·N(0,1)
    const scaled = nw.array(gaussianField(nw, n, seed + 1, noise));
    const slope = nw.mulScalar(xArr, 2.5);
    const off = nw.addScalar(slope, -1);
    slope.free();
    yArr = nw.add(off, scaled);
    off.free();
    scaled.free();
  } else {
    // p = sigmoid(8(x − 0.5)); label = (u < p)
    const s4 = nw.mulScalar(xArr, 8);
    const center = nw.addScalar(s4, -4);
    s4.free();
    const ones = nw.ones([n]);
    const p = sigmoid(nw, center, ones);
    center.free();
    ones.free();
    const u = nw.random([n], seed + 1);
    const cmp = nw.less(u, p);
    u.free();
    p.free();
    yArr = cmp;
  }
  const out: RegressionData = { x: xArr.toArray(), y: yArr.toArray() };
  xArr.free();
  yArr.free();
  return out;
}

// Batch gradient descent, entirely num-wasm ops.
export async function trainRegression(
  nw: NumWasm,
  kind: RegressionKind,
  data: RegressionData,
  opts: RegressionOptions,
): Promise<RegressionStep[]> {
  const { iterations, alpha, delayMs = 0 } = opts;
  const n = data.x.length;
  const invN = 1 / n;
  const reportEvery = opts.reportEvery ?? (delayMs > 0 ? 1 : Math.max(1, Math.round(iterations / 80)));
  let w = 0;
  let b = 0;
  const xArr = nw.array(data.x);
  const yArr = nw.array(data.y);
  const ones = nw.full([n], 1);
  const history: RegressionStep[] = [];
  const lrAt = (i: number) => alpha * (1 - (0.9 * i) / iterations);
  try {
    for (let i = 0; i < iterations; i++) {
      const wx = nw.mulScalar(xArr, w);
      const z = nw.addScalar(wx, b);
      wx.free();
      let pred: NdArray;
      if (kind === "linear") {
        pred = z;
      } else {
        pred = sigmoid(nw, z, ones);
        z.free();
      }

      const err = nw.subtract(pred, yArr);
      let loss: number;
      if (kind === "linear") {
        const e2 = nw.multiply(err, err);
        loss = (nw.sum(e2) as number) * invN;
        e2.free();
      } else {
        const eps = 1e-9;
        const cl = nw.maximumScalar(nw.minimumScalar(pred, 1 - eps), eps);
        const logA = nw.log(cl);
        const neg = nw.addScalar(cl, -1);
        const oneMinus = nw.negate(neg);
        neg.free();
        const logB = nw.log(oneMinus);
        oneMinus.free();
        const ta = nw.multiply(yArr, logA);
        const invY = nw.subtract(ones, yArr);
        const tb = nw.multiply(invY, logB);
        invY.free();
        const term = nw.add(ta, tb);
        ta.free();
        tb.free();
        loss = -(nw.sum(term) as number) * invN;
        term.free();
        logA.free();
        logB.free();
        cl.free();
      }

      const gradW = (nw.dot(err, xArr) as number) * invN;
      const gradB = (nw.sum(err) as number) * invN;
      err.free();
      if (kind === "linear") z.free();

      const lr = lrAt(i);
      w -= lr * gradW;
      b -= lr * gradB;

      if ((i + 1) % reportEvery === 0 || i === iterations - 1) {
        const step: RegressionStep = { iteration: i + 1, loss, w, b };
        history.push(step);
        opts.onStep?.(step);
        await sleep(delayMs);
      }
    }
  } finally {
    xArr.free();
    yArr.free();
    ones.free();
  }
  return history;
}

// Fitted curve over [0,1] for the plot, computed with num-wasm ops.
export function regressionCurve(
  nw: NumWasm,
  kind: RegressionKind,
  w: number,
  b: number,
  samples = 80,
): { x: number; y: number }[] {
  const xs = nw.linspace(0, 1, samples);
  const xa = xs.toArray();
  const wx = nw.mulScalar(xs, w);
  const z = nw.addScalar(wx, b);
  wx.free();
  let yArr: NdArray;
  if (kind === "linear") {
    yArr = z;
  } else {
    const ones = nw.ones([samples]);
    yArr = sigmoid(nw, z, ones);
    z.free();
    ones.free();
  }
  const ya = yArr.toArray();
  xs.free();
  yArr.free();
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < samples; i++) pts.push({ x: xa[i], y: ya[i] });
  return pts;
}

// Hard labels for logistic via num-wasm sigmoid + compare.
export function predictLabels(nw: NumWasm, x: number[], w: number, b: number): number[] {
  const n = x.length;
  const xArr = nw.array(x);
  const wx = nw.mulScalar(xArr, w);
  const z = nw.addScalar(wx, b);
  wx.free();
  const ones = nw.ones([n]);
  const p = sigmoid(nw, z, ones);
  z.free();
  ones.free();
  const pred = nw.greaterScalar(p, 0.5);
  p.free();
  const out = pred.toArray();
  pred.free();
  xArr.free();
  return out;
}