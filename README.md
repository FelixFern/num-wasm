# num-wasm

A NumPy-like array library written in Zig, compiled to WebAssembly, with a clean TypeScript API. Monorepo (pnpm workspaces).

## Packages

| Package | Path | Description |
| --- | --- | --- |
| `@felixfern/num-wasm` | [`packages/core`](./packages/core) | The library — Zig kernel → WASM, TS API |
| `@felixfern/num-wasm-web` | [`packages/web`](./packages/web) | Landing page + docs (Vite + React) |

## Development

```bash
pnpm install
pnpm --filter @felixfern/num-wasm test   # run library tests
pnpm --filter @felixfern/num-wasm-web dev  # dev server for the site
```

See [`packages/core/README.md`](./packages/core/README.md) for the full library docs.
