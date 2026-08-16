import { useEffect, useRef, useState } from "react";
import type { NumWasm } from "@felixfern/num-wasm/browser";
import type { PatternKind } from "./lib/convolve";
import { KERNELS, SIZE, convolve, generatePatternImage, normalizeImage } from "./lib/convolve";

function GridCanvas({ data, cols, rows }: { data: number[]; cols: number; rows: number }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cols;
    cv.height = rows;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      const v = Math.max(0, Math.min(255, Math.round(data[i] ?? 0)));
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [data, cols, rows]);

  useEffect(() => {
    const holder = holderRef.current;
    const cv = canvasRef.current;
    if (!holder || !cv) return;
    const fit = () => {
      const s = Math.max(48, Math.min(holder.clientWidth, holder.clientHeight) - 10);
      cv.style.width = `${s}px`;
      cv.style.height = `${s}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(holder);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="grid-holder" ref={holderRef}>
      <canvas ref={canvasRef} className="grid-canvas" />
    </div>
  );
}

export function ConvolveDemo({ nw, initError }: { nw: NumWasm | null; initError: string | null }) {
  const [pattern, setPattern] = useState<PatternKind>("rings");
  const [kernelIdx, setKernelIdx] = useState(2);
  const [image, setImage] = useState<number[]>([]);
  const [out, setOut] = useState<number[]>([]);
  const seedRef = useRef(42);

  const kernel = KERNELS[kernelIdx] ?? KERNELS[0];
  const outSize = SIZE - 2;

  const runFilter = () => {
    if (!nw) return;
    seedRef.current += 1;
    const img = generatePatternImage(nw, pattern, seedRef.current);
    const conv = convolve(nw, img, kernel.kernel);
    const norm = normalizeImage(nw, conv).map((v) => v * 255);
    conv.free();
    setImage(img);
    setOut(norm);
  };

  useEffect(() => {
    if (nw) runFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw, pattern]);

  useEffect(() => {
    if (nw && image.length > 0) {
      const conv = convolve(nw, image, kernel.kernel);
      const norm = normalizeImage(nw, conv).map((v) => v * 255);
      conv.free();
      setOut(norm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nw, kernelIdx]);

  return (
    <div className="notebook">
      {initError && <div className="stamp error">init failed: {initError}</div>}

      <section className="sheet train-sheet">
        <label className="cfg">
          <span>pattern</span>
          <select
            className="field speed"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as PatternKind)}
          >
            {(["rings", "diag", "checker", "noise"] as const).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="cfg">
          <span>kernel</span>
          <select className="field speed" value={kernelIdx} onChange={(e) => setKernelIdx(+e.target.value)}>
            {KERNELS.map((k, i) => (
              <option key={k.name} value={i}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn ghost" onClick={runFilter} disabled={!nw}>
          Regenerate
        </button>
        <div className="kernel-box" title={kernel.desc}>
          <span className="kernel-name">{kernel.name}</span>
          <div className="kernel-grid">
            {kernel.kernel.flat().map((v, i) => (
              <span key={i} className="kernel-cell">
                {v}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="sheet src-sheet">
        <h2 className="sheet-title">Source {SIZE}×{SIZE}</h2>
        {image.length > 0 && <GridCanvas data={image} cols={SIZE} rows={SIZE} />}
        <p className="meta-line">3×3 patches extracted row-major, then one matmul</p>
      </section>

      <section className="sheet out-sheet">
        <h2 className="sheet-title">Filtered {outSize}×{outSize}</h2>
        {out.length > 0 && <GridCanvas data={out} cols={outSize} rows={outSize} />}
        <p className="meta-line">{kernel.desc} · min-max scaled to 0–255</p>
      </section>
    </div>
  );
}
