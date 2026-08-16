import { useState } from "react";
import { CodeBlock, CopyButton } from "../components/CodeBlock";
import ExamplePreview from "../components/Example/ExamplePreview";
import { initCode, nnCode, quickstartCode } from "../example";

const installCommands = [
  { label: "npm", cmd: "npm install @felixfern/num-wasm" },
  { label: "pnpm", cmd: "pnpm add @felixfern/num-wasm" },
  { label: "yarn", cmd: "yarn add @felixfern/num-wasm" },
  { label: "bun", cmd: "bun add @felixfern/num-wasm" },
];

const demos = [
  {
    title: "Handwritten digit demo",
    desc: "Train an MLP on MNIST live in the browser and read back drawn digits — forward pass and backprop running on the Zig WASM kernel.",
    href: "https://numwasm-demos.vercel.app/#/handwritten",
  },
  {
    title: "K-means clustering",
    desc: "Lloyd's algorithm on 2D points — assignment by matmul + argmin, centroids as (GᵀP)/ΣG, animate each iteration.",
    href: "https://numwasm-demos.vercel.app/#/kmeans",
  },
  {
    title: "Linear & logistic regression",
    desc: "Gradient descent on wasm — click the plot to add points and watch the curve refit live.",
    href: "https://numwasm-demos.vercel.app/#/regression",
  },
  {
    title: "K-nearest neighbours",
    desc: "Lazy classifier — matmul distances, iterated argmin top-k, click anywhere to probe the decision boundary.",
    href: "https://numwasm-demos.vercel.app/#/knn",
  },
  {
    title: "PCA",
    desc: "Covariance and power iteration on wasm — top eigenvector, variance explained, rotated projection.",
    href: "https://numwasm-demos.vercel.app/#/pca",
  },
  {
    title: "Image convolution",
    desc: "3×3 filters (blur, sharpen, sobel, …) as a single patches-matmul over a 28×28 image.",
    href: "https://numwasm-demos.vercel.app/#/convolve",
  },
  {
    title: "Monte Carlo π",
    desc: "Hit-or-miss sampling on wasm — uniform draws, sum(x²+y²)<1, watch the estimate converge to π.",
    href: "https://numwasm-demos.vercel.app/#/monte",
  },
];

const features = [
  {
    title: "Zig core",
    desc: "Array math lives in a hand-written wasm32-freestanding Zig kernel. No runtime, no GC in the hot path.",
  },
  {
    title: "Thin WASM layer",
    desc: "The exports are raw ops. A small JS glue library owns allocation, shapes and lifetime via NdArray.",
  },
  {
    title: "Auto-cleanup",
    desc: "Leaks are non-fatal — a FinalizationRegistry frees forgotten arrays and warns on GC. .free() for deterministic release.",
  },
  {
    title: "Broadcasting",
    desc: "NumPy-style shape broadcasting on every binary op. Add a (10,m) matrix to a (10,1) vector directly.",
  },
  {
    title: "Seeded & deterministic",
    desc: "Random is seeded — the same seed always reproduces the same sequence. Weight init, noise, and experiments are repeatable run to run.",
  },
  {
    title: "f64, flat storage",
    desc: "Single dtype, flat []f64 storage. No strides, no dtype enum dispatch — predictable performance.",
  },
];

function Home() {
  const [pm, setPm] = useState(0);

  return (
    <div className="max-w-4xl px-6 mx-auto">
      <section className="py-16 md:py-24">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          NumPy for the browser,
          <br />
          <span className="text-zinc-500">built in Zig.</span>
        </h1>
        <p className="max-w-xl mt-4 text-base text-zinc-400 md:text-lg">
          A NumPy-like array library compiled to WebAssembly. Creation,
          broadcasting, reductions, linear algebra and neural-network ops
          behind a clean TypeScript API.
        </p>

        <div className="mt-8 overflow-hidden bg-black border rounded-xl border-zinc-800">
          <div className="flex items-center gap-1 border-b border-zinc-800 px-3 py-1.5">
            {installCommands.map((item, i) => (
              <button
                key={item.label}
                onClick={() => setPm(i)}
                className={`rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                  pm === i
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <code className="font-mono text-sm text-zinc-300">
              {installCommands[pm].cmd}
            </code>
            <CopyButton text={installCommands[pm].cmd} />
          </div>
        </div>
      </section>

      <section className="pb-16">
        <h2 className="mb-1 text-lg font-semibold">Try it</h2>
        <p className="mb-6 text-sm text-zinc-500">
          A live NdArray — each op runs through the same shape/broadcast
          machinery as the WASM kernel.
        </p>
        <ExamplePreview />
      </section>

      <section className="pb-16">
        <h2 className="mb-1 text-lg font-semibold">Demos</h2>
        <p className="mb-6 text-sm text-zinc-500">
          The library in action.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((d) => (
            <div
              key={d.title}
              className="flex flex-col gap-4 p-5 border rounded-xl border-zinc-800 bg-zinc-900/30"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{d.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  {d.desc}
                </p>
              </div>
              {d.href ? (
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  Open demo →
                </a>
              ) : (
                <span className="shrink-0 text-xs uppercase tracking-wider text-zinc-600">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <h2 className="mb-1 text-lg font-semibold">How it works</h2>
        <p className="mb-6 text-sm text-zinc-500">
          Initialize once, allocate arrays, and let the Zig kernel do the math.
        </p>
        <div className="flex flex-col gap-4">
          <CodeBlock title="init.ts" code={initCode} lang="ts" />
          <CodeBlock title="quickstart.ts" code={quickstartCode} lang="ts" />
          <CodeBlock title="mlp.ts" code={nnCode} lang="ts" />
        </div>
      </section>

      <section className="pb-16">
        <h2 className="mb-6 text-lg font-semibold">Why num-wasm</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-5 border rounded-xl border-zinc-800 bg-zinc-900/30"
            >
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
