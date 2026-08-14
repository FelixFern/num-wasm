# Contributing to num-wasm

Thanks for wanting to contribute! This is a small, learning-focused project, so the bar is low and questions are welcome. Open an issue before big changes, and keep the diff reviewable.

## Project layout

This is a pnpm workspace (monorepo):

- `packages/core` — the library: Zig kernel (`src/core/*.zig`, `src/wasm_api.zig`) + TypeScript glue (`src/lib/core.ts`, `src/nw.ts`, `src/nw.browser.ts`) + tests (`tests/`)
- `packages/web` — the landing page and docs site (Vite + React + Tailwind)

## Prerequisites

- Node.js ≥ 18
- [pnpm](https://pnpm.io/)
- [Zig](https://ziglang.org/) 0.15.2 (matches `build.zig.zon`'s `minimum_zig_version`)

## Setup

```bash
pnpm install
```

## Building

The WASM binary must exist before TS builds or tests run — `prepublishOnly` handles this on publish, but in dev build it manually first:

```bash
cd packages/core
zig build wasm          # compile the Zig kernel -> zig-out/bin/num-wasm.wasm
zig build test          # native Zig tests
pnpm run build          # tsc + copy wasm into dist/
pnpm test               # Node/TS tests
```

## Testing

Add or extend tests in `packages/core/tests/`. Each file registers cases with `tests/runner.ts`, covering both the Zig kernel and the TS API. Run them with:

```bash
pnpm --filter @felixfern/num-wasm test
```

Before submitting, make sure everything is green:

```bash
pnpm --filter @felixfern/num-wasm test
pnpm --filter @felixfern/num-wasm typecheck
pnpm --filter @felixfern/num-wasm run build
```

## Contributing a change

1. Fork the repo and create a branch (`git checkout -b feature/your-thing`).
2. Make your change, with tests.
3. Run the checks above.
4. Open a pull request. Describe the change, the motivation, and any design tradeoffs.

Keep PRs focused — one logical change per PR is easier to review.

## Code style

- Zig: follow the existing style in `src/core/*.zig`; `zig fmt` before committing.
- TypeScript: match the existing patterns in `src/lib/core.ts`; `strict` mode is on.
- No new runtime dependencies without discussion — the library is dependency-free by design.
- No comments that just restate the code.

## Design constraints

The library is intentionally minimal:

- **f64 only**, flat `[]f64` storage, no strides
- **Copy-based** operations — no views
- **Row-major** (C-contiguous)
- **Zero runtime dependencies**

New ops should fit these constraints. If they don't (dtype enums, strides, views), open an issue first — that's a deliberate design conversation, not a quick fix.

## Releasing

Maintainers only — the release workflow is a `workflow_dispatch` that bumps the version, generates a changelog, tags, publishes to npm, and creates a GitHub release. Requires the `NPM_TOKEN` repo secret.
