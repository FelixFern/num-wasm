import { useEffect, useMemo, useRef, useState } from "react";
import type { NumWasm } from "@felixfern/num-wasm/browser";
import { usePlotSize } from "./components/usePlotSize";
import type { KnnPoint } from "./lib/knn";
import { classifyGrid, classifyPoint, generateKnnData } from "./lib/knn";
import { CLUSTER_COLORS } from "./lib/palette";

const PAD = 20;
const GRID = 32;

export function KnnDemo({ nw, initError }: { nw: NumWasm | null; initError: string | null }) {
  const [cfg, setCfg] = useState({ k: 5, perClass: 40, classes: 3 });
  const [data, setData] = useState<KnnPoint[]>([]);
  const [grid, setGrid] = useState<number[] | null>(null);
  const [probe, setProbe] = useState<{
    x: number;
    y: number;
    label: number;
    votes: number[];
    neighbors: number[];
  } | null>(null);
  const seedRef = useRef(42);
  const { ref, size } = usePlotSize<HTMLDivElement>();

  const makeData = () => {
    if (!nw) return;
    seedRef.current += 1;
    setData(generateKnnData(nw, cfg.perClass, cfg.classes, seedRef.current));
    setProbe(null);
  };

  useEffect(() => {
    if (nw) makeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw]);

  useEffect(() => {
    if (!nw || data.length === 0) return;
    const g = classifyGrid(nw, data, GRID, Math.min(cfg.k, data.length));
    setGrid(g);
    setProbe(null);
  }, [nw, data, cfg.k]);

  const n = data.length;
  const classes = cfg.classes;
  const { w, h } = size;
  const sx = (x: number) => PAD + x * (w - PAD * 2);
  const sy = (y: number) => h - PAD - y * (h - PAD * 2);
  const cell = (w - PAD * 2) / GRID;

  const onProbe = (e: React.PointerEvent) => {
    if (!nw || data.length === 0) return;
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - PAD) / (rect.width - PAD * 2);
    const y = 1 - (e.clientY - rect.top - PAD) / (rect.height - PAD * 2);
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setProbe({ ...classifyPoint(nw, data, x, y, Math.min(cfg.k, data.length)), x, y });
  };

  const legend = useMemo(
    () =>
      Array.from({ length: classes }, (_, i) => ({
        cls: i,
        count: data.reduce((acc, p) => acc + (p.label === i ? 1 : 0), 0),
      })),
    [data, classes],
  );

  return (
    <div className="notebook">
      {initError && <div className="stamp error">init failed: {initError}</div>}

      <section className="sheet train-sheet">
        <label className="cfg">
          <span>k neighbors</span>
          <input
            className="field num"
            type="number"
            min={1}
            max={20}
            value={cfg.k}
            onChange={(e) => setCfg({ ...cfg, k: Math.max(1, Math.round(+e.target.value)) })}
          />
        </label>
        <label className="cfg">
          <span>per class</span>
          <input
            className="field num"
            type="number"
            min={10}
            max={120}
            step={5}
            value={cfg.perClass}
            onChange={(e) => setCfg({ ...cfg, perClass: +e.target.value })}
          />
        </label>
        <label className="cfg">
          <span>classes</span>
          <input
            className="field num"
            type="number"
            min={2}
            max={6}
            value={cfg.classes}
            onChange={(e) => setCfg({ ...cfg, classes: Math.max(2, Math.min(6, Math.round(+e.target.value))) })}
          />
        </label>
        <button className="btn ghost" onClick={makeData} disabled={!nw}>
          Regenerate
        </button>
        {grid && (
          <div className="train-actions">
            <span className="stat">
              {GRID * GRID} cells · k={cfg.k} · <b>{n} points</b>
            </span>
          </div>
        )}
      </section>

      <section className="sheet plot-sheet">
        <h2 className="sheet-title">Boundary</h2>
        <div className="plot-wrap" ref={ref}>
          {w > 0 && (
            <svg className="plot-canvas" viewBox={`0 0 ${w} ${h}`} onPointerDown={onProbe} aria-label="knn decision boundary">
              {grid &&
                grid.map((cls, i) => {
                  const r = Math.floor(i / GRID);
                  const c = i % GRID;
                  return (
                    <rect
                      key={i}
                      x={PAD + c * cell}
                      y={PAD + r * cell}
                      width={cell + 0.5}
                      height={cell + 0.5}
                      fill={CLUSTER_COLORS[cls % CLUSTER_COLORS.length]}
                      opacity={0.22}
                    />
                  );
                })}
              {data.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r={3.2}
                  fill={CLUSTER_COLORS[p.label % CLUSTER_COLORS.length]}
                  stroke="var(--bg)"
                  strokeWidth={1}
                />
              ))}
              {probe &&
                probe.neighbors.map((idx) => (
                  <line
                    key={idx}
                    x1={sx(probe.x)}
                    y1={sy(probe.y)}
                    x2={sx(data[idx].x)}
                    y2={sy(data[idx].y)}
                    className="probe-link"
                  />
                ))}
              {probe && (
                <g>
                  <circle cx={sx(probe.x)} cy={sy(probe.y)} r={9} fill="none" stroke="var(--ink)" strokeWidth={2} />
                  <circle cx={sx(probe.x)} cy={sy(probe.y)} r={4} fill={CLUSTER_COLORS[probe.label % CLUSTER_COLORS.length]} />
                </g>
              )}
            </svg>
          )}
        </div>
        <div className="plot-caption mono">
          <span>click anywhere to probe</span>
          <span>
            {probe ? `class ${probe.label} · ${probe.votes.join("/")} votes` : "lazy classifier — no training"}
          </span>
        </div>
      </section>

      <section className="sheet monitor-sheet">
        <h2 className="sheet-title">Monitor</h2>
        <div className="status-line">
          <span>{n} points</span>
          <span>k {Math.min(cfg.k, n)}</span>
          <span className="accent">{grid ? `${GRID * GRID} cells` : "—"}</span>
        </div>
        <div className="legend">
          {legend.map((l) => (
            <span key={l.cls} className="legend-chip">
              <i style={{ background: CLUSTER_COLORS[l.cls % CLUSTER_COLORS.length] }} />
              class {l.cls} · {l.count}
            </span>
          ))}
        </div>
        <div className="log" aria-label="knn log">
          {grid &&
            legend.map((l) => (
              <div className="log-line" key={l.cls}>
                <span>#{l.cls}</span>
                <span>train {l.count}</span>
                <span>{"·".repeat(Math.max(1, Math.round((l.count / Math.max(1, n)) * 20)))}</span>
                <span>{((l.count / Math.max(1, n)) * 100).toFixed(0)}%</span>
              </div>
            ))}
        </div>
        <p className="meta-line">
          distances via matmul |p|²+|q|²−2pqᵀ, top-k by iterated argmin+mask, votes summed per cell
        </p>
      </section>
    </div>
  );
}
