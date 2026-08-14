import fs from "fs";
import path from "path";

const WASM_PATH = path.join(__dirname, "../zig-out/bin/num-wasm.wasm");
const USIZE = 4;
const F64 = 8;

interface NdArray {
  data: number[];
  shape: number[];
}

interface NumWasmExports {
  memory: WebAssembly.Memory;
  wasm_alloc(len: number): number;
  wasm_free(ptr: number, len: number): void;
  add(a: number, b: number): number;
  sum_f64(ptr: number, len: number): number;
  wasm_zeros(shapePtr: number, shapeLen: number, outPtr: number): number;
  wasm_ones(shapePtr: number, shapeLen: number, outPtr: number): number;
  wasm_full(shapePtr: number, shapeLen: number, value: number, outPtr: number): number;
  wasm_arange(start: number, stop: number, step: number, outPtr: number): number;
  wasm_linspace(start: number, stop: number, count: number, outPtr: number): number;
  wasm_reshape(dataPtr: number, dataLen: number, shapePtr: number, shapeLen: number, newShapePtr: number, newShapeLen: number, outPtr: number): number;
  wasm_transpose(dataPtr: number, dataLen: number, shapePtr: number, shapeLen: number, outPtr: number): number;
  wasm_flatten(dataPtr: number, dataLen: number, shapePtr: number, shapeLen: number, outPtr: number): number;
  wasm_squeeze(dataPtr: number, dataLen: number, shapePtr: number, shapeLen: number, outPtr: number): number;
  wasm_broadcast_shapes(aPtr: number, aLen: number, bPtr: number, bLen: number, outPtr: number): number;
}

export class NumWasm {
  private _exports: NumWasmExports;
  private _memory: WebAssembly.Memory;

  private constructor(instance: WebAssembly.Instance) {
    this._exports = instance.exports as unknown as NumWasmExports;
    this._memory = (instance.exports as unknown as NumWasmExports).memory;
  }

  static async init(): Promise<NumWasm> {
    const wasmBuffer = fs.readFileSync(WASM_PATH);
    const { instance } = await WebAssembly.instantiate(wasmBuffer);
    return new NumWasm(instance);
  }

  private _writeShape(shape: number[]): { ptr: number; byteLen: number } {
    if (shape.length === 0) return { ptr: 0, byteLen: 0 };
    const byteLen = shape.length * USIZE;
    const ptr = this._exports.wasm_alloc(byteLen);
    if (ptr === 0) throw new Error("alloc failed for shape");
    new Uint32Array(this._memory.buffer, ptr, shape.length).set(shape);
    return { ptr, byteLen };
  }

  private _allocOut(): number {
    const ptr = this._exports.wasm_alloc(4 * USIZE);
    if (ptr === 0) throw new Error("alloc failed for out buffer");
    return ptr;
  }

  private _readUsizeArray(outPtr: number): number[] {
    const out = new Uint32Array(this._memory.buffer, outPtr, 2);
    const ptr = out[0];
    const len = out[1];
    this._exports.wasm_free(outPtr, 2 * USIZE);

    const values = Array.from(new Uint32Array(this._memory.buffer, ptr, len));
    this._exports.wasm_free(ptr, len * USIZE);
    return values;
  }

  private _readResult(outPtr: number): NdArray {
    const out = new Uint32Array(this._memory.buffer, outPtr, 4);
    const dataPtr = out[0];
    const dataLen = out[1];
    const shapePtr = out[2];
    const shapeLen = out[3];
    this._exports.wasm_free(outPtr, 4 * USIZE);

    const data = Array.from(
      new Float64Array(this._memory.buffer, dataPtr, dataLen),
    );
    this._exports.wasm_free(dataPtr, dataLen * F64);

    const shape = Array.from(new Uint32Array(this._memory.buffer, shapePtr, shapeLen));
    this._exports.wasm_free(shapePtr, shapeLen * USIZE);

    return { data, shape };
  }

  private _callWithShape(
    wasmFn: (...args: number[]) => number,
    shape: number[],
    ...extraArgs: number[]
  ): NdArray {
    const s = this._writeShape(shape);
    const outPtr = this._allocOut();
    const rc = wasmFn(s.ptr, shape.length, ...extraArgs, outPtr);
    this._exports.wasm_free(s.ptr, s.byteLen);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._readResult(outPtr);
  }

  private _writeArray(arr: NdArray): { dataPtr: number; shapePtr: number; shapeLen: number } {
    const dataPtr = this._exports.wasm_alloc(arr.data.length * F64);
    if (dataPtr === 0) throw new Error("alloc failed for data");
    new Float64Array(this._memory.buffer, dataPtr, arr.data.length).set(arr.data);

    const s = this._writeShape(arr.shape);
    return { dataPtr, shapePtr: s.ptr, shapeLen: arr.shape.length };
  }

  private _callOnArray(
    wasmFn: (...args: number[]) => number,
    arr: NdArray,
    ...extraArgs: number[]
  ): NdArray {
    const input = this._writeArray(arr);
    const outPtr = this._allocOut();
    const rc = wasmFn(input.dataPtr, arr.data.length, input.shapePtr, input.shapeLen, ...extraArgs, outPtr);
    this._exports.wasm_free(input.dataPtr, arr.data.length * F64);
    this._exports.wasm_free(input.shapePtr, arr.shape.length * USIZE);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._readResult(outPtr);
  }

  zeros(shape: number[]): NdArray {
    return this._callWithShape(this._exports.wasm_zeros, shape);
  }

  ones(shape: number[]): NdArray {
    return this._callWithShape(this._exports.wasm_ones, shape);
  }

  full(shape: number[], value: number): NdArray {
    return this._callWithShape(this._exports.wasm_full, shape, value);
  }

  arange(start: number, stop: number, step: number): NdArray {
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_arange(start, stop, step, outPtr);
    if (rc !== 0) throw new Error(`arange failed (rc=${rc})`);
    return this._readResult(outPtr);
  }

  linspace(start: number, stop: number, count: number): NdArray {
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_linspace(start, stop, count, outPtr);
    if (rc !== 0) throw new Error(`linspace failed (rc=${rc})`);
    return this._readResult(outPtr);
  }

  reshape(arr: NdArray, newShape: number[]): NdArray {
    const ns = this._writeShape(newShape);
    const res = this._callOnArray(
      (d, dl, s, l, out) => this._exports.wasm_reshape(d, dl, s, l, ns.ptr, newShape.length, out),
      arr,
    );
    this._exports.wasm_free(ns.ptr, ns.byteLen);
    return res;
  }

  transpose(arr: NdArray): NdArray {
    return this._callOnArray(this._exports.wasm_transpose, arr);
  }

  flatten(arr: NdArray): NdArray {
    return this._callOnArray(this._exports.wasm_flatten, arr);
  }

  squeeze(arr: NdArray): NdArray {
    return this._callOnArray(this._exports.wasm_squeeze, arr);
  }

  broadcastShapes(a: number[], b: number[]): number[] {
    const sa = this._writeShape(a);
    const sb = this._writeShape(b);
    const outPtr = this._exports.wasm_alloc(2 * USIZE);
    if (outPtr === 0) throw new Error("alloc failed for out buffer");
    const rc = this._exports.wasm_broadcast_shapes(sa.ptr, a.length, sb.ptr, b.length, outPtr);
    if (sa.byteLen > 0) this._exports.wasm_free(sa.ptr, sa.byteLen);
    if (sb.byteLen > 0) this._exports.wasm_free(sb.ptr, sb.byteLen);
    if (rc !== 0) throw new Error(`broadcast_shapes failed (rc=${rc})`);
    return this._readUsizeArray(outPtr);
  }
}
