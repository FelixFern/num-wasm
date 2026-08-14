import type { NumWasm, NdArray } from "num-wasm/browser";
import type { Dataset } from "./data";

export interface Model {
  nw: NumWasm;
  Ws: NdArray[];
  bs: NdArray[];
  inputSize: number;
  hidden: number[];
  classes: number;
}

export interface TrainOptions {
  iterations: number;
  alpha: number;
  seed: number;
  reportEvery: number;
  batchSize?: number;
  valFraction?: number;
  onProgress?: (info: TrainReport) => void;
}

export interface TrainReport {
  iteration: number;
  accuracy: number;
  loss: number;
  movement: number[];
  layers: number[][];
  output: number[];
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export function initModel(
  nw: NumWasm,
  inputSize: number,
  hidden: number[],
  classes: number,
  seed: number,
): Model {
  const bound = (fanIn: number, fanOut: number) => Math.sqrt(6 / (fanIn + fanOut));

  const randWeight = (shape: number[], fanIn: number, fanOut: number) => {
    const r = nw.random(shape, seed++);
    const centered = nw.addScalar(r, -0.5);
    r.free();
    const scaled = nw.mulScalar(centered, 2 * bound(fanIn, fanOut));
    centered.free();
    return scaled;
  };

  const sizes = [inputSize, ...hidden, classes];
  const Ws: NdArray[] = [];
  const bs: NdArray[] = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    Ws.push(randWeight([sizes[l + 1], sizes[l]], sizes[l], sizes[l + 1]));
    bs.push(nw.zeros([sizes[l + 1], 1]));
  }

  return { nw, Ws, bs, inputSize, hidden, classes };
}

export function freeModel(model: Model): void {
  for (const w of model.Ws) w.free();
  for (const b of model.bs) b.free();
}

export interface ModelWeights {
  Ws: number[][];
  bs: number[][];
}

export interface ModelData {
  inputSize: number;
  hidden: number[];
  classes: number;
  Ws: number[][];
  bs: number[][];
}

export function modelToData(model: Model): ModelData {
  return {
    inputSize: model.inputSize,
    hidden: model.hidden,
    classes: model.classes,
    Ws: model.Ws.map((w) => w.toArray()),
    bs: model.bs.map((b) => b.toArray()),
  };
}

export function modelFromArrays(
  nw: NumWasm,
  inputSize: number,
  hidden: number[],
  classes: number,
  w: ModelWeights,
): Model {
  const sizes = [inputSize, ...hidden, classes];
  const Ws = w.Ws.map((flat, l) => nw.reshape(nw.array(flat), [sizes[l + 1], sizes[l]]));
  const bs = w.bs.map((flat, l) => nw.reshape(nw.array(flat), [sizes[l + 1], 1]));
  return { nw, Ws, bs, inputSize, hidden, classes };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildX(nw: NumWasm, ds: Dataset, idxs: number[]): NdArray {
  const m = idxs.length;
  const input = ds.x[0].length;
  const rows = Array.from({ length: input }, (_, i) =>
    Array.from({ length: m }, (_, s) => ds.x[idxs[s]][i] / 255),
  );
  return nw.array(rows); // (input, m)
}

function buildOneHot(nw: NumWasm, ds: Dataset, idxs: number[], classes: number): NdArray {
  const m = idxs.length;
  const y = idxs.map((i) => ds.y[i]);
  const yCol = nw.reshape(nw.array(y), [m, 1]);
  const labels = nw.arange(0, classes, 1);
  const eq = nw.equal(yCol, labels);
  const oh = nw.transpose(eq); // (classes, m)
  yCol.free();
  labels.free();
  eq.free();
  return oh;
}

interface Forward {
  Zs: NdArray[];
  As: NdArray[];
}

function forward(nw: NumWasm, model: Model, X: NdArray): Forward {
  const L = model.Ws.length;
  const Zs: NdArray[] = [];
  const As: NdArray[] = [];
  let A = X;

  for (let l = 0; l < L; l++) {
    const WA = nw.matmul(model.Ws[l], A);
    const Z = nw.add(WA, model.bs[l]);
    WA.free();
    Zs.push(Z);
    if (l < L - 1) {
      A = nw.maximumScalar(Z, 0);
    } else {
      const expZ = nw.exp(Z);
      const colSum = nw.sum(expZ, { axis: 0 }) as NdArray;
      A = nw.divide(expZ, colSum);
      expZ.free();
      colSum.free();
    }
    As.push(A);
  }

  return { Zs, As };
}

function freeForward(f: Forward): void {
  for (const z of f.Zs) z.free();
  for (const a of f.As) a.free();
}

export async function trainModel(
  model: Model,
  ds: Dataset,
  opts: TrainOptions,
): Promise<TrainReport[]> {
  const nw = model.nw;
  const { iterations, alpha, seed, reportEvery, batchSize = 256, valFraction = 0.15 } = opts;
  const n = ds.y.length;
  const nVal = Math.max(1, Math.round(n * valFraction));

  // deterministic train/val split
  const order = Array.from({ length: n }, (_, i) => i);
  const rng = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const valIdx = order.slice(0, nVal);
  const trainIdx = order.slice(nVal);
  const nTrain = trainIdx.length;

  // validation set (evaluated at report points)
  const Xval = buildX(nw, ds, valIdx); // (input, nVal)
  const Yval = buildOneHot(nw, ds, valIdx, model.classes);
  const yValArr = nw.array(valIdx.map((i) => ds.y[i]));

  const L = model.Ws.length;
  const lrAt = (i: number) => alpha * (1 - (0.9 * i) / iterations);
  const history: TrainReport[] = [];

  try {
    for (let i = 0; i < iterations; i++) {
      // sample a random batch (with replacement)
      const batch: number[] = new Array(batchSize);
      for (let b = 0; b < batchSize; b++) batch[b] = trainIdx[Math.floor(rng() * nTrain)];
      const X = buildX(nw, ds, batch); // (input, batch)
      const Y = buildOneHot(nw, ds, batch, model.classes);
      const m = batch.length;
      const invM = 1 / m;

      // forward
      const f = forward(nw, model, X);

      // backward
      let dZ = nw.subtract(f.As[L - 1], Y);
      const dWs: NdArray[] = new Array(L);
      const dbs: number[] = new Array(L);
      const ATs: NdArray[] = new Array(L);
      for (let l = L - 1; l >= 0; l--) {
        const src = l === 0 ? X : f.As[l - 1];
        const AT = nw.transpose(src);
        ATs[l] = AT;
        const dZAT = nw.matmul(dZ, AT);
        dWs[l] = nw.mulScalar(dZAT, invM);
        dZAT.free();
        dbs[l] = (nw.sum(dZ) as number) * invM;
        if (l > 0) {
          const WT = nw.transpose(model.Ws[l]);
          const WTdZ = nw.matmul(WT, dZ);
          const reluDeriv = nw.greaterScalar(f.Zs[l - 1], 0);
          const dZPrev = nw.multiply(WTdZ, reluDeriv);
          WTdZ.free();
          dZ.free();
          dZ = dZPrev;
        }
      }

      // updates (copy-based: build new arrays, free old)
      const lr = lrAt(i);
      for (let l = 0; l < L; l++) {
        const scaledW = nw.mulScalar(dWs[l], lr);
        const Wnew = nw.subtract(model.Ws[l], scaledW);
        scaledW.free();
        model.Ws[l].free();
        model.Ws[l] = Wnew;
        const bnew = nw.addScalar(model.bs[l], -lr * dbs[l]);
        model.bs[l].free();
        model.bs[l] = bnew;
      }

      // report (validation accuracy + loss)
      if (i % reportEvery === 0 || i === iterations - 1) {
        const fv = forward(nw, model, Xval);
        const outV = fv.As[L - 1];
        const preds = nw.argmax(outV, { axis: 0 }) as NdArray;
        const eqArr = nw.equal(preds, yValArr);
        const correct = nw.sum(eqArr) as number;
        const accuracy = correct / nVal;
        eqArr.free();
        preds.free();

        const logA = nw.log(outV);
        const lossArr = nw.multiply(Yval, logA);
        const loss = -(nw.sum(lossArr) as number) / nVal;
        logA.free();
        lossArr.free();
        freeForward(fv);

        const layers: number[][] = [];
        for (let l = 0; l < L - 1; l++) {
          const arr = f.As[l].toArray();
          const col = new Array(model.hidden[l]);
          for (let j = 0; j < model.hidden[l]; j++) col[j] = arr[j * m];
          layers.push(col);
        }
        const dW0 = dWs[0].toArray();
        const movement = new Array(model.hidden[0]);
        for (let j = 0; j < model.hidden[0]; j++) {
          let norm = 0;
          for (let k = 0; k < model.inputSize; k++) norm += Math.abs(dW0[j * model.inputSize + k]);
          movement[j] = norm;
        }
        const outArr = f.As[L - 1].toArray();
        const output = new Array(model.classes);
        for (let k = 0; k < model.classes; k++) output[k] = outArr[k * m];

        const report: TrainReport = { iteration: i + 1, accuracy, loss, movement, layers, output };
        history.push(report);
        opts.onProgress?.(report);
        await tick();
      }

      // free intermediates
      for (const dW of dWs) dW.free();
      for (const at of ATs) at.free();
      dZ.free();
      freeForward(f);
      X.free();
      Y.free();
    }
  } finally {
    Xval.free();
    Yval.free();
    yValArr.free();
  }

  return history;
}

export interface Prediction {
  label: number;
  probs: number[];
  layers: number[][];
}

export async function predictSample(model: Model, grid: number[]): Promise<Prediction> {
  const nw = model.nw;
  const input = nw.array(grid.map((v) => v / 255));
  const X = nw.reshape(input, [model.inputSize, 1]);
  input.free();

  const f = forward(nw, model, X);
  const probs = f.As[f.As.length - 1].toArray();
  const layers = f.As.slice(0, -1).map((a) => a.toArray());
  freeForward(f);
  X.free();

  let best = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) best = i;
  }
  return { label: best, probs, layers };
}
