const USIZE = 4;
const F64 = 8;

export interface NumWasmExports {
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
  wasm_random(shapePtr: number, shapeLen: number, seed: number, outPtr: number): number;
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
  wasm_maximum(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_minimum(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_greater(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_less(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_equal(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_maximum_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
  wasm_minimum_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
  wasm_greater_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
  wasm_less_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
  wasm_equal_scalar(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number): number;
  wasm_sum(dataPtr: number, dataLen: number): number;
  wasm_mean(dataPtr: number, dataLen: number): number;
  wasm_max(dataPtr: number, dataLen: number): number;
  wasm_min(dataPtr: number, dataLen: number): number;
  wasm_prod(dataPtr: number, dataLen: number): number;
  wasm_argmax(dataPtr: number, dataLen: number): number;
  wasm_argmin(dataPtr: number, dataLen: number): number;
  wasm_sum_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_mean_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_max_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_min_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_prod_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_argmax_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_argmin_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number): number;
  wasm_slice(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, dim: number, start: number, stop: number, step: number, outPtr: number): number;
  wasm_index_axis(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, dim: number, index: number, outPtr: number): number;
  wasm_where(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, maskPtr: number, maskLen: number, outPtr: number): number;
  wasm_dot(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number): number;
  wasm_matmul(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
  wasm_outer(aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number): number;
}

type ReduceAllFn = (dataPtr: number, dataLen: number) => number;
type ReduceAxisFn = (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, axis: number, outPtr: number) => number;

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number");
}

function inferShape(value: unknown): number[] {
  const shape: number[] = [];
  let current = value;
  while (Array.isArray(current)) {
    shape.push(current.length);
    if (current.length === 0) break;
    current = current[0];
  }
  return shape;
}

function flattenRec(value: unknown, acc: number[]): void {
  if (Array.isArray(value)) {
    for (const v of value) flattenRec(v, acc);
  } else if (typeof value === "number") {
    acc.push(value);
  } else {
    throw new Error("array elements must be numbers");
  }
}

export interface NdArrayHeld {
  nw: NumWasm;
  dataPtr: number;
  dataLen: number;
  shapePtr: number;
  shapeLen: number;
  freed: boolean;
}

export class NdArray {
  private _nw: NumWasm;
  _held: NdArrayHeld;
  private _shapeCache: number[] | null = null;
  private static _finalizer = new FinalizationRegistry<NdArrayHeld>((held) => {
    if (!held.freed) {
      console.warn("NdArray was garbage collected without calling .free() — freeing memory automatically");
      held.nw._freeHeld(held);
    }
  });

  constructor(nw: NumWasm, dataPtr: number, dataLen: number, shapePtr: number, shapeLen: number) {
    this._nw = nw;
    this._held = { nw, dataPtr, dataLen, shapePtr, shapeLen, freed: false };
    NdArray._finalizer.register(this, this._held);
  }

  get shape(): number[] {
    if (this._shapeCache === null) {
      this._shapeCache = this._held.shapeLen === 0
        ? []
        : Array.from(new Uint32Array(this._nw.memory.buffer, this._held.shapePtr, this._held.shapeLen));
    }
    return this._shapeCache;
  }

  get data(): number[] {
    return this.toArray();
  }

  toArray(): number[] {
    if (this._held.dataLen === 0) return [];
    return Array.from(new Float64Array(this._nw.memory.buffer, this._held.dataPtr, this._held.dataLen));
  }

  toTypedArray(): Float64Array {
    if (this._held.dataLen === 0) return new Float64Array(0);
    return new Float64Array(this._nw.memory.buffer, this._held.dataPtr, this._held.dataLen).slice();
  }

  free(): void {
    if (!this._held.freed) {
      this._nw._freeHeld(this._held);
    }
  }
}

export class NumWasm {
  private _exports: NumWasmExports;
  private _memory: WebAssembly.Memory;

  protected constructor(instance: WebAssembly.Instance) {
    this._exports = instance.exports as unknown as NumWasmExports;
    this._memory = (instance.exports as unknown as NumWasmExports).memory;
  }

  get memory(): WebAssembly.Memory {
    return this._memory;
  }

  static async initFromBytes(bytes: BufferSource): Promise<NumWasm> {
    const { instance } = await WebAssembly.instantiate(bytes);
    return new NumWasm(instance);
  }

  // Browser default: resolve the packaged wasm next to this module. Bundlers
  // rewrite `new URL(..., import.meta.url)` into a fetchable asset URL.
  static async init(): Promise<NumWasm> {
    const url = new URL("../num-wasm.wasm", import.meta.url);
    return NumWasm.initFromUrl(url.href);
  }

  static async initFromResponse(res: Response): Promise<NumWasm> {
    const bytes = await res.arrayBuffer();
    return NumWasm.initFromBytes(bytes);
  }

  static async initFromUrl(url: string): Promise<NumWasm> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch wasm: ${res.status} ${res.statusText}`);
    return NumWasm.initFromBytes(await res.arrayBuffer());
  }

  _freeHeld(held: NdArrayHeld): void {
    if (held.freed) return;
    held.freed = true;
    if (held.dataLen > 0) this._exports.wasm_free(held.dataPtr, held.dataLen * F64);
    if (held.shapeLen > 0) this._exports.wasm_free(held.shapePtr, held.shapeLen * USIZE);
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

    const values = len === 0 ? [] : Array.from(new Uint32Array(this._memory.buffer, ptr, len));
    if (len > 0) this._exports.wasm_free(ptr, len * USIZE);
    return values;
  }

  private _parseResult(outPtr: number): NdArray {
    const out = new Uint32Array(this._memory.buffer, outPtr, 4);
    const dataPtr = out[0];
    const dataLen = out[1];
    const shapePtr = out[2];
    const shapeLen = out[3];
    this._exports.wasm_free(outPtr, 4 * USIZE);
    return new NdArray(this, dataPtr, dataLen, shapePtr, shapeLen);
  }

  private _callWithShape(
    wasmFn: (...args: number[]) => number,
    shape: number[],
    ...extraArgs: number[]
  ): NdArray {
    const s = this._writeShape(shape);
    const outPtr = this._allocOut();
    const rc = wasmFn(s.ptr, shape.length, ...extraArgs, outPtr);
    if (s.byteLen > 0) this._exports.wasm_free(s.ptr, s.byteLen);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  private _callOnArray(
    wasmFn: (...args: number[]) => number,
    arr: NdArray,
    ...extraArgs: number[]
  ): NdArray {
    const outPtr = this._allocOut();
    const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, ...extraArgs, outPtr);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  private _callBinary(
    wasmFn: (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, bPtr: number, bDataLen: number, bShapePtr: number, bShapeLen: number, outPtr: number) => number,
    a: NdArray,
    b: NdArray,
  ): NdArray {
    const outPtr = this._allocOut();
    const rc = wasmFn(a._held.dataPtr, a._held.dataLen, a._held.shapePtr, a._held.shapeLen, b._held.dataPtr, b._held.dataLen, b._held.shapePtr, b._held.shapeLen, outPtr);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  private _callUnary(
    wasmFn: (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, outPtr: number) => number,
    arr: NdArray,
  ): NdArray {
    const outPtr = this._allocOut();
    const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, outPtr);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  private _callScalar(
    wasmFn: (aPtr: number, aDataLen: number, aShapePtr: number, aShapeLen: number, value: number, outPtr: number) => number,
    arr: NdArray,
    value: number,
  ): NdArray {
    const outPtr = this._allocOut();
    const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, value, outPtr);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  private _reduceAll(wasmFn: ReduceAllFn, arr: NdArray): number {
    return wasmFn(arr._held.dataPtr, arr._held.dataLen);
  }

  private _reduceAxis(wasmFn: ReduceAxisFn, arr: NdArray, axis: number): NdArray {
    const outPtr = this._allocOut();
    const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, axis, outPtr);
    if (rc !== 0) throw new Error(`WASM call failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  array(jsData: number[] | number[][] | number[][][]): NdArray {
    const flat: number[] = [];
    flattenRec(jsData, flat);
    const shape = inferShape(jsData);

    const dataLen = flat.length;
    const dataPtr = dataLen === 0 ? 0 : this._exports.wasm_alloc(dataLen * F64);
    if (dataLen > 0 && dataPtr === 0) throw new Error("alloc failed for data");
    if (dataLen > 0) new Float64Array(this._memory.buffer, dataPtr, dataLen).set(flat);

    const s = this._writeShape(shape);
    return new NdArray(this, dataPtr, dataLen, s.ptr, shape.length);
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
    return this._parseResult(outPtr);
  }

  linspace(start: number, stop: number, count: number): NdArray {
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_linspace(start, stop, count, outPtr);
    if (rc !== 0) throw new Error(`linspace failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  random(shape: number[], seed: number): NdArray {
    const s = this._writeShape(shape);
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_random(s.ptr, shape.length, seed, outPtr);
    if (s.byteLen > 0) this._exports.wasm_free(s.ptr, s.byteLen);
    if (rc !== 0) throw new Error(`random failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  reshape(arr: NdArray, newShape: number[]): NdArray {
    const ns = this._writeShape(newShape);
    const res = this._callOnArray(
      (d, dl, s, l, out) => this._exports.wasm_reshape(d, dl, s, l, ns.ptr, newShape.length, out),
      arr,
    );
    if (ns.byteLen > 0) this._exports.wasm_free(ns.ptr, ns.byteLen);
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

  maximum(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_maximum, a, b);
  }

  minimum(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_minimum, a, b);
  }

  greater(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_greater, a, b);
  }

  less(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_less, a, b);
  }

  equal(a: NdArray, b: NdArray): NdArray {
    return this._callBinary(this._exports.wasm_equal, a, b);
  }

  maximumScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_maximum_scalar, a, value);
  }

  minimumScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_minimum_scalar, a, value);
  }

  greaterScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_greater_scalar, a, value);
  }

  lessScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_less_scalar, a, value);
  }

  equalScalar(a: NdArray, value: number): NdArray {
    return this._callScalar(this._exports.wasm_equal_scalar, a, value);
  }

  sum(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_sum_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_sum, a);
  }

  mean(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_mean_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_mean, a);
  }

  max(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_max_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_max, a);
  }

  min(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_min_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_min, a);
  }

  prod(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_prod_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_prod, a);
  }

  argmax(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_argmax_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_argmax, a);
  }

  argmin(a: NdArray, opts?: { axis?: number }): number | NdArray {
    if (opts?.axis !== undefined) return this._reduceAxis(this._exports.wasm_argmin_axis, a, opts.axis);
    return this._reduceAll(this._exports.wasm_argmin, a);
  }

  slice(arr: NdArray, dim: number, start: number, stop: number, step = 1): NdArray {
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_slice(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, dim, start, stop, step, outPtr);
    if (rc !== 0) throw new Error(`slice failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  indexAxis(arr: NdArray, dim: number, index: number): NdArray {
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_index_axis(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, dim, index, outPtr);
    if (rc !== 0) throw new Error(`indexAxis failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  where(arr: NdArray, mask: number[]): NdArray {
    if (!isNumberArray(mask)) throw new Error("mask must be a number array");
    if (mask.length !== arr._held.dataLen) throw new Error("mask length mismatch");
    const maskPtr = mask.length === 0 ? 0 : this._exports.wasm_alloc(mask.length * F64);
    if (mask.length > 0 && maskPtr === 0) throw new Error("alloc failed for mask");
    if (mask.length > 0) new Float64Array(this._memory.buffer, maskPtr, mask.length).set(mask);
    const outPtr = this._allocOut();
    const rc = this._exports.wasm_where(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, maskPtr, mask.length, outPtr);
    if (mask.length > 0) this._exports.wasm_free(maskPtr, mask.length * F64);
    if (rc !== 0) throw new Error(`where failed (rc=${rc})`);
    return this._parseResult(outPtr);
  }

  dot(a: NdArray, b: NdArray): number {
    if (a.shape.length !== 1 || b.shape.length !== 1) throw new Error("dot requires 1D arrays");
    if (a._held.dataLen !== b._held.dataLen) throw new Error("dot requires equal lengths");
    return this._exports.wasm_dot(a._held.dataPtr, a._held.dataLen, a._held.shapePtr, a._held.shapeLen, b._held.dataPtr, b._held.dataLen, b._held.shapePtr, b._held.shapeLen);
  }

  matmul(a: NdArray, b: NdArray): NdArray {
    if (a.shape.length !== 2 || b.shape.length !== 2) throw new Error("matmul requires 2D arrays");
    return this._callBinary(this._exports.wasm_matmul, a, b);
  }

  outer(a: NdArray, b: NdArray): NdArray {
    if (a.shape.length !== 1 || b.shape.length !== 1) throw new Error("outer requires 1D arrays");
    return this._callBinary(this._exports.wasm_outer, a, b);
  }
}
