import { NumWasm } from "@felixfern/num-wasm/browser";
import { useEffect, useState } from "react";
import "./App.css";
import { HandwrittenDemo } from "./HandwrittenDemo";
import { KMeansDemo } from "./KMeansDemo";
import { RegressionDemo } from "./RegressionDemo";
import { KnnDemo } from "./KnnDemo";
import { PcaDemo } from "./PcaDemo";
import { ConvolveDemo } from "./ConvolveDemo";
import { MonteDemo } from "./MonteDemo";

type DemoKey = "handwritten" | "kmeans" | "regression" | "knn" | "pca" | "convolve" | "monte";

const DEMOS: { key: DemoKey; slug: string; label: string; lede: string }[] = [
  {
    key: "handwritten",
    slug: "handwritten",
    label: "handwritten",
    lede: "MLP trained in-browser on wasm — draw a digit, the net reads it back.",
  },
  {
    key: "kmeans",
    slug: "kmeans",
    label: "k-means",
    lede: "Lloyd's algorithm on wasm — assignment by matmul + argmin, centroids by (GᵀP)/ΣG.",
  },
  {
    key: "regression",
    slug: "regression",
    label: "regression",
    lede: "Linear + logistic gradient descent on wasm — click the plot to add points, watch it refit.",
  },
  {
    key: "knn",
    slug: "knn",
    label: "k-nn",
    lede: "Lazy classifier on wasm — matmul distances, iterated argmin top-k, click to probe.",
  },
  {
    key: "pca",
    slug: "pca",
    label: "pca",
    lede: "Power iteration on wasm — covariance, top eigenvector, variance explained.",
  },
  {
    key: "convolve",
    slug: "convolve",
    label: "convolve",
    lede: "3×3 image filters on wasm — patches into a single matmul, blur to sobel.",
  },
  {
    key: "monte",
    slug: "monte",
    label: "monte carlo",
    lede: "Hit-or-miss π on wasm — uniform samples, sum(x²+y²)<1, watch the estimate converge.",
  },
];

function parseDemo(): DemoKey {
  const h = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (h === "kmeans" || h === "regression" || h === "knn" || h === "pca" || h === "convolve" || h === "monte") {
    return h;
  }
  return "handwritten";
}

export default function App() {
  const [demo, setDemo] = useState<DemoKey>(parseDemo);
  const [nw, setNw] = useState<NumWasm | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const onHash = () => setDemo(parseDemo());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setIsDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let alive = true;
    NumWasm.init()
      .then((instance) => alive && setNw(instance))
      .catch((err: Error) => alive && setInitError(err.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.title = `@felixfern/num-wasm/${DEMOS.find((d) => d.key === demo)?.label ?? "demos"}`;
  }, [demo]);

  const meta = DEMOS.find((d) => d.key === demo)!;

  return (
    <div className="page" data-demo={demo}>
      <header className="masthead">
        <img src="./numwasm.svg" className="brand-logo" alt="" />
        <p className="kicker">
          <a href="https://numwasm.vercel.app" className="kicker-link">
            <span className="brand-dim">@felixfern</span>/num-wasm
          </a>
        </p>
        <nav className="demo-nav" aria-label="demos">
          {DEMOS.map((d) => (
            <a
              key={d.key}
              href={`#/${d.slug}`}
              className={"nav-pill" + (d.key === demo ? " active" : "")}
              aria-current={d.key === demo ? "page" : undefined}
            >
              {d.label}
            </a>
          ))}
        </nav>
        <p className="lede">{meta.lede}</p>
      </header>

      {demo === "handwritten" && <HandwrittenDemo nw={nw} initError={initError} isDark={isDark} />}
      {demo === "kmeans" && <KMeansDemo nw={nw} initError={initError} />}
      {demo === "regression" && <RegressionDemo nw={nw} initError={initError} />}
      {demo === "knn" && <KnnDemo nw={nw} initError={initError} />}
      {demo === "pca" && <PcaDemo nw={nw} initError={initError} />}
      {demo === "convolve" && <ConvolveDemo nw={nw} initError={initError} />}
      {demo === "monte" && <MonteDemo nw={nw} initError={initError} />}
    </div>
  );
}
