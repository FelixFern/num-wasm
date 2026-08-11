# num-wasm — Usage Guide

NumPy-like array library in Zig, compiled to WebAssembly. `f64` only, flat row-major arrays, copy-based ops.

## Prerequisites

- Zig 0.15.2+
- Node.js 22+

## Install & Build

```bash
pnpm install         # install tsx, typescript, @types/node
zig build test       # native Zig tests (17 tests) — instant feedback
zig build wasm       # compile WASM binary -> zig-out/bin/num-wasm.wasm
npx tsx tests/test.ts # TypeScript integration tests (8 tests)
npm test             # alias for the above
```

Order matters: build WASM **before** running TS tests, or `nw.ts` can't load the binary.

## Build Steps

| Command           | What it does                          | Output                |
| ----------------- | ------------------------------------- | --------------------- |
| `zig build test`  | Runs native Zig tests                 | —                     |
| `zig build wasm`  | Compiles WASM binary (`ReleaseFast`)  | `zig-out/bin/num-wasm.wasm` |
| `zig build run`   | Runs CLI playground (`src/main.zig`)  | —                     |
| `npx tsx tests/test.ts` / `npm test` | Runs TS integration tests | — |

## Usage (TypeScript)

```typescript
import { NumWasm } from "./src/nw";

const nw = await NumWasm.init();

const a = nw.zeros([2, 3]);      // { data: [0,0,0,0,0,0], shape: [2,3] }
const b = nw.ones([2, 3]);       // { data: [1,1,1,1,1,1], shape: [2,3] }
const c = nw.full([2, 2], 7.5);  // { data: [7.5,7.5,7.5,7.5], shape: [2,2] }
const d = nw.arange(0, 5, 1);    // { data: [0,1,2,3,4],      shape: [5] }
const e = nw.linspace(0, 1, 5);  // { data: [0,0.25,0.5,0.75,1], shape: [5] }
```

### Available API (current)

All return `{ data: number[], shape: number[] }`.

- `nw.zeros(shape)` — array of zeros
- `nw.ones(shape)` — array of ones
- `nw.full(shape, value)` — array filled with `value`
- `nw.arange(start, stop, step)` — 1D range
- `nw.linspace(start, stop, count)` — 1D evenly spaced (inclusive)

## Project Layout

```
src/
├── core/ndarray.zig   # NDArray struct + flatIndex/getItem/setItem
├── core/creation.zig  # zeros, ones, full, arange, linspace
├── wasm_api.zig       # WASM exports (thin wrapper)
├── root.zig           # module re-exports
├── main.zig           # CLI playground
└── nw.ts              # TS wrapper over WASM exports
tests/test.ts          # TS integration tests
PLAN.md                # roadmap + detailed design
```

## Adding New Features

1. Implement core logic in platform-agnostic Zig under `src/core/` (native-tested).
2. Export a thin wrapper in `src/wasm_api.zig` (`export fn ...`).
3. Add the wrapper method + `NumWasmExports` entry in `src/nw.ts`.
4. Add a case in `tests/test.ts`.
5. `zig build test && zig build wasm && npm test`.

## Tips

- Test natively first (`zig build test`) — instant, catches leaks via `std.testing.allocator`.
- WASM builds are `ReleaseFast`; `std.heap.wasm_allocator` backs `wasm_alloc`/`wasm_free`.
- Raw WASM calls return `rc !== 0` on failure; `nw.ts` throws a typed error.

See `PLAN.md` for roadmap (Phases 4–10: reshape/transpose, broadcasting, element-wise ops, reductions, slicing, linalg, full JS glue).
