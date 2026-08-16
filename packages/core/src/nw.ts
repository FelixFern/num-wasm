import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NumWasm as NumWasmBase, NdArray } from "./lib/core.js";

export { NdArray };
export type { NumWasmExports, NdArrayHeld } from "./lib/core.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function resolveWasmPath(): string {
  const candidates = [
    path.join(here, "num-wasm.wasm"),
    path.join(here, "../zig-out/bin/num-wasm.wasm"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

export class NumWasm extends NumWasmBase {
  static async init(): Promise<NumWasm> {
    const wasmBuffer = fs.readFileSync(resolveWasmPath());
    return (await NumWasmBase.initFromBytes(wasmBuffer)) as NumWasm;
  }
}
