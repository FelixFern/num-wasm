import { useCallback, useState } from "react";

type Matrix = number[][];

const initial: Matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const addScalar = (m: Matrix, s: number) => m.map((r) => r.map((v) => v + s));
const scale = (m: Matrix, s: number) => m.map((r) => r.map((v) => v * s));
const negate = (m: Matrix) => m.map((r) => r.map((v) => -v));
const transpose = (m: Matrix) =>
  m[0].map((_, c) => m.map((r) => r[c]));
const sumAxis0 = (m: Matrix): Matrix => [
  m[0].map((_, c) => m.reduce((acc, r) => acc + r[c], 0)),
];

interface OpButton {
  label: string;
  color: string;
  run: (m: Matrix) => Matrix;
}

const ops: OpButton[] = [
  { label: "add(a, 1)", color: "bg-emerald-600 hover:bg-emerald-500", run: (m) => addScalar(m, 1) },
  { label: "multiply(a, 2)", color: "bg-blue-600 hover:bg-blue-500", run: (m) => scale(m, 2) },
  { label: "negate(a)", color: "bg-red-600 hover:bg-red-500", run: (m) => negate(m) },
  { label: "transpose(a)", color: "bg-violet-600 hover:bg-violet-500", run: (m) => transpose(m) },
  { label: "sum(a, { axis: 0 })", color: "bg-zinc-700 hover:bg-zinc-600", run: (m) => sumAxis0(m) },
  { label: "reset", color: "bg-zinc-700 hover:bg-zinc-600", run: () => initial },
];

const ExamplePreview = () => {
  const [matrix, setMatrix] = useState<Matrix>(initial);

  const run = useCallback((op: OpButton) => {
    setMatrix(op.run(matrix));
  }, [matrix]);

  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  return (
    <div className="p-5 border rounded-xl border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-sm font-medium text-zinc-300">NdArray</span>
        <span className="font-mono text-xs text-zinc-600">
          shape: [{rows}, {cols}]
        </span>
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {matrix.map((row, r) =>
          row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className="py-2 font-mono text-sm text-center rounded-md bg-zinc-900 border border-zinc-800"
            >
              {v.toFixed(1)}
            </div>
          )),
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {ops.map((op) => (
          <button
            key={op.label}
            onClick={() => run(op)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${op.color}`}
          >
            {op.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExamplePreview;
