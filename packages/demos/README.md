# @felixfern/num-wasm — browser demos

Seven interactive demos that run **entirely in the browser on WebAssembly**, all backed by [`num-wasm`](https://github.com/FelixFern/numwasm) (NumPy-like array ops in Zig, compiled to WASM). Pick a demo from the nav pills.

| Demo | Route | What it shows |
| --- | --- | --- |
| **handwritten** | `#/handwritten` | Draw a digit on a 28×28 pad; an MLP reads it back, live per-class confidence |
| **k-means** | `#/kmeans` | Lloyd's algorithm on 2D points — scatter, cluster colors, centroid animation, inertia monitor |
| **regression** | `#/regression` | Linear + logistic gradient descent — click to add points, watch the curve refit |
| **k-nn** | `#/knn` | Lazy classifier — decision-boundary grid, matmul distances, click to probe |
| **pca** | `#/pca` | Power iteration — covariance, top eigenvector, variance explained, rotated projection |
| **convolve** | `#/convolve` | 3×3 image filters (blur/sharpen/sobel/…) — patches into a single matmul |
| **monte carlo** | `#/monte` | Hit-or-miss π — uniform samples, watch the estimate converge |

## How it works

- **`@felixfern/num-wasm`** — the package auto-resolves its own wasm in the browser via `NumWasm.init()` (`new URL("../num-wasm.wasm", import.meta.url)` inside the library; bundlers rewrite it to a fetchable asset). One shared instance across demos; workers each call `NumWasm.init()`.
- **All math is num-wasm ops.** No hand-rolled RNG, no JS math kernels — synthetic data, distances, gradients, sigmoids and losses are all built from `random`, `matmul`, `argmin`, `equal`, `divide`, `exp`, `log`, `dot`, `sum`/`min` (axis) etc. JS is used only to move arrays around (build rows, read results).
- **Speed control** — each iterative demo has a `speed` select (fast / slow / slower / step) that throttles per-iteration progress so you can watch the algorithm converge.

### handwritten

- MLP (784 → ReLU layers → softmax, default hidden `64,32,16`) trains via mini-batch SGD in `src/trainWorker.ts` so the UI stays responsive; validation accuracy streams back via `postMessage`.
- Canvas input is bbox-cropped, centered, rescaled to MNIST density, then fed as 784 inputs.
- Weights auto-save to `localStorage`; Save/Load JSON in the train bar.
- Data: `public/dataset.csv` (MNIST train subset), `public/mnist_test.csv` (eval), or any `label,pixels` CSV import.

### k-means

- Synthetic blob clusters — num-wasm `random` noise around randomized, well-separated center draws (rejection-sampled via num-wasm `random`; new layout on every Regenerate).
- Assignment: squared distances via `|p|² + |c|² − 2p·cᵀ` (`matmul`), then `argmin`; membership matrix via broadcast `equal`; centroids as `(GᵀP)/ΣG` in a single `matmul`.
- K-means++ seeding; scrub slider replays every iteration; inertia sparkline + cluster sizes.

### regression

- Synthetic data: `y = 2.5x − 1 + noise` (linear) or Bernoulli `p = σ(8(x − 0.5))` (logistic).
- Batch gradient descent: gradients via `dot`/`sum`, logistic sigmoid via `exp`/`divide`, BCE loss via `log`.
- Click the plot to add points (logistic: click upper half = class 1); every config change resets the stale fit.

### k-nn

- Synthetic blobs (ring centers + num-wasm noise). Distances via the same `|p|² + |q|² − 2pqᵀ` matmul trick.
- Top-k by iterated `argmin` + mask (no sort op needed); majority votes summed per cell.
- Click anywhere on the boundary plot to probe a point and see its k neighbors.

### pca

- Anisotropic 2D gaussian. Covariance `(P−μ)ᵀ(P−μ)/n` via `mean`/`matmul`.
- Power iteration `v ← cov·v`, normalized with `sqrt`; variance explained = `vᵀcov·v / trace`.
- Bottom panel shows the data rotated into the PC basis (de-correlated).

### convolve

- Synthetic 28×28 patterns (rings / diag / checker / noise — noise from num-wasm `random`).
- Sliding 3×3 patches flattened into a `(H−2)(W−2) × 9` matrix, one `matmul` against the kernel.
- Output min-max normalized with num-wasm `min`/`max`; kernels: identity, box blur, sharpen, edge, sobel-x, emboss.

### monte carlo

- π by hit-or-miss: uniform points via num-wasm `random`, inside test `sum(x²+y²) < 1` via `sum` + `lessScalar`.
- Estimate `4·in/total` streams per batch; sparkline shows convergence to π.

## Run

```bash
pnpm install
pnpm dev
```

`@felixfern/num-wasm` is a workspace dependency (`workspace:*`), so edits to `packages/core` are picked up live. From the monorepo root: `pnpm --filter @felixfern/num-wasm-demos dev`.

## Verify (headless)

```bash
pnpm verify               # MLP on the synthetic dataset
pnpm verify:kmeans        # k-means purity + monotone inertia
pnpm verify:regression    # linear w/b recovery + logistic accuracy
pnpm verify:knn           # grid classes match ring Voronoi
pnpm verify:pca           # top eigenvector: unit, stable, ≥60% variance
pnpm verify:convolve      # identity kernel exact, blur smooths, edge pops
pnpm verify:monte         # π estimate within tolerance
```

## Project layout

```
src/
├── App.tsx               # shell: NumWasm.init(), hash routing, theme, demo nav
├── HandwrittenDemo.tsx   # MLP digit demo
├── KMeansDemo.tsx        # k-means demo
├── RegressionDemo.tsx    # linear/logistic demo
├── KnnDemo.tsx           # k-NN demo
├── PcaDemo.tsx           # PCA demo
├── ConvolveDemo.tsx      # image-filter demo
├── MonteDemo.tsx         # Monte Carlo π demo
├── NetworkViz.tsx        # net diagram for the MLP demo
├── components/
│   ├── Sparkline.tsx     # monitor sparkline
│   └── usePlotSize.ts    # plot canvas sizing hook
└── lib/
    ├── data.ts           # CSV grid parsing + synthetic dataset
    ├── mlp.ts            # init/train/predict MLP (num-wasm ops)
    ├── kmeans.ts         # generate/fit k-means (num-wasm ops)
    ├── regression.ts     # generate/train linear + logistic (num-wasm ops)
    ├── knn.ts            # generate/classify k-NN (num-wasm ops)
    ├── pca.ts            # covariance + power iteration (num-wasm ops)
    ├── convolve.ts       # patches-matmul image filters (num-wasm ops)
    ├── monte.ts          # hit-or-miss π sampling (num-wasm ops)
    └── palette.ts        # cluster color palette
scripts/
├── verify.ts             # headless MLP check
├── verify-kmeans.ts      # headless k-means check
├── verify-regression.ts  # headless regression check
├── verify-knn.ts         # headless k-NN check
├── verify-pca.ts         # headless PCA check
├── verify-convolve.ts    # headless convolution check
└── verify-monte.ts       # headless Monte Carlo check
```
