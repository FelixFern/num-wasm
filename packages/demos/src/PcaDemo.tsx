import { useEffect, useRef, useState } from "react";
import type { NumWasm } from "@felixfern/num-wasm/browser";
import { Sparkline } from "./components/Sparkline";
import { usePlotSize } from "./components/usePlotSize";
import type { PcaStep } from "./lib/pca";
import { centerAndCov, generatePcaData, powerIterate } from "./lib/pca";

const PAD = 20;
const DOMAIN = 6;
const SPEEDS = [
  { label: "fast", ms: 0 },
  { label: "slow", ms: 60 },
  { label: "slower", ms: 250 },
  { label: "step", ms: 900 },
];

export function PcaDemo({ nw, initError }: { nw: NumWasm | null; initError: string | null }) {
  const [cfg, setCfg] = useState({ points: 240, iterations: 30, delayMs: 0 });
  const [data, setData] = useState<{ x: number; y: number }[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [steps, setSteps] = useState<PcaStep[]>([]);
  const [idx, setIdx] = useState(0);
  const stepRef = useRef<PcaStep[]>([]);
  const seedRef = useRef(42);
  const { ref, size } = usePlotSize<HTMLDivElement>();

  const makeData = () => {
    if (!nw) return;
    seedRef.current += 1;
    stepRef.current = [];
    setData(generatePcaData(nw, cfg.points, seedRef.current));
    setSteps([]);
    setIdx(0);
    setStatus("idle");
  };

  useEffect(() => {
    if (nw) makeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw]);

  const run = async () => {
    if (!nw || data.length === 0) return;
    stepRef.current = [];
    setSteps([]);
    setIdx(0);
    setStatus("running");
    const cov = centerAndCov(nw, data);
    await powerIterate(nw, cov, {
      iterations: cfg.iterations,
      delayMs: cfg.delayMs,
      onStep: (s) => {
        stepRef.current.push(s);
        setSteps(stepRef.current.slice());
        setIdx(stepRef.current.length - 1);
      },
    });
    cov.free();
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
  const sx = (x: number) => PAD + ((x + DOMAIN) / (2 * DOMAIN)) * (w - PAD * 2);
  const sy = (y: number) => h - PAD - ((y + DOMAIN) / (2 * DOMAIN)) * (h - PAD * 2);

  // projection in the PC basis
  const v = step?.vec ?? [1, 0];
  const perp: [number, number] = [-v[1], v[0]];
  const proj = data.map((p) => ({ t1: p.x * v[0] + p.y * v[1], t2: p.x * perp[0] + p.y * perp[1] }));
  const pW = Math.max(0, w - PAD * 2);
  const pH = 70;
  const psx = (t: number) => PAD + ((t + DOMAIN) / (2 * DOMAIN)) * pW;
  const psy = (t: number) => PAD + pH - ((t + DOMAIN) / (2 * DOMAIN)) * (pH - PAD * 2);
  const cx = data.reduce((a, p) => a + p.x, 0) / Math.max(1, data.length);
  const cy = data.reduce((a, p) => a + p.y, 0) / Math.max(1, data.length);
  const arrowLen = DOMAIN * 0.55;

  return (
    <div className="notebook">
      {initError && <div className="stamp error">init failed: {initError}</div>}

      <section className="sheet train-sheet">
        <label className="cfg">
          <span>points</span>
          <input
            className="field num"
            type="number"
            min={20}
            max={600}
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
            max={100}
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
        <button className="btn ghost" onClick={makeData} disabled={!nw}>
          Regenerate
        </button>
        <button className="btn train-btn" onClick={() => void run()} disabled={!nw || status === "running"}>
          {status === "running" ? "Converging…" : "Run Power Iteration"}
        </button>
        {last && status === "done" && (
          <div className="train-actions">
            <span className="stat">
              PC1 <b>{(last.ratio * 100).toFixed(1)}%</b> variance · angle <b>{last.angle.toFixed(1)}°</b>
            </span>
          </div>
        )}
      </section>

      <section className="sheet plot-sheet">
        <h2 className="sheet-title">Projection</h2>
        <div className="plot-wrap" ref={ref}>
          {w > 0 && (
            <svg className="plot-canvas" viewBox={`0 0 ${w} ${h}`} aria-label="pca scatter">
              {data.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.6} fill="var(--ink-soft)" opacity={0.8} />
              ))}
              <circle cx={sx(cx)} cy={sy(cy)} r={2.5} fill="var(--accent)" />
              {step && (
                <g>
                  <line
                    x1={sx(cx)}
                    y1={sy(cy)}
                    x2={sx(cx + v[0] * arrowLen)}
                    y2={sy(cy + v[1] * arrowLen)}
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    markerEnd="url(#pca-arrow)"
                  />
                  <line
                    x1={sx(cx)}
                    y1={sy(cy)}
                    x2={sx(cx + perp[0] * arrowLen * 0.6)}
                    y2={sy(cy + perp[1] * arrowLen * 0.6)}
                    stroke="var(--ink-faint)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <defs>
                    <marker id="pca-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
                    </marker>
                  </defs>
                </g>
              )}
            </svg>
          )}
        </div>
        <div className="plot-caption mono">
          <span>{step ? `iter ${step.iteration} · PC1 ${(step.ratio * 100).toFixed(1)}% var` : "raw 2D data"}</span>
          <span>solid = PC1 · dashed = PC2</span>
        </div>
        {proj.length > 0 && (
          <svg className="proj-canvas" viewBox={`0 0 ${w} ${pH + PAD}`} aria-label="pca rotated projection">
            <line x1={PAD} y1={psy(0)} x2={w - PAD} y2={psy(0)} className="plot-grid" />
            {proj.map((p, i) => (
              <circle key={i} cx={psx(p.t1)} cy={psy(p.t2)} r={2.2} fill="var(--accent)" opacity={0.75} />
            ))}
          </svg>
        )}
      </section>

      <section className="sheet monitor-sheet">
        <h2 className="sheet-title">Monitor</h2>
        <div className="status-line">
          <span>{steps.length > 0 ? `iter ${steps.length}` : "idle"}</span>
          <span>{data.length} pts</span>
          <span className="accent">{last ? `${(last.ratio * 100).toFixed(1)}%` : "—"}</span>
        </div>
        <div className="chart-block">
          <span className="chart-label">variance explained</span>
          <Sparkline points={steps.map((s) => s.ratio)} />
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
        <div className="log" aria-label="pca log">
          {steps.slice(-60).map((s) => (
            <div className="log-line" key={s.iteration}>
              <span>#{s.iteration}</span>
              <span>var {(s.ratio * 100).toFixed(1)}%</span>
              <span>angle {s.angle.toFixed(1)}°</span>
              <span>vx {s.vec[0].toFixed(3)}</span>
            </div>
          ))}
        </div>
        <p className="meta-line">covariance via (P−μ)ᵀ(P−μ)/n, power iteration v ← cov·v with normalize</p>
      </section>
    </div>
  );
}
