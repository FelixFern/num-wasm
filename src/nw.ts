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
  wasm_add(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_subtract(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_multiply(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_divide(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_negate(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number): number;
  wasm_abs(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number): number;
  wasm_sqrt(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number): number;
  wasm_exp(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number): number;
  wasm_log(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number): number;
  wasm_add_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
  wasm_mul_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
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

    const data = dataLen === 0
      ? []
      : Array.from(new Float64Array(this._memory.buffer, dataPtr, dataLen));
    if (dataLen > 0) this._exports.wasm_free(dataPtr, dataLen * F64);

    const shape = shapeLen === 0
      ? []
      : Array.from(new Uint32Array(this._memory.buffer, shapePtr, shapeLen));
    if (shapeLen > 0) this._exports.wasm_free(shapePtr, shapeLen * USIZE);

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

  private _callBinary(
    wasmFn: (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number) => number,
    a: NdArray,
    b: NdArray,
  ): NdArray {
    const ia = this._writeArray(a);
    const ib = this._writeArray(b);
    const outPtr = this._allocOut();
    const rc = wasmFn(
      ia.dataPtr, a.data.length, ia.shapePtr, ia.shapeLen,
      ib.dataPtr, b.data.length, ib.shapePtr, ib.shapeLen,
      outPtr,
    );
    this._exports.wasm_free(ia.dataPtr, a.data.length * F64);
    this._exports.wasm_free(ia.shapePtr, a.shape.length * USIZE);
    this._exports.wasm_free(ib.dataPtr, b.data.length * F64);
    this._exports.wasm_free(ib.shapePtr, b.shape.length * USIZE);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._readResult(outPtr);
  }

  private _callUnary(
    wasmFn: (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number) => number,
    arr: NdArray,
  ): NdArray {
    const input = this._writeArray(arr);
    const outPtr = this._allocOut();
    const rc = wasmFn(input.dataPtr, arr.data.length, input.shapePtr, input.shapeLen, outPtr);
    this._exports.wasm_free(input.dataPtr, arr.data.length * F64);
    this._exports.wasm_free(input.shapePtr, arr.shape.length * USIZE);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._readResult(outPtr);
  }

  private _callScalar(
    wasmFn: (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number) => number,
    arr: NdArray,
    value: number,
  ): NdArray {
    const input = this._writeArray(arr);
    const outPtr = this._allocOut();
    const rc = wasmFn(input.dataPtr, arr.data.length, input.shapePtr, input.shapeLen, value, outPtr);
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

  add(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_add, a, b);
  }

  subtract(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_subtract, a, b);
  }

  multiply(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_multiply, a, b);
  }

  divide(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_divide, a, b);
  }

  negate(a: NdArray): NdArray {
    return this._callUnary(this._exports.wasm_negate, a);
  }

  abs(a: NdArray): NdArray {
    return this._callUnary(this._exports.wasm_abs, a);
  }

  sqrt(a: NdArray): NdArray {
    return this._callUnary(this._exports.wasm_sqrt, a);
  }

  exp(a: NdArray): NdArray {
    return this._callUnary(this._exports.wasm_exp, a);
  }

  log(a: NdArray): NdArray {
    return this._callUnary(this._exports.wasm_log, a);
  }

  addScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_add_scalar, a, value);
  }

  mulScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_mul_scalar, a, value);
  }
}
