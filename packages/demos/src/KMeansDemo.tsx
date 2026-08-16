import { useEffect, useRef, useState } from "react";
import type { NumWasm } from "@felixfern/num-wasm/browser";
import { Sparkline } from "./components/Sparkline";
import { usePlotSize } from "./components/usePlotSize";
import type { KMeansPoint, KMeansStep } from "./lib/kmeans";
import { fitKMeans, generateClusterData } from "./lib/kmeans";

const CLUSTER_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];
const PAD = 18;
const SPEEDS = [
  { label: "fast", ms: 0 },
  { label: "slow", ms: 60 },
  { label: "slower", ms: 250 },
  { label: "step", ms: 900 },
];

export function KMeansDemo({ nw, initError }: { nw: NumWasm | null; initError: string | null }) {
  const [cfg, setCfg] = useState({ points: 300, k: 4, iterations: 40, delayMs: 0 });
  const [data, setData] = useState<KMeansPoint[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [steps, setSteps] = useState<KMeansStep[]>([]);
  const [idx, setIdx] = useState(0);
  const stepRef = useRef<KMeansStep[]>([]);
  const seedRef = useRef(42);
  const { ref, size } = usePlotSize<HTMLDivElement>();

  useEffect(() => {
    if (!nw) return;
    stepRef.current = [];
    setData(generateClusterData(nw, cfg.points, cfg.k, seedRef.current));
    setSteps([]);
    setIdx(0);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw]);

  const regenerate = () => {
    if (!nw) return;
    seedRef.current += 1;
    stepRef.current = [];
    setData(generateClusterData(nw, cfg.points, cfg.k, seedRef.current));
    setSteps([]);
    setIdx(0);
    setStatus("idle");
  };

  const run = async () => {
    if (!nw || data.length === 0) return;
    stepRef.current = [];
    setSteps([]);
    setIdx(0);
    setStatus("running");
    await fitKMeans(nw, data, cfg.k, {
      iterations: cfg.iterations,
      delayMs: cfg.delayMs,
      seed: seedRef.current,
      onStep: (s) => {
        stepRef.current.push(s);
        setSteps(stepRef.current.slice());
        setIdx(stepRef.current.length - 1);
      },
    });
    setStatus("done");
  };

  const updateCfg = (patch: Partial<typeof cfg>) => {
    stepRef.current = [];
    setCfg((c) => ({ ...c, ...patch }));
    setSteps([]);
    setIdx(0);
    setStatus("idle");
  };

  const step = steps[idx] ?? null;
  const last = steps[steps.length - 1] ?? null;
  const { w, h } = size;
  const sx = (x: number) => PAD + x * (w - PAD * 2);
  const sy = (y: number) => h - PAD - y * (h - PAD * 2);
  const colorFor = (i: number) => (step ? CLUSTER_COLORS[step.assignments[i] % CLUSTER_COLORS.length] : "var(--ink-faint)");
  const clampK = (v: number) => Math.max(2, Math.min(8, Math.round(v)));

  return (
    <div className="notebook">
      {initError && <div className="stamp error">init failed: {initError}</div>}

      <section className="sheet train-sheet">
        <fieldset className="train-controls" disabled={status === "running"}>
          <label className="cfg">
            <span>clusters k</span>
            <input
              className="field num"
              type="number"
              min={2}
              max={8}
              value={cfg.k}
              onChange={(e) => updateCfg({ k: clampK(+e.target.value) })}
            />
          </label>
          <label className="cfg">
            <span>points</span>
            <input
              className="field num"
              type="number"
              min={20}
              max={1000}
              step={20}
              value={cfg.points}
              onChange={(e) => updateCfg({ points: +e.target.value })}
            />
          </label>
          <label className="cfg">
            <span>iterations</span>
            <input
              className="field num"
              type="number"
              min={1}
              max={200}
              value={cfg.iterations}
              onChange={(e) => updateCfg({ iterations: +e.target.value })}
            />
          </label>
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
          <button className="btn ghost" onClick={regenerate} disabled={!nw}>
            Regenerate
          </button>
        </fieldset>
        <button className="btn train-btn" onClick={() => void run()} disabled={!nw || status === "running"}>
          {status === "running" ? "Clustering…" : "Run K-Means"}
        </button>
        {last && status === "done" && (
          <div className="train-actions">
            <span className="stat">
              inertia <b>{last.inertia.toFixed(2)}</b> · iter <b>{last.iteration}</b>
            </span>
          </div>
        )}
      </section>

      <section className="sheet plot-sheet">
        <h2 className="sheet-title">Clusters</h2>
        <div className="plot-wrap" ref={ref}>
          {w > 0 && (
            <svg className="plot-canvas" viewBox={`0 0 ${w} ${h}`} aria-label="k-means scatter">
              {[0.2, 0.4, 0.6, 0.8].map((g) => (
                <line key={`v${g}`} x1={sx(g)} y1={PAD} x2={sx(g)} y2={h - PAD} className="plot-grid" />
              ))}
              {[0.2, 0.4, 0.6, 0.8].map((g) => (
                <line key={`h${g}`} x1={PAD} y1={sy(g)} x2={w - PAD} y2={sy(g)} className="plot-grid" />
              ))}
              {data.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={colorFor(i)} className="plot-point" />
              ))}
              {step &&
                step.centroids.map((c, j) => {
                  const col = CLUSTER_COLORS[j % CLUSTER_COLORS.length];
                  return (
                    <g key={j} className="plot-centroid">
                      <circle cx={sx(c.x)} cy={sy(c.y)} r={9} fill="none" stroke={col} strokeWidth={2} />
                      <circle cx={sx(c.x)} cy={sy(c.y)} r={3.2} fill={col} />
                    </g>
                  );
                })}
            </svg>
          )}
        </div>
        <div className="plot-caption mono">
          <span>{status === "running" ? `running iter ${idx + 1}/${cfg.iterations}` : step ? `iter ${step.iteration}` : "unassigned"}</span>
          {last && status === "done" && (
            <span>
              sizes {last.sizes.join(" · ")}
            </span>
          )}
        </div>
      </section>

      <section className="sheet monitor-sheet">
        <h2 className="sheet-title">Monitor</h2>
        <div className="status-line">
          <span>{steps.length > 0 ? `iter ${steps.length}` : "idle"}</span>
          <span>k {cfg.k}</span>
          <span className="accent">{last ? `inertia ${last.inertia.toFixed(1)}` : "—"}</span>
        </div>
        <div className="chart-block">
          <span className="chart-label">inertia (within-cluster ss)</span>
          <Sparkline points={steps.map((s) => s.inertia)} strokeClass="spark-line loss" dotClass="spark-dot loss" />
        </div>
        <div className="scrub-row">
          <span className="mono">{steps.length > 0 ? `${idx + 1}` : "—"}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, steps.length - 1)}
            value={idx}
            disabled={steps.length === 0}
            onChange={(e) => setIdx(+e.target.value)}
          />
          <span className="mono">{steps.length > 0 ? steps.length : "—"}</span>
        </div>
        <div className="log" aria-label="k-means log">
          {steps.slice(-60).map((s) => (
            <div className="log-line" key={s.iteration}>
              <span>#{s.iteration}</span>
              <span>inertia {s.inertia.toFixed(2)}</span>
              <span>{s.sizes.join("·")}</span>
              <span>{s.centroids.length}k</span>
            </div>
          ))}
        </div>
        <p className="meta-line">
          {data.length} points · {cfg.k} clusters · num-wasm matmul/argmin assignment, (G^T P)/ΣG centroid update
        </p>
      </section>
    </div>
  );
}
