import fs from "fs";
import path from "path";
import { NumWasm as NumWasmBase, NdArray } from "./lib/core";

export { NdArray };
export { NumWasmExports, NdArrayHeld } from "./lib/core";

function resolveWasmPath(): string {
  const candidates = [
    path.join(__dirname, "num-wasm.wasm"),
    path.join(__dirname, "../zig-out/bin/num-wasm.wasm"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

export class NumWasm extends NumWasmBase {
  static async init(): Promise<NumWasm> {
    const wasmBuffer = fs.readFileSync(resolveWasmPath());
    return (await NumWasmBase.initFromBytes(wasmBuffer)) as NumWasm;
  }
}
