import { useEffect, useMemo, useRef, useState } from "react";
import type { NumWasm } from "@felixfern/num-wasm/browser";
import { Sparkline } from "./components/Sparkline";
import { usePlotSize } from "./components/usePlotSize";
import type { RegressionData, RegressionKind, RegressionStep } from "./lib/regression";
import {
  generateRegressionData,
  regressionCurve,
  trainRegression,
} from "./lib/regression";

const PAD = 20;
const ALPHA_DEFAULT: Record<RegressionKind, number> = { linear: 0.5, logistic: 2.0 };
const SPEEDS = [
  { label: "fast", ms: 0 },
  { label: "slow", ms: 40 },
  { label: "slower", ms: 120 },
  { label: "step", ms: 600 },
];

function domainFor(kind: RegressionKind): { x: [number, number]; y: [number, number] } {
  return kind === "linear"
    ? { x: [0, 1], y: [-3, 3] }
    : { x: [0, 1], y: [-0.2, 1.2] };
}

export function RegressionDemo({ nw, initError }: { nw: NumWasm | null; initError: string | null }) {
  const [kind, setKind] = useState<RegressionKind>("linear");
  const [cfg, setCfg] = useState({
    alpha: ALPHA_DEFAULT.linear,
    iterations: 800,
    noise: 0.25,
    points: 80,
    delayMs: 0,
  });
  const [data, setData] = useState<RegressionData>({ x: [], y: [] });
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [history, setHistory] = useState<RegressionStep[]>([]);
  const [params, setParams] = useState<{ w: number; b: number } | null>(null);
  const histRef = useRef<RegressionStep[]>([]);
  const seedRef = useRef(42);
  const { ref, size } = usePlotSize<HTMLDivElement>();

  const makeData = (k: RegressionKind) => {
    if (!nw) return;
    seedRef.current += 1;
    const d = generateRegressionData(nw, k, cfg.points, cfg.noise, seedRef.current);
    histRef.current = [];
    setData(d);
    setHistory([]);
    setParams(null);
    setStatus("idle");
  };

  useEffect(() => {
    makeData(kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw]);

  const switchKind = (k: RegressionKind) => {
    setKind(k);
    setCfg((c) => ({ ...c, alpha: ALPHA_DEFAULT[k] }));
    makeData(k);
  };

  const run = async () => {
    if (!nw || data.x.length === 0) return;
    histRef.current = [];
    setHistory([]);
    setParams(null);
    setStatus("running");
    await trainRegression(nw, kind, data, {
      iterations: cfg.iterations,
      alpha: cfg.alpha,
      delayMs: cfg.delayMs,
      onStep: (s) => {
        histRef.current.push(s);
        setHistory(histRef.current.slice());
        setParams({ w: s.w, b: s.b });
      },
    });
    setStatus("done");
  };

  const updateCfg = (patch: Partial<typeof cfg>) => {
    histRef.current = [];
    setCfg((c) => ({ ...c, ...patch }));
    setHistory([]);
    setParams(null);
    setStatus("idle");
  };

  const curve = useMemo(() => {
    if (!nw || !params) return [];
    return regressionCurve(nw, kind, params.w, params.b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw, kind, params]);

  const last = history[history.length - 1] ?? null;
  const dom = domainFor(kind);
  const { w, h } = size;
  const sx = (x: number) => PAD + ((x - dom.x[0]) / (dom.x[1] - dom.x[0])) * (w - PAD * 2);
  const sy = (y: number) => h - PAD - ((y - dom.y[0]) / (dom.y[1] - dom.y[0])) * (h - PAD * 2);

  const addPoint = (e: React.PointerEvent) => {
    if (!nw || status === "running") return;
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = dom.x[0] + (px / rect.width) * (dom.x[1] - dom.x[0]);
    const yRaw = dom.y[1] - (py / rect.height) * (dom.y[1] - dom.y[0]);
    if (x < dom.x[0] || x > dom.x[1]) return;
    const y = kind === "linear" ? yRaw : yRaw > 0.5 ? 1 : 0;
    setData((d) => ({ x: [...d.x, x], y: [...d.y, y] }));
    histRef.current = [];
    setHistory([]);
    setParams(null);
    setStatus("idle");
  };

  return (
    <div className="notebook">
      {initError && <div className="stamp error">init failed: {initError}</div>}

      <section className="sheet train-sheet">
        <fieldset className="train-controls" disabled={status === "running"}>
          <div className="kind-toggle" role="tablist" aria-label="model kind">
            {(["linear", "logistic"] as const).map((k) => (
              <button
                key={k}
                className={"kind-btn" + (kind === k ? " active" : "")}
                onClick={() => switchKind(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <label className="cfg">
            <span>alpha</span>
            <input
              className="field num"
              type="number"
              step={0.05}
              min={0.001}
              value={cfg.alpha}
              onChange={(e) => updateCfg({ alpha: +e.target.value })}
            />
          </label>
          <label className="cfg">
            <span>iterations</span>
            <input
              className="field num"
              type="number"
              min={10}
              max={5000}
              step={10}
              value={cfg.iterations}
              onChange={(e) => updateCfg({ iterations: +e.target.value })}
            />
          </label>
          {kind === "linear" && (
            <label className="cfg">
              <span>noise</span>
              <input
                className="field num"
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={cfg.noise}
                onChange={(e) => updateCfg({ noise: +e.target.value })}
              />
            </label>
          )}
          <label className="cfg">
            <span>speed</span>
            <select
              className="field speed"
              value={cfg.delayMs}
              onChange={(e) => updateCfg({ delayMs: +e.target.value })}
            >
              {SPEEDS.map((s) => (
                <option key={s.ms} value={s.ms}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn ghost" onClick={() => makeData(kind)} disabled={!nw}>
            Regenerate
          </button>
        </fieldset>
        <button className="btn train-btn" onClick={() => void run()} disabled={!nw || status === "running"}>
          {status === "running" ? "Fitting…" : `Train ${kind}`}
        </button>
        {last && status === "done" && (
          <div className="train-actions">
            <span className="stat">
              loss <b>{last.loss.toFixed(4)}</b> · y = <b>{last.w.toFixed(3)}</b>x + <b>{last.b.toFixed(3)}</b>
            </span>
          </div>
        )}
      </section>

      <section className="sheet plot-sheet">
        <h2 className="sheet-title">Fit</h2>
        <div className="plot-wrap" ref={ref}>
          {w > 0 && (
            <svg className="plot-canvas" viewBox={`0 0 ${w} ${h}`} onPointerDown={addPoint} aria-label="regression fit">
              {[0.2, 0.4, 0.6, 0.8].map((g) => (
                <line key={`v${g}`} x1={sx(g)} y1={PAD} x2={sx(g)} y2={h - PAD} className="plot-grid" />
              ))}
              {kind === "logistic" && (
                <line x1={PAD} y1={sy(0.5)} x2={w - PAD} y2={sy(0.5)} className="plot-grid plot-mid" />
              )}
              {data.x.map((x, i) => {
                const y = data.y[i];
                const col =
                  kind === "linear" ? "var(--ink-soft)" : y > 0.5 ? "#3b82f6" : "var(--ink-faint)";
                const py = kind === "linear" ? y : y > 0.5 ? 1 - 0.08 - ((i * 37) % 5) * 0.008 : 0.08 + ((i * 37) % 5) * 0.008;
                return <circle key={i} cx={sx(x)} cy={sy(py)} r={3} fill={col} className="plot-point" />;
              })}
              {curve.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={1.4} fill="var(--accent)" className="plot-curve" />
              ))}
            </svg>
          )}
        </div>
        <div className="plot-caption mono">
          <span>{kind === "linear" ? "y = w·x + b" : "p = σ(w·x + b)"}</span>
          <span>click to add a point</span>
          {last && status === "done" && (
            <span>
              w <b>{last.w.toFixed(3)}</b> · b <b>{last.b.toFixed(3)}</b>
            </span>
          )}
        </div>
      </section>

      <section className="sheet monitor-sheet">
        <h2 className="sheet-title">Monitor</h2>
        <div className="status-line">
          <span>{last ? `iter ${last.iteration}` : "idle"}</span>
          <span>lr {cfg.alpha.toFixed(2)}</span>
          <span className="accent">{last ? `loss ${last.loss.toFixed(4)}` : "—"}</span>
        </div>
        <div className="chart-block">
          <span className="chart-label loss">{kind === "linear" ? "mse loss" : "log-loss"}</span>
          <Sparkline points={history.map((r) => r.loss)} strokeClass="spark-line loss" dotClass="spark-dot loss" />
        </div>
        <div className="log" aria-label="regression log">
          {history.slice(-60).map((r) => (
            <div className="log-line" key={r.iteration}>
              <span>#{r.iteration}</span>
              <span>loss {r.loss.toFixed(4)}</span>
              <span>w {r.w.toFixed(3)}</span>
              <span>b {r.b.toFixed(3)}</span>
            </div>
          ))}
        </div>
        <p className="meta-line">
          {data.x.length} points · {cfg.iterations} iters · gradient descent in num-wasm: dot/sum gradients,
          exp/divide sigmoid, log cross-entropy
        </p>
      </section>
    </div>
  );
}
