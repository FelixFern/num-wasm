# num-wasm

A NumPy-like array library written in **Zig**, compiled to **WebAssembly**, with a clean **TypeScript** API.

- **Zig core** — `f64` arrays, flat storage, no strides. Compiled to `wasm32-freestanding`.
- **Thin WASM layer** — exports raw ops; JS owns memory via `NdArray` with auto-cleanup.
- **NumPy-style** — creation, shape ops, broadcasting, element-wise, reductions, slicing, linear algebra, plus the ops you need to build a neural network (`random`, `maximum`, comparisons, axis `argmax`).

## Install

```bash
npm install @felixfern/num-wasm
```

## Quick Start

```typescript
import { NumWasm } from "@felixfern/num-wasm";

const nw = await NumWasm.init();

const a = nw.array([[1, 2, 3], [4, 5, 6]]);
const b = nw.ones([2, 3]);
const c = nw.add(a, b);           // broadcasting
const s = nw.sum(c, { axis: 0 });

console.log(s.toArray());         // [7, 9, 11]
a.free(); b.free(); c.free();     // optional — FinalizationRegistry auto-frees
```

## Demo

Train an MLP on MNIST live in the browser and read back drawn digits — forward pass and backprop running on the WASM kernel.

**[numwasm-handwritten.vercel.app](https://numwasm-handwritten.vercel.app/)**

## API

Full reference in [NumPy-style docs](https://github.com/FelixFern/numwasm/tree/main/packages/web) — per-method signatures, parameters, returns, and examples.

Quick tour:

| Group | Ops |
| --- | --- |
| Creation | `zeros`, `ones`, `full`, `arange`, `linspace`, `random` (seeded), `array` |
| Shape | `reshape`, `transpose`, `flatten`, `squeeze`, `slice`, `indexAxis` |
| Element-wise | `add`, `subtract`, `multiply`, `divide`, `negate`, `abs`, `sqrt`, `exp`, `log`, `maximum`, `minimum`, `greater`, `less`, `equal`, `where` + `*Scalar` variants |
| Reductions | `sum`, `mean`, `max`, `min`, `prod`, `argmax`, `argmin` — all with `{ axis }` |
| Linear algebra | `dot`, `matmul`, `outer`, `broadcastShapes` |
| `NdArray` | `.toArray()`, `.toTypedArray()`, `.shape`, `.data`, `.free()` (idempotent) |

## Repository layout

pnpm workspace (monorepo).

| Package | Path | Description |
| --- | --- | --- |
| `@felixfern/num-wasm` | [`packages/core`](./packages/core) | The library — Zig kernel → WASM, TS API |
| `@felixfern/num-wasm-web` | [`packages/web`](./packages/web) | Landing page + docs (Vite + React) |

## Development

Requires [Node.js](https://nodejs.org/) ≥ 18, [pnpm](https://pnpm.io/), and [Zig](https://ziglang.org/) 0.15.2.

```bash
pnpm install
zig build test                    # native Zig tests (from packages/core)
zig build wasm                    # build WASM binary (from packages/core)
pnpm --filter @felixfern/num-wasm run build   # compile TS + copy wasm into dist/
pnpm --filter @felixfern/num-wasm test        # Node/TS tests
pnpm --filter @felixfern/num-wasm-web dev     # docs site dev server
```

Publishing requires Zig on PATH — `prepublishOnly` rebuilds the WASM binary.

## Design choices

- **f64 only** — no dtype enum, no generic type dispatch
- **Flat `[]f64` storage** — no pointer casting, no strides
- **Copy-based operations** — no views, no ownership tracking
- **Row-major (C-contiguous)** — no Fortran order

These simplifications keep the code approachable. Upgrade path: strides + `[*]u8` + dtype enum when performance matters.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

ISC — see [packages/core/package.json](./packages/core/package.json).
