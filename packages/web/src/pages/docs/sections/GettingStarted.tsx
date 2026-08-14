import { CodeBlock } from "@/components/CodeBlock";
import { InlineCode } from "@/components/InlineCode";
import { code } from "../data";

export function GettingStarted() {
  return (
    <section id="getting-started" className="scroll-mt-24">
      <h2 className="text-2xl font-bold">Getting Started</h2>
      <p className="mt-3 text-zinc-400">
        A NumPy-like array library written in Zig, compiled to WebAssembly,
        with a clean TypeScript API. Requires Node &gt;= 18.
      </p>

      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">1. Install</h3>
        <CodeBlock title="terminal" code={code.install} lang="bash" />

        <h3 className="text-lg font-semibold">2. Initialize</h3>
        <CodeBlock title="init.ts" code={code.init} lang="ts" />

        <h3 className="text-lg font-semibold">3. Create &amp; compute</h3>
        <CodeBlock title="quickstart.ts" code={code.quickstart} lang="ts" />

        <h3 className="text-lg font-semibold">4. In the browser</h3>
        <CodeBlock title="app.ts" code={code.browser} lang="ts" />

        <p className="text-sm text-zinc-400">
          Everything is fully typed — shapes are just{" "}
          <InlineCode>number[]</InlineCode>, ops return{" "}
          <InlineCode>NdArray</InlineCode>, and{" "}
          <InlineCode>argmax(a, {"{ axis: 1 }"})</InlineCode> returns indices
          per row.
        </p>
      </div>
    </section>
  );
}
