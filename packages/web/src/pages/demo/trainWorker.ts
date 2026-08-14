import { NumWasm } from "num-wasm/browser";
import { freeModel, initModel, trainModel } from "./lib/mlp";
import type { Dataset } from "./lib/data";
import type { TrainReport } from "./lib/mlp";

const ctx = self as unknown as {
  postMessage: (msg: unknown) => void;
};

interface TrainMsg {
  type: "train";
  wasmUrl: string;
  dataset: Dataset;
  options: {
    iterations: number;
    alpha: number;
    seed: number;
    hidden: number[];
    batchSize: number;
    valFraction: number;
  };
}

self.onmessage = async (e: MessageEvent<TrainMsg>) => {
  const msg = e.data;
  if (msg.type !== "train") return;

  const nw = await NumWasm.initFromUrl(msg.wasmUrl);
  const model = initModel(nw, msg.dataset.x[0]?.length ?? 784, msg.options.hidden, 10, msg.options.seed);

  const history = await trainModel(model, msg.dataset, {
    iterations: msg.options.iterations,
    alpha: msg.options.alpha,
    seed: msg.options.seed,
    reportEvery: Math.max(1, Math.round(msg.options.iterations / 40)),
    batchSize: msg.options.batchSize,
    valFraction: msg.options.valFraction,
    onProgress: (report: TrainReport) => {
      ctx.postMessage({ type: "progress", report });
    },
  });

  const weights = {
    Ws: model.Ws.map((w) => w.toArray()),
    bs: model.bs.map((b) => b.toArray()),
  };
  const dims = { inputSize: model.inputSize, hidden: model.hidden };
  freeModel(model);

  ctx.postMessage({ type: "done", history, weights, ...dims });
};
