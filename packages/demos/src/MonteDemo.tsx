import { useRef, useState } from "react";
import type { NumWasm } from "@felixfern/num-wasm/browser";
import { Sparkline } from "./components/Sparkline";
import { usePlotSize } from "./components/usePlotSize";
import type { MonteStep } from "./lib/monte";
import { runMonteCarlo } from "./lib/monte";

const PAD = 20;
const SPEEDS = [
  { label: "fast", ms: 0 },
  { label: "slow", ms: 60 },
  { label: "slower", ms: 200 },
  { label: "step", ms: 700 },
];

export function MonteDemo({ nw, initError }: { nw: NumWasm | null; initError: string | null }) {
  const [cfg, setCfg] = useState({ samples: 4000, batch: 400, delayMs: 0 });
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [steps, setSteps] = useState<MonteStep[]>([]);
  const stepRef = useRef<MonteStep[]>([]);
  const seedRef = useRef(7);
  const { ref, size } = usePlotSize<HTMLDivElement>();

  const run = async () => {
    if (!nw) return;
    stepRef.current = [];
    setSteps([]);
    setStatus("running");
    seedRef.current += 1;
    await runMonteCarlo(nw, {
      samples: cfg.samples,
      batch: cfg.batch,
      delayMs: cfg.delayMs,
      seed: seedRef.current,
      onStep: (s) => {
        stepRef.current.push(s);
        setSteps(stepRef.current.slice());
      },
    });
    setStatus("done");
  };

  const updateCfg = (patch: Partial<typeof cfg>) => {
    setCfg((c) => ({ ...c, ...patch }));
    stepRef.current = [];
    setSteps([]);
    setStatus("idle");
  };

  const last = steps[steps.length - 1] ?? null;
  const allPoints = steps.flatMap((s) => s.points);
  const { w, h } = size;
  const sx = (x: number) => PAD + x * (w - PAD * 2);
  const sy = (y: number) => h - PAD - y * (h - PAD * 2);
  const R = w - PAD * 2;

  return (
    <div className="notebook">
      {initError && <div className="stamp error">init failed: {initError}</div>}

      <section className="sheet train-sheet">
        <label className="cfg">
          <span>samples</span>
          <input
            className="field num"
            type="number"
            min={200}
            max={20000}
            step={200}
            value={cfg.samples}
            onChange={(e) => updateCfg({ samples: +e.target.value })}
          />
        </label>
        <label className="cfg">
          <span>batch</span>
          <input
            className="field num"
            type="number"
            min={50}
            max={2000}
            step={50}
            value={cfg.batch}
            onChange={(e) => updateCfg({ batch: +e.target.value })}
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
        <button className="btn train-btn" onClick={() => void run()} disabled={!nw || status === "running"}>
          {status === "running" ? "Sampling…" : "Sample"}
        </button>
        {last && status === "done" && (
          <div className="train-actions">
            <span className="stat">
              π ≈ <b>{last.estimate.toFixed(4)}</b> · error <b>{last.error.toExponential(1)}</b>
            </span>
          </div>
        )}
      </section>

      <section className="sheet plot-sheet">
        <h2 className="sheet-title">Hit-or-miss</h2>
        <div className="plot-wrap" ref={ref}>
          {w > 0 && (
            <svg className="plot-canvas" viewBox={`0 0 ${w} ${h}`} aria-label="monte carlo points">
              <line x1={PAD} y1={h - PAD} x2={w - PAD} y2={h - PAD} className="plot-grid" />
              <line x1={PAD} y1={h - PAD} x2={PAD} y2={PAD} className="plot-grid" />
              <path
                d={`M ${PAD + R} ${h - PAD} A ${R} ${R} 0 0 0 ${PAD} ${PAD}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.5}
              />
              {allPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r={1.4}
                  fill={p.inside ? "var(--accent)" : "var(--ink-faint)"}
                  opacity={p.inside ? 0.9 : 0.45}
                />
              ))}
            </svg>
          )}
        </div>
        <div className="plot-caption mono">
          <span>{last ? `${last.total} samples` : "no samples yet"}</span>
          <span>{last ? `inside ${last.inside} (${((last.inside / last.total) * 100).toFixed(1)}%)` : "4 × in/total → π"}</span>
        </div>
      </section>

      <section className="sheet monitor-sheet">
        <h2 className="sheet-title">Monitor</h2>
        <div className="status-line">
          <span>{last ? `${last.total} pts` : "idle"}</span>
          <span>π {Math.PI.toFixed(4)}</span>
          <span className="accent">{last ? last.estimate.toFixed(4) : "—"}</span>
        </div>
        <div className="chart-block">
          <span className="chart-label">estimate → π</span>
          <Sparkline points={steps.map((s) => s.estimate)} />
        </div>
        <div className="log" aria-label="monte carlo log">
          {steps.slice(-60).map((s) => (
            <div className="log-line" key={s.iteration}>
              <span>#{s.total}</span>
              <span>est {s.estimate.toFixed(4)}</span>
              <span>err {s.error.toExponential(1)}</span>
              <span>{((s.inside / s.total) * 4).toFixed(3)}</span>
            </div>
          ))}
        </div>
        <p className="meta-line">uniform samples via num-wasm random, inside count via sum(x²+y²) &lt; 1</p>
      </section>
    </div>
  );
}
