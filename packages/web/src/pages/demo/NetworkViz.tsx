import { useEffect, useMemo, useRef, useState } from "react";

export interface NetworkVizProps {
  grid: number[] | null;
  layers: number[][] | null;
  output: number[] | null;
  movement: number[] | null;
  weights: number[][] | null;
  biases: number[][] | null;
  labels: number[];
  predicted: number | null;
  dark: boolean;
}

const N = 28;
const CELL = 5;
const GRID_SIZE = N * CELL; // 140
const GX = 70;

const OUT_X = 1110;
const H_SPACE = 18;
const O_SPACE = 26;
const HR = 7;
const OR = 11;
const PAD = 40;
const WORLD_W = 1280;

type Palette = {
  ink: string;
  inkA: (a: number) => string;
  paper: string;
  blue: (a: number) => string;
  red: string;
  redA: (a: number) => string;
  dots: string;
};

const LIGHT: Palette = {
  ink: "rgb(24,24,27)",
  inkA: (a) => `rgba(24,24,27,${a})`,
  paper: "#fafafa",
  blue: (a) => `rgba(113,113,122,${a})`,
  red: "rgb(24,24,27)",
  redA: (a) => `rgba(24,24,27,${a})`,
  dots: "rgba(24,24,27,0.16)",
};

const DARK: Palette = {
  ink: "rgb(250,250,250)",
  inkA: (a) => `rgba(250,250,250,${a})`,
  paper: "#09090b",
  blue: (a) => `rgba(161,161,170,${a})`,
  red: "rgb(250,250,250)",
  redA: (a) => `rgba(250,250,250,${a})`,
  dots: "rgba(161,161,170,0.22)",
};

function band(count: number, space: number): (i: number) => number {
  if (count <= 1) return () => 0;
  return (i: number) => (i * space - ((count - 1) * space) / 2);
}

export function NetworkViz({
  grid,
  layers,
  output,
  movement,
  weights,
  biases,
  labels,
  predicted,
  dark,
}: NetworkVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState({ x: 0, y: 0, s: 1 });
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<{ kind: "h" | "o"; l: number; i: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const sized = useRef(false);
  const hoverKey = useRef<string | null>(null);

  const layerCount = layers?.length ?? 0;
  const hiddenCols = layers ?? [];
  const out = output ?? [];

  const pal: Palette = dark ? DARK : LIGHT;

  const geom = useMemo(() => {
    const hiddenXs = hiddenCols.map((_, i) =>
      layerCount <= 1 ? 600 : 320 + (i * (1040 - 320)) / (layerCount - 1),
    );
    const spans = hiddenCols.map((act) => Math.max((act.length - 1) * H_SPACE, 0));
    const spanO = Math.max((out.length - 1) * O_SPACE, 0);
    const maxSpan = Math.max(...spans, spanO, 1);
    const midY = PAD + maxSpan / 2;
    const yOf = (act: number[], i: number, space: number) => midY + band(act.length, space)(i);
    return { hiddenXs, midY, yOf, maxSpan };
  }, [hiddenCols, out, layerCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const bw = Math.max(1, Math.round(w * dpr));
      const bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      if (!sized.current) {
        sized.current = true;
        const s = Math.min(1, (w - 16) / WORLD_W);
        setView({ x: 8, y: 8, s });
      } else {
        setTick((t) => t + 1);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const rv = requestAnimationFrame(fit);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rv);
      window.removeEventListener("resize", fit);
    };
  }, []);

  // wheel zoom (native listener so we can preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setView((v) => {
        const ns = Math.min(4, Math.max(0.12, v.s * factor));
        const fx = ns / v.s;
        return { s: ns, x: px - (px - v.x) * fx, y: py - (py - v.y) * fx };
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 0;
    const cssH = canvas.clientHeight || 0;

    const midY = geom.midY;
    const yOf = geom.yOf;
    const actMax = (act: number[]) => Math.max(...act, 0.0001);
    const moveMax = Math.max(...(movement ?? []), 0.0001);
    const labelAt = (j: number) => labels[j] ?? j;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);

    // dotted background spanning the visible canvas, constant on-screen
    // dot size + spacing regardless of zoom (world units compensate the scale)
    ctx.fillStyle = pal.dots;
    const step = 24 / view.s;
    const dot = 2 / view.s;
    const vx0 = -view.x / view.s;
    const vy0 = -view.y / view.s;
    const vx1 = (cssW - view.x) / view.s;
    const vy1 = (cssH - view.y) / view.s;
    for (let y = vy0 + step; y < vy1; y += step) {
      for (let x = vx0 + step; x < vx1; x += step) {
        ctx.fillRect(x, y, dot, dot);
      }
    }

    ctx.lineCap = "round";

    // edges between consecutive columns
    const colXs = geom.hiddenXs;
    // edge l connects column l -> l+1 using weights[l]
    for (let l = 0; l < hiddenCols.length; l++) {
      const srcAct = hiddenCols[l];
      const dstAct = l < hiddenCols.length - 1 ? hiddenCols[l + 1] : out;
      const dstIsOut = l === hiddenCols.length - 1;
      const srcX = colXs[l];
      const dstX = dstIsOut ? OUT_X : colXs[l + 1];
      const srcSpace = H_SPACE;
      const dstSpace = dstIsOut ? O_SPACE : H_SPACE;
      const wFlat = weights?.[l];
      let wMax = 0.0001;
      if (wFlat) {
        for (let j = 0; j < dstAct.length; j++) {
          for (let i = 0; i < srcAct.length; i++) {
            wMax = Math.max(wMax, Math.abs(srcAct[i] * wFlat[j * srcAct.length + i]));
          }
        }
      }
      for (let j = 0; j < dstAct.length; j++) {
        for (let i = 0; i < srcAct.length; i++) {
          const c = srcAct[i] * (wFlat?.[j * srcAct.length + i] ?? 0);
          const t = Math.abs(c) / wMax;
          ctx.strokeStyle = pal.blue(0.06 + t * 0.7);
          ctx.lineWidth = 0.5 + t * 2.4;
          ctx.beginPath();
          ctx.moveTo(srcX, yOf(srcAct, i, srcSpace));
          ctx.lineTo(dstX, yOf(dstAct, j, dstSpace));
          ctx.stroke();
        }
      }
    }

    // input beams to first hidden layer
    if (hiddenCols.length > 0) {
      const firstAct = hiddenCols[0];
      const h1Max = actMax(firstAct);
      for (let i = 0; i < firstAct.length; i++) {
        ctx.strokeStyle = pal.blue(0.1 + (Math.max(firstAct[i], 0) / h1Max) * 0.55);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const spread = firstAct.length <= 1 ? 0 : ((i / (firstAct.length - 1)) - 0.5) * GRID_SIZE * 0.9;
        ctx.moveTo(GX + GRID_SIZE, midY + spread);
        ctx.quadraticCurveTo((GX + GRID_SIZE + colXs[0]) / 2, midY + spread, colXs[0], yOf(firstAct, i, H_SPACE));
        ctx.stroke();
      }
    }

    // input grid
    ctx.fillStyle = pal.paper;
    ctx.fillRect(GX, midY - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(GX, midY - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
    if (grid) {
      for (let i = 0; i < 784; i++) {
        const v = grid[i];
        if (v <= 0) continue;
        const a = Math.min(1, v / 255);
        ctx.fillStyle = pal.inkA(a);
        const x = GX + (i % N) * CELL;
        const y = midY - GRID_SIZE / 2 + Math.floor(i / N) * CELL;
        ctx.fillRect(x, y, CELL, CELL);
      }
    }

    // hidden layers
    for (let l = 0; l < hiddenCols.length; l++) {
      const act = hiddenCols[l];
      const mx = actMax(act);
      for (let i = 0; i < act.length; i++) {
        const a = Math.max(0.06, Math.min(1, Math.abs(act[i]) / mx));
        const ring = l === 0 && movement ? 1 + Math.min((movement[i] ?? 0) / moveMax, 1) * 2.5 : 1;
        ctx.beginPath();
        ctx.arc(colXs[l], yOf(act, i, H_SPACE), HR, 0, Math.PI * 2);
        ctx.fillStyle = pal.paper;
        ctx.fill();
        ctx.fillStyle = pal.blue(a);
        ctx.fill();
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = ring;
        ctx.stroke();
      }
    }

    // output layer
    ctx.textAlign = "end";
      ctx.font = "600 13px 'JetBrains Mono', monospace";
    ctx.fillStyle = pal.ink;
    for (let j = 0; j < out.length; j++) {
      const p = out[j];
      const isPred = predicted === j;
      ctx.beginPath();
      ctx.arc(OUT_X, yOf(out, j, O_SPACE), OR, 0, Math.PI * 2);
      ctx.fillStyle = pal.paper;
      ctx.fill();
      ctx.fillStyle = isPred ? pal.redA(0.25 + p * 0.75) : pal.blue(0.1 + p * 0.85);
      ctx.fill();
      ctx.strokeStyle = isPred ? pal.red : pal.ink;
      ctx.lineWidth = isPred ? 2.5 : 1;
      ctx.stroke();
      ctx.fillStyle = pal.ink;
      ctx.fillText(String(labelAt(j)), OUT_X - 24, yOf(out, j, O_SPACE) + 4);
      ctx.textAlign = "start";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = dark ? "rgba(161,161,170,1)" : "rgba(113,113,122,1)";
      ctx.fillText(`${(p * 100).toFixed(0)}%`, OUT_X + 24, yOf(out, j, O_SPACE) + 4);
      ctx.textAlign = "end";
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    }
  }, [grid, layers, output, movement, weights, labels, predicted, view, tick, dark]);

  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = rect.width / 2;
    const py = rect.height / 2;
    setView((v) => {
      const ns = Math.min(4, Math.max(0.12, v.s * factor));
      const fx = ns / v.s;
      return { s: ns, x: px - (px - v.x) * fx, y: py - (py - v.y) * fx };
    });
  };

  return (
    <div className="net-holder">
      <div
        className="net-canvas"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const dx = e.clientX - drag.current.x;
            const dy = e.clientY - drag.current.y;
            drag.current = { x: e.clientX, y: e.clientY };
            setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
          }
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const wx = (mx - view.x) / view.s;
          const wy = (my - view.y) / view.s;
          const { hiddenXs, yOf } = geom;
          let hit: { kind: "h" | "o"; l: number; i: number } | null = null;
          for (let l = 0; l < hiddenCols.length; l++) {
            const act = hiddenCols[l];
            for (let i = 0; i < act.length; i++) {
              const dx = wx - hiddenXs[l];
              const dy = wy - yOf(act, i, H_SPACE);
              if (dx * dx + dy * dy <= (HR + 4) * (HR + 4)) hit = { kind: "h", l, i };
            }
          }
          for (let j = 0; j < out.length; j++) {
            const dx = wx - OUT_X;
            const dy = wy - yOf(out, j, O_SPACE);
            if (dx * dx + dy * dy <= (OR + 4) * (OR + 4)) hit = { kind: "o", l: out.length, i: j };
          }
          const key = hit ? `${hit.kind}-${hit.l}-${hit.i}` : null;
          if (key !== hoverKey.current) {
            hoverKey.current = key;
            setHover(hit);
          }
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${Math.min(mx + 16, rect.width - 230)}px`;
            tooltipRef.current.style.top = `${Math.min(my + 16, rect.height - 130)}px`;
            tooltipRef.current.style.opacity = hit ? "1" : "0";
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          hoverKey.current = null;
          setHover(null);
          if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
        }}
      >
        <canvas ref={canvasRef} className="net-canvas-el" />
        <div className="node-tooltip" ref={tooltipRef}>
          {hover && (() => {
            const inputSize = grid?.length ?? 784;
            if (hover.kind === "h") {
              const l = hover.l;
              const act = hiddenCols[l];
              const prev = l === 0 ? inputSize : hiddenCols[l - 1].length;
              const next = l < hiddenCols.length - 1 ? hiddenCols[l + 1].length : out.length;
              const row = weights?.[l]?.slice(hover.i * prev, (hover.i + 1) * prev) ?? [];
              const bias = biases?.[l]?.[hover.i] ?? 0;
              let mx = 0, sum = 0;
              for (const w of row) { mx = Math.max(mx, Math.abs(w)); sum += Math.abs(w); }
              const mean = row.length ? sum / row.length : 0;
              return (
                <>
                  <div className="tip-title">hidden {l + 1} · node {hover.i}</div>
                  <div className="tip-row"><span>activation</span><b>{act[hover.i].toFixed(3)}</b></div>
                  <div className="tip-row"><span>in · {prev} weights</span><b>{row.length} params</b></div>
                  <div className="tip-row"><span>|w| max / mean</span><b>{mx.toFixed(3)} / {mean.toFixed(3)}</b></div>
                  <div className="tip-row"><span>bias</span><b>{bias.toFixed(3)}</b></div>
                  <div className="tip-row"><span>out · {next}</span><b>{next} params</b></div>
                </>
              );
            }
            const l = hiddenCols.length;
            const prev = hiddenCols[l - 1]?.length ?? inputSize;
            const row = weights?.[l]?.slice(hover.i * prev, (hover.i + 1) * prev) ?? [];
            const bias = biases?.[l]?.[hover.i] ?? 0;
            let mx = 0, sum = 0;
            for (const w of row) { mx = Math.max(mx, Math.abs(w)); sum += Math.abs(w); }
            const mean = row.length ? sum / row.length : 0;
            return (
              <>
                <div className="tip-title">output · class {labels[hover.i] ?? hover.i}</div>
                <div className="tip-row"><span>probability</span><b>{(out[hover.i] * 100).toFixed(1)}%</b></div>
                <div className="tip-row"><span>in · {prev} weights</span><b>{row.length} params</b></div>
                <div className="tip-row"><span>|w| max / mean</span><b>{mx.toFixed(3)} / {mean.toFixed(3)}</b></div>
                <div className="tip-row"><span>bias</span><b>{bias.toFixed(3)}</b></div>
              </>
            );
          })()}
        </div>
        <div className="net-zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button className="zoom-btn" title="zoom out" onClick={() => zoomBy(1 / 1.3)}>−</button>
          <button className="zoom-btn" title="zoom in" onClick={() => zoomBy(1.3)}>+</button>
          <button
            className="zoom-btn"
            title="reset view"
            onClick={() => {
              const cw = canvasRef.current?.clientWidth;
              if (cw) setView({ x: 8, y: 8, s: Math.min(1, (cw - 16) / WORLD_W) });
            }}
          >
            ↺
          </button>
        </div>
      </div>
      <div className="net-captions">
        <span>input · {grid?.length ?? 0}px</span>
        {hiddenCols.map((act, l) => (
          <span key={l}>relu · {act.length}</span>
        ))}
        <span>softmax · {out.length}</span>
        <span className="net-hint-text">drag to pan · scroll to zoom</span>
      </div>
    </div>
  );
}
