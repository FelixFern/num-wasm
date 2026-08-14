import { CodeBlock } from "@/components/CodeBlock";
import { InlineCode } from "@/components/InlineCode";
import { code } from "../data";

const rows: { signature: string; desc: string }[] = [
  {
    signature: "a.toArray()",
    desc: "Copy the values out as a plain nested number[] (shape-aware).",
  },
  {
    signature: "a.toTypedArray()",
    desc: "Copy the flat data as a Float64Array — fast path when you only need the raw buffer.",
  },
  {
    signature: "a.shape / a.data",
    desc: "Getters: shape is number[], data is the flat Float64Array view into WASM memory.",
  },
  {
    signature: "a.free()",
    desc: "Release the WASM allocation immediately. Idempotent — calling it again is safe.",
  },
];

export function NdArray() {
  return (
    <section id="ndarray" className="scroll-mt-24">
      <h2 className="text-2xl font-bold">NdArray memory</h2>
      <p className="mt-3 text-zinc-400">
        Every op returns an <InlineCode>NdArray</InlineCode> handle that owns a
        buffer in WASM memory. JS never touches the kernel directly — you read
        results out with <InlineCode>toArray()</InlineCode> /{" "}
        <InlineCode>toTypedArray()</InlineCode>.
      </p>

      <div className="mt-4 p-4 border rounded-xl border-zinc-800 bg-zinc-900/30">
        {rows.map((r) => (
          <div
            key={r.signature}
            className="py-2.5 border-b border-zinc-800/60 last:border-b-0"
          >
            <code className="font-mono text-sm text-zinc-200">
              {r.signature}
            </code>
            <p className="mt-0.5 text-sm text-zinc-500">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <CodeBlock title="ndarray.ts" code={code.ndarray} lang="ts" />
      </div>

      <div className="mt-4 p-4 border rounded-xl border-amber-900/40 bg-amber-950/20">
        <p className="text-sm leading-relaxed text-zinc-400">
          <span className="text-amber-400">Note:</span> forgetting{" "}
          <InlineCode>.free()</InlineCode> is non-fatal — a{" "}
          <InlineCode>FinalizationRegistry</InlineCode> frees leaked arrays and
          warns on GC. In tight training loops, call{" "}
          <InlineCode>.free()</InlineCode> on intermediates each iteration;
          the registry only fires when GC runs.
        </p>
      </div>
    </section>
  );
}
