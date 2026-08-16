import { NumWasm } from "@felixfern/num-wasm/browser";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Dataset } from "./lib/data";
import { parseGridCsv, summarize } from "./lib/data";
import type { Model, ModelData, TrainReport } from "./lib/mlp";
import { freeModel, modelFromArrays, modelToData, predictSample } from "./lib/mlp";
import { NetworkViz } from "./NetworkViz";
import { Sparkline } from "./components/Sparkline";

type Status = "idle" | "training" | "done";

function TestThumb({ grid }: { grid: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 28, 28);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, 28, 28);
    for (let i = 0; i < 784; i++) {
      const v = grid[i];
      if (v <= 0) continue;
      ctx.fillStyle = `rgba(24,24,27,${Math.min(1, v / 255)})`;
      ctx.fillRect(i % 28, Math.floor(i / 28), 1, 1);
    }
  }, [grid]);
  return <canvas ref={ref} width={28} height={28} className="thumb" />;
}

function DrawPad({
  onGrid,
  onPredict,
  canPredict,
}: {
  onGrid: (grid: number[]) => void;
  onPredict: (grid: number[]) => void;
  canPredict: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const pad = padRef.current;
    const canvas = canvasRef.current;
    if (!pad || !canvas) return;
    const fit = () => {
      const size = Math.max(80, Math.min(pad.clientWidth, pad.clientHeight - 46));
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(pad);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 280,
      y: ((e.clientY - rect.top) / rect.height) * 280,
    };
  };

  const strokeTo = (e: React.PointerEvent) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    if (last.current) {
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    }
    last.current = p;
  };

  const clear = () => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 280, 280);
    onGrid(new Array(784).fill(0));
  };

  const readGrid = () => {
    const canvas = canvasRef.current!;
    const tmp = document.createElement("canvas");
    tmp.width = 28;
    tmp.height = 28;
    const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
    tctx.drawImage(canvas, 0, 0, 28, 28);
    const data = tctx.getImageData(0, 0, 28, 28).data;
    let grid = new Array(784);
    for (let i = 0; i < 784; i++) grid[i] = 255 - data[i * 4];

    // normalize MNIST-style: center of mass → center, scale to fit 20px box
    let sum = 0, sumR = 0, sumC = 0, minR = 28, maxR = -1, minC = 28, maxC = -1;
    for (let i = 0; i < 784; i++) {
      const v = grid[i];
      if (v <= 0) continue;
      const r = Math.floor(i / 28);
      const c = i % 28;
      sum += v;
      sumR += v * r;
      sumC += v * c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }
    if (sum > 0) {
      const cy = sumR / sum;
      const cx = sumC / sum;
      const bboxH = maxR - minR + 1;
      const bboxW = maxC - minC + 1;
      const scale = Math.min(20 / bboxH, 20 / bboxW);
      const offR = Math.round(14 - cy * scale);
      const offC = Math.round(14 - cx * scale);
      const out = new Array(784).fill(0);
      for (let r = 0; r < 28; r++) {
        for (let c = 0; c < 28; c++) {
          const sr = Math.round((r - offR) / scale);
          const sc = Math.round((c - offC) / scale);
          if (sr >= 0 && sr < 28 && sc >= 0 && sc < 28) out[r * 28 + c] = grid[sr * 28 + sc];
        }
      }
      grid = out;
    }

    // light dilation: extend each ink cell to orthogonal neighbors (plus-shape)
    const src = grid.slice();
    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = 0; i < 784; i++) {
      if (src[i] <= 0) continue;
      const r = Math.floor(i / 28);
      const c = i % 28;
      for (const [dr, dc] of neighbors) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 28 && nc >= 0 && nc < 28) grid[nr * 28 + nc] = 255;
      }
    }
    onGrid(grid);
    return grid;
  };

  return (
    <div className="drawpad" ref={padRef}>
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="draw-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = null;
          strokeTo(e);
        }}
        onPointerMove={(e) => {
          if (drawing.current) strokeTo(e);
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <div className="draw-actions">
        <button className="btn ghost" onClick={clear}>Clear</button>
        <button className="btn" onClick={() => onPredict(readGrid())} disabled={!canPredict}>Predict</button>
      </div>
    </div>
  );
}

export function HandwrittenDemo({
  nw,
  initError,
  isDark,
}: {
  nw: NumWasm | null;
  initError: string | null;
  isDark: boolean;
}) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<TrainReport | null>(null);
  const [history, setHistory] = useState<TrainReport[]>([]);
  const [grid, setGrid] = useState<number[]>(() => new Array(784).fill(0));
  const [net, setNet] = useState<{
    layers: number[][] | null;
    output: number[] | null;
    movement: number[] | null;
    predicted: number | null;
  } | null>(null);
  const [wFlats, setWFlats] = useState<number[][] | null>(null);
  const [bFlats, setBFlats] = useState<number[][] | null>(null);
  const [testSamples, setTestSamples] = useState<{ grid: number[]; label: number }[] | null>(null);
  const [testTrue, setTestTrue] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<{
    label: number;
    probs: number[];
  } | null>(null);
  const [cfg, setCfg] = useState({ iterations: 600, alpha: 0.2, seed: 42, hidden: "64,32,16", batchSize: 256 });
  const [netGrid, setNetGrid] = useState<number[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/mnist_test.csv")
      .then((r) => r.text())
      .then((text) => {
        const ds = parseGridCsv(text);
        setTestSamples(ds.x.map((grid, i) => ({ grid, label: ds.y[i] })));
      })
      .catch((err: Error) => console.error("failed to load test samples:", err.message));
  }, []);

  useEffect(() => {
    fetch("/dataset.csv")
      .then((r) => {
        if (!r.ok) throw new Error(`dataset.csv ${r.status}`);
        return r.text();
      })
      .then((text) => setDataset(parseGridCsv(text)))
      .catch((err: Error) => console.error("failed to load default dataset:", err.message));
  }, []);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!nw) return;
    const worker = new Worker(new URL("./trainWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as {
        type: string;
        report?: TrainReport;
        weights?: { Ws: number[][]; bs: number[][] };
        inputSize?: number;
        hidden?: number[];
      };
      if (msg.type === "progress" && msg.report) {
        setProgress(msg.report);
        setHistory((h) => [...h, msg.report as TrainReport]);
        setNet({ layers: msg.report.layers, output: msg.report.output, movement: msg.report.movement, predicted: null });
      } else if (msg.type === "done" && msg.weights) {
        const hidden = msg.hidden ?? [32];
        const fresh = modelFromArrays(nw, msg.inputSize ?? 784, hidden, 10, msg.weights);
        setModel(fresh);
        setWFlats(fresh.Ws.map((w) => w.toArray()));
        setBFlats(fresh.bs.map((b) => b.toArray()));
        setStatus("done");
        try {
          localStorage.setItem("numwasm-model", JSON.stringify(modelToData(fresh)));
        } catch {
          // storage full — ignore
        }
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [nw]);

  useEffect(() => {
    if (!nw) return;
    const raw = localStorage.getItem("numwasm-model");
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as ModelData;
      const fresh = modelFromArrays(nw, data.inputSize, data.hidden, data.classes, data);
      setModel(fresh);
      setWFlats(fresh.Ws.map((w) => w.toArray()));
      setBFlats(fresh.bs.map((b) => b.toArray()));
      setStatus("done");
    } catch {
      localStorage.removeItem("numwasm-model");
    }
  }, [nw]);

  const load = (ds: Dataset) => {
    if (model) {
      freeModel(model);
      setModel(null);
    }
    setPrediction(null);
    setHistory([]);
    setProgress(null);
    setStatus("idle");
    setNet(null);
    setWFlats(null);
    setBFlats(null);
    setTestTrue(null);
    setNetGrid(null);
    setDataset(ds);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    load(parseGridCsv(text));
  };

  const startTraining = async () => {
    if (!nw || !dataset || !workerRef.current) return;
    if (model) freeModel(model);
    setNetGrid(dataset.x[0] ?? null);
    setModel(null);
    setStatus("training");
    setHistory([]);
    setProgress(null);
    setPrediction(null);
    setTestTrue(null);
    workerRef.current.postMessage({
      type: "train",
      dataset,
      options: {
        iterations: cfg.iterations,
        alpha: cfg.alpha,
        seed: cfg.seed,
        hidden: parseHidden(),
        batchSize: cfg.batchSize,
        valFraction: 0.15,
      },
    });
  };

  const parseHidden = (): number[] =>
    cfg.hidden.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0);
  const hiddenSizes = parseHidden();
  const paramCount =
    784 * (hiddenSizes[0] ?? 0) +
    hiddenSizes.reduce((acc, h, i) => acc + h * (hiddenSizes[i + 1] ?? 10) + h, 0);

  const last = history.length > 0 ? history[history.length - 1] : null;
  const lastAcc = last?.accuracy ?? null;
  const lastLoss = last?.loss ?? null;
  const classes = dataset ? summarize(dataset).classes : [0, 1, 2];

  const downloadModel = () => {
    if (!model) return;
    const blob = new Blob([JSON.stringify(modelToData(model))], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "numwasm-model.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadModelFile = async (file: File) => {
    if (!nw) return;
    try {
      const data = JSON.parse(await file.text()) as ModelData;
      const fresh = modelFromArrays(nw, data.inputSize, data.hidden, data.classes, data);
      if (model) freeModel(model);
      setModel(fresh);
      setWFlats(fresh.Ws.map((w) => w.toArray()));
      setBFlats(fresh.bs.map((b) => b.toArray()));
      setStatus("done");
      localStorage.setItem("numwasm-model", JSON.stringify(modelToData(fresh)));
    } catch {
      setFileError("invalid model file");
    }
  };

  const handleTestSample = async (idx: number) => {
    if (!model || status !== "done" || !testSamples) return;
    const s = testSamples[idx];
    const pred = await predictSample(model, s.grid);
    setPrediction(pred);
    setNetGrid(s.grid);
    setNet({ layers: pred.layers, output: pred.probs, movement: null, predicted: pred.label });
    setTestTrue(s.label);
  };

  const handlePredict = async (g: number[]) => {
    if (!model || status !== "done") return;
    setTestTrue(null);
    const pred = await predictSample(model, g);
    setPrediction(pred);
    setNetGrid(g);
    setNet({ layers: pred.layers, output: pred.probs, movement: null, predicted: pred.label });
  };

  return (
    <div className="notebook">
      {initError && (
        <div className="stamp error">init failed: {initError}</div>
      )}
      {fileError && (
        <div className="stamp error">{fileError}</div>
      )}

      <section className="sheet train-sheet">
        <label className="btn file-btn" title="import CSV">
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
        <label className="cfg">
          <span>iterations</span>
          <input
            className="field num"
            type="number"
            min={1}
            value={cfg.iterations}
            onChange={(e) => setCfg({ ...cfg, iterations: +e.target.value })}
          />
        </label>
        <label className="cfg">
          <span>alpha</span>
          <input
            className="field num"
            type="number"
            step={0.01}
            min={0.001}
            value={cfg.alpha}
            onChange={(e) => setCfg({ ...cfg, alpha: +e.target.value })}
          />
        </label>
        <label className="cfg">
          <span>hidden</span>
          <input
            className="field hidden-in"
            type="text"
            placeholder="64,32,16"
            value={cfg.hidden}
            onChange={(e) => setCfg({ ...cfg, hidden: e.target.value })}
          />
        </label>
        <label className="cfg">
          <span>batch</span>
          <input
            className="field num"
            type="number"
            min={16}
            value={cfg.batchSize}
            onChange={(e) => setCfg({ ...cfg, batchSize: +e.target.value })}
          />
        </label>
        <button
          className="btn train-btn"
          disabled={!nw || !dataset || status === "training"}
          onClick={() => void startTraining()}
        >
          {status === "training" ? "Training…" : "Train MLP"}
        </button>
        {status === "done" && (
          <div className="train-actions">
            <div className="btn-group">
              <button className="btn ghost" onClick={downloadModel}>Save</button>
              <label className="btn ghost file-btn">
                Load
                <input
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void loadModelFile(f);
                  }}
                />
              </label>
            </div>
            {lastAcc !== null && (
              <span className="stat">
                converged <b>{(lastAcc * 100).toFixed(1)}%</b> · loss <b>{lastLoss?.toFixed(4)}</b>
              </span>
            )}
          </div>
        )}
      </section>

      <section className={"sheet predict-sheet" + (model ? "" : " is-disabled")}>
        <h2 className="sheet-title">Predict</h2>
        {!model && <p className="disabled-hint">train a model first</p>}
        <DrawPad
          onGrid={setGrid}
          canPredict={!!model && status === "done"}
          onPredict={(g) => {
            setGrid(g);
            void handlePredict(g);
          }}
        />
      </section>

      <aside className={"sheet result-sheet" + (model ? "" : " is-disabled")}>
        <h2 className="sheet-title">Reading</h2>
        {prediction ? (
          <>
            <div className="reading">
              <span className="big-digit">{prediction.label}</span>
              {testTrue !== null && (
                <span className={"truth-chip" + (testTrue === prediction.label ? " ok" : " bad")}>
                  true {testTrue} · {testTrue === prediction.label ? "correct" : "wrong"}
                </span>
              )}
            </div>
            <div className="bars">
              {prediction.probs.map((p, i) => (
                <div className="bar-row" key={i}>
                  <span className="bar-label">{i}</span>
                  <div className="bar-track">
                    <div
                      className={"bar-fill" + (i === prediction.label ? " top" : "")}
                      style={{ width: `${Math.max(1, p * 100)}%` }}
                    />
                  </div>
                  <span className="bar-val">{(p * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">
            Train a model, draw a digit, press predict. The 28×28 grid is
            fed to the net as 784 inputs.
          </p>
        )}
        {testSamples && (
          <div className="test-strip" aria-label="test samples">
            {testSamples.map((s, i) => (
              <button
                key={i}
                className="thumb-btn"
                title={`label ${s.label}`}
                onClick={() => void handleTestSample(i)}
              >
                <TestThumb grid={s.grid} />
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="sheet monitor-sheet">
        <h2 className="sheet-title">Monitor</h2>
        <div className="status-line">
          <span>{progress ? `iter ${progress.iteration}` : "idle"}</span>
          <span>lr {cfg.alpha.toFixed(2)}</span>
          <span className="accent">
            {progress ? `acc ${(progress.accuracy * 100).toFixed(1)}%` : "—"}
          </span>
        </div>
        <div className="chart-block">
          <span className="chart-label">accuracy</span>
          <Sparkline points={history.map((r) => r.accuracy)} />
        </div>
        <div className="chart-block">
          <span className="chart-label loss">cross-entropy loss</span>
          <Sparkline points={history.map((r) => r.loss)} strokeClass="spark-line loss" dotClass="spark-dot loss" />
        </div>
        <div className="log" aria-label="training log">
          {history.slice(-60).map((r) => (
            <div className="log-line" key={r.iteration}>
              <span>#{r.iteration}</span>
              <span>acc {(r.accuracy * 100).toFixed(1)}%</span>
              <span>loss {r.loss.toFixed(4)}</span>
              <span>lr {cfg.alpha.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <p className="meta-line">
          params {paramCount.toLocaleString()}
          {lastAcc !== null && (
            <span> · train <span className="accent">{(lastAcc * 100).toFixed(1)}%</span></span>
          )}
        </p>
      </section>

      <section className="sheet net-sheet">
        <NetworkViz
          grid={netGrid ?? grid}
          layers={net?.layers ?? null}
          output={net?.output ?? null}
          movement={net?.movement ?? null}
          weights={wFlats}
          biases={bFlats}
          labels={classes.length <= 10 ? classes : classes.slice(0, 10)}
          predicted={net?.predicted ?? null}
          dark={isDark}
        />
      </section>
    </div>
  );
}
