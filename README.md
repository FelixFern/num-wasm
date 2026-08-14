# num-wasm

A NumPy-like array library written in Zig, compiled to WebAssembly, with a clean TypeScript API.

- **Zig core** — `f64` arrays, flat storage, no strides. Compiled to `wasm32-freestanding`.
- **Thin WASM layer** — exports raw ops; JS owns memory via `NdArray` with auto-cleanup.
- **NumPy-style** — creation, shape ops, broadcasting, element-wise, reductions, slicing, linear algebra, plus the ops you need to build a neural network (`random`, `maximum`, comparisons, axis `argmax`).

## Install

```bash
npm install num-wasm
```

## Quick Start

```typescript
import { NumWasm } from "num-wasm";

const nw = await NumWasm.init();

const a = nw.array([[1, 2, 3], [4, 5, 6]]);
const b = nw.ones([2, 3]);
const c = nw.add(a, b);           // broadcasting
const s = nw.sum(c, { axis: 0 });

console.log(s.toArray());         // [7, 9, 11]
a.free(); b.free(); c.free();     // optional — FinalizationRegistry auto-frees
```

## API

### Creation
| Method | Description |
| --- | --- |
| `nw.zeros(shape)` | array of `0` |
| `nw.ones(shape)` | array of `1` |
| `nw.full(shape, value)` | array filled with `value` |
| `nw.arange(start, stop, step)` | evenly spaced 1-D |
| `nw.linspace(start, stop, count)` | `count` points, inclusive |
| `nw.random(shape, seed)` | uniform `[0, 1)`; seeded, deterministic |
| `nw.array(jsData)` | nested JS arrays → `NdArray`, shape inferred |

### Shape manipulation
`reshape`, `transpose`, `flatten`, `squeeze`, `slice`, `indexAxis`

### Element-wise (broadcast-aware)
`add`, `subtract`, `multiply`, `divide`, `negate`, `abs`, `sqrt`, `exp`, `log`, `maximum`, `minimum`, `greater`, `less`, `equal`, plus `*Scalar` variants (`addScalar`, `maximumScalar`, `greaterScalar`, ...)

### Reductions
`sum`, `mean`, `max`, `min`, `prod`, `argmax`, `argmin` — all support `{ axis }`

### Linear algebra
`dot` (1-D → `number`), `matmul` (2-D), `outer`

### Broadcasting
`broadcastShapes(a, b)` → `number[]`

### `NdArray`
- `.toArray()` — `number[]`
- `.toTypedArray()` — copy as `Float64Array`
- `.shape`, `.data` getters
- `.free()` — release WASM memory (idempotent). Forgetting is non-fatal: a `FinalizationRegistry` frees leaked arrays and warns on GC.

> In tight training loops, call `.free()` on intermediates each iteration — the registry only fires on GC.

## Example: neural network building blocks

The ops compose directly into a 2-layer MLP (forward + backprop + gradient descent) written in JS:

```typescript
const W1 = nw.addScalar(nw.random([10, 784], 42), -0.5);
const b1 = nw.addScalar(nw.random([10, 1], 42), -0.5);

// forward: Z1 = W1 @ X + b1 ; A1 = ReLU(Z1) ; A2 = softmax(W2 @ A1 + b2)
const Z1 = nw.add(nw.matmul(W1, X), b1);   // (10,m) + (10,1) broadcasts
const A1 = nw.maximumScalar(Z1, 0);        // ReLU
// one-hot: transpose(equal(y.(m,1), classes)) ; predictions: argmax(A2, {axis:0})
```

## Development

```bash
pnpm install
zig build test          # native Zig tests
zig build wasm          # build WASM binary
pnpm run build          # compile TS + copy wasm into dist/
pnpm test               # Node/TS tests
pnpm run typecheck
```

Publish requires Zig on PATH (`prepublishOnly` rebuilds WASM).

## Design Choices

- **f64 only** — no dtype enum, no generic type dispatch
- **Flat `[]f64` storage** — no pointer casting, no strides
- **Copy-based operations** — no views, no ownership tracking
- **Row-major (C-contiguous)** — no Fortran order

These simplifications keep the code approachable. Upgrade path: strides + `[*]u8` + dtype enum when performance matters.

## Roadmap

| Phase | Feature                                             | Status |
| ----- | --------------------------------------------------- | ------ |
| 1     | Toolchain setup, hello WASM                         | Done   |
| 2     | NDArray core data structure                         | Done   |
| 3     | Array creation functions                            | Done   |
| 4     | Shape manipulation                                  | Done   |
| 5     | Broadcasting                                        | Done   |
| 6     | Element-wise operations                             | Done   |
| 7     | Reduction operations                                | Done   |
| 8     | Slicing and indexing                                | Done   |
| 9     | Linear algebra                                      | Done   |
| 10    | JS glue library                                     | Done   |
| 11    | NumPy-like ops for NN                               | Done   |

See [PLAN.md](./docs/PLAN.md) for detailed implementation plans.
