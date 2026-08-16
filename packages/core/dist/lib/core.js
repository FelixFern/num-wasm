const USIZE = 4;
const F64 = 8;
function isNumberArray(value) {
    return Array.isArray(value) && value.every((v) => typeof v === "number");
}
function inferShape(value) {
    const shape = [];
    let current = value;
    while (Array.isArray(current)) {
        shape.push(current.length);
        if (current.length === 0)
            break;
        current = current[0];
    }
    return shape;
}
function flattenRec(value, acc) {
    if (Array.isArray(value)) {
        for (const v of value)
            flattenRec(v, acc);
    }
    else if (typeof value === "number") {
        acc.push(value);
    }
    else {
        throw new Error("array elements must be numbers");
    }
}
export class NdArray {
    _nw;
    _held;
    _shapeCache = null;
    static _finalizer = new FinalizationRegistry((held) => {
        if (!held.freed) {
            console.warn("NdArray was garbage collected without calling .free() — freeing memory automatically");
            held.nw._freeHeld(held);
        }
    });
    constructor(nw, dataPtr, dataLen, shapePtr, shapeLen) {
        this._nw = nw;
        this._held = { nw, dataPtr, dataLen, shapePtr, shapeLen, freed: false };
        NdArray._finalizer.register(this, this._held);
    }
    get shape() {
        if (this._shapeCache === null) {
            this._shapeCache = this._held.shapeLen === 0
                ? []
                : Array.from(new Uint32Array(this._nw.memory.buffer, this._held.shapePtr, this._held.shapeLen));
        }
        return this._shapeCache;
    }
    get data() {
        return this.toArray();
    }
    toArray() {
        if (this._held.dataLen === 0)
            return [];
        return Array.from(new Float64Array(this._nw.memory.buffer, this._held.dataPtr, this._held.dataLen));
    }
    toTypedArray() {
        if (this._held.dataLen === 0)
            return new Float64Array(0);
        return new Float64Array(this._nw.memory.buffer, this._held.dataPtr, this._held.dataLen).slice();
    }
    free() {
        if (!this._held.freed) {
            this._nw._freeHeld(this._held);
        }
    }
}
export class NumWasm {
    _exports;
    _memory;
    constructor(instance) {
        this._exports = instance.exports;
        this._memory = instance.exports.memory;
    }
    get memory() {
        return this._memory;
    }
    static async initFromBytes(bytes) {
        const { instance } = await WebAssembly.instantiate(bytes);
        return new NumWasm(instance);
    }
    // Browser default: resolve the packaged wasm next to this module. Bundlers
    // rewrite `new URL(..., import.meta.url)` into a fetchable asset URL.
    static async init() {
        const url = new URL("../num-wasm.wasm", import.meta.url);
        return NumWasm.initFromUrl(url.href);
    }
    static async initFromResponse(res) {
        const bytes = await res.arrayBuffer();
        return NumWasm.initFromBytes(bytes);
    }
    static async initFromUrl(url) {
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Failed to fetch wasm: ${res.status} ${res.statusText}`);
        return NumWasm.initFromBytes(await res.arrayBuffer());
    }
    _freeHeld(held) {
        if (held.freed)
            return;
        held.freed = true;
        if (held.dataLen > 0)
            this._exports.wasm_free(held.dataPtr, held.dataLen * F64);
        if (held.shapeLen > 0)
            this._exports.wasm_free(held.shapePtr, held.shapeLen * USIZE);
    }
    _writeShape(shape) {
        if (shape.length === 0)
            return { ptr: 0, byteLen: 0 };
        const byteLen = shape.length * USIZE;
        const ptr = this._exports.wasm_alloc(byteLen);
        if (ptr === 0)
            throw new Error("alloc failed for shape");
        new Uint32Array(this._memory.buffer, ptr, shape.length).set(shape);
        return { ptr, byteLen };
    }
    _allocOut() {
        const ptr = this._exports.wasm_alloc(4 * USIZE);
        if (ptr === 0)
            throw new Error("alloc failed for out buffer");
        return ptr;
    }
    _readUsizeArray(outPtr) {
        const out = new Uint32Array(this._memory.buffer, outPtr, 2);
        const ptr = out[0];
        const len = out[1];
        this._exports.wasm_free(outPtr, 2 * USIZE);
        const values = len === 0 ? [] : Array.from(new Uint32Array(this._memory.buffer, ptr, len));
        if (len > 0)
            this._exports.wasm_free(ptr, len * USIZE);
        return values;
    }
    _parseResult(outPtr) {
        const out = new Uint32Array(this._memory.buffer, outPtr, 4);
        const dataPtr = out[0];
        const dataLen = out[1];
        const shapePtr = out[2];
        const shapeLen = out[3];
        this._exports.wasm_free(outPtr, 4 * USIZE);
        return new NdArray(this, dataPtr, dataLen, shapePtr, shapeLen);
    }
    _callWithShape(wasmFn, shape, ...extraArgs) {
        const s = this._writeShape(shape);
        const outPtr = this._allocOut();
        const rc = wasmFn(s.ptr, shape.length, ...extraArgs, outPtr);
        if (s.byteLen > 0)
            this._exports.wasm_free(s.ptr, s.byteLen);
        if (rc !== 0)
            throw new Error(`WASM call failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    _callOnArray(wasmFn, arr, ...extraArgs) {
        const outPtr = this._allocOut();
        const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, ...extraArgs, outPtr);
        if (rc !== 0)
            throw new Error(`WASM call failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    _callBinary(wasmFn, a, b) {
        const outPtr = this._allocOut();
        const rc = wasmFn(a._held.dataPtr, a._held.dataLen, a._held.shapePtr, a._held.shapeLen, b._held.dataPtr, b._held.dataLen, b._held.shapePtr, b._held.shapeLen, outPtr);
        if (rc !== 0)
            throw new Error(`WASM call failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    _callUnary(wasmFn, arr) {
        const outPtr = this._allocOut();
        const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, outPtr);
        if (rc !== 0)
            throw new Error(`WASM call failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    _callScalar(wasmFn, arr, value) {
        const outPtr = this._allocOut();
        const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, value, outPtr);
        if (rc !== 0)
            throw new Error(`WASM call failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    _reduceAll(wasmFn, arr) {
        return wasmFn(arr._held.dataPtr, arr._held.dataLen);
    }
    _reduceAxis(wasmFn, arr, axis) {
        const outPtr = this._allocOut();
        const rc = wasmFn(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, axis, outPtr);
        if (rc !== 0)
            throw new Error(`WASM call failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    array(jsData) {
        const flat = [];
        flattenRec(jsData, flat);
        const shape = inferShape(jsData);
        const dataLen = flat.length;
        const dataPtr = dataLen === 0 ? 0 : this._exports.wasm_alloc(dataLen * F64);
        if (dataLen > 0 && dataPtr === 0)
            throw new Error("alloc failed for data");
        if (dataLen > 0)
            new Float64Array(this._memory.buffer, dataPtr, dataLen).set(flat);
        const s = this._writeShape(shape);
        return new NdArray(this, dataPtr, dataLen, s.ptr, shape.length);
    }
    zeros(shape) {
        return this._callWithShape(this._exports.wasm_zeros, shape);
    }
    ones(shape) {
        return this._callWithShape(this._exports.wasm_ones, shape);
    }
    full(shape, value) {
        return this._callWithShape(this._exports.wasm_full, shape, value);
    }
    arange(start, stop, step) {
        const outPtr = this._allocOut();
        const rc = this._exports.wasm_arange(start, stop, step, outPtr);
        if (rc !== 0)
            throw new Error(`arange failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    linspace(start, stop, count) {
        const outPtr = this._allocOut();
        const rc = this._exports.wasm_linspace(start, stop, count, outPtr);
        if (rc !== 0)
            throw new Error(`linspace failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    random(shape, seed) {
        const s = this._writeShape(shape);
        const outPtr = this._allocOut();
        const rc = this._exports.wasm_random(s.ptr, shape.length, seed, outPtr);
        if (s.byteLen > 0)
            this._exports.wasm_free(s.ptr, s.byteLen);
        if (rc !== 0)
            throw new Error(`random failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    reshape(arr, newShape) {
        const ns = this._writeShape(newShape);
        const res = this._callOnArray((d, dl, s, l, out) => this._exports.wasm_reshape(d, dl, s, l, ns.ptr, newShape.length, out), arr);
        if (ns.byteLen > 0)
            this._exports.wasm_free(ns.ptr, ns.byteLen);
        return res;
    }
    transpose(arr) {
        return this._callOnArray(this._exports.wasm_transpose, arr);
    }
    flatten(arr) {
        return this._callOnArray(this._exports.wasm_flatten, arr);
    }
    squeeze(arr) {
        return this._callOnArray(this._exports.wasm_squeeze, arr);
    }
    broadcastShapes(a, b) {
        const sa = this._writeShape(a);
        const sb = this._writeShape(b);
        const outPtr = this._exports.wasm_alloc(2 * USIZE);
        if (outPtr === 0)
            throw new Error("alloc failed for out buffer");
        const rc = this._exports.wasm_broadcast_shapes(sa.ptr, a.length, sb.ptr, b.length, outPtr);
        if (sa.byteLen > 0)
            this._exports.wasm_free(sa.ptr, sa.byteLen);
        if (sb.byteLen > 0)
            this._exports.wasm_free(sb.ptr, sb.byteLen);
        if (rc !== 0)
            throw new Error(`broadcast_shapes failed (rc=${rc})`);
        return this._readUsizeArray(outPtr);
    }
    add(a, b) {
        return this._callBinary(this._exports.wasm_add, a, b);
    }
    subtract(a, b) {
        return this._callBinary(this._exports.wasm_subtract, a, b);
    }
    multiply(a, b) {
        return this._callBinary(this._exports.wasm_multiply, a, b);
    }
    divide(a, b) {
        return this._callBinary(this._exports.wasm_divide, a, b);
    }
    negate(a) {
        return this._callUnary(this._exports.wasm_negate, a);
    }
    abs(a) {
        return this._callUnary(this._exports.wasm_abs, a);
    }
    sqrt(a) {
        return this._callUnary(this._exports.wasm_sqrt, a);
    }
    exp(a) {
        return this._callUnary(this._exports.wasm_exp, a);
    }
    log(a) {
        return this._callUnary(this._exports.wasm_log, a);
    }
    addScalar(a, value) {
        return this._callScalar(this._exports.wasm_add_scalar, a, value);
    }
    mulScalar(a, value) {
        return this._callScalar(this._exports.wasm_mul_scalar, a, value);
    }
    maximum(a, b) {
        return this._callBinary(this._exports.wasm_maximum, a, b);
    }
    minimum(a, b) {
        return this._callBinary(this._exports.wasm_minimum, a, b);
    }
    greater(a, b) {
        return this._callBinary(this._exports.wasm_greater, a, b);
    }
    less(a, b) {
        return this._callBinary(this._exports.wasm_less, a, b);
    }
    equal(a, b) {
        return this._callBinary(this._exports.wasm_equal, a, b);
    }
    maximumScalar(a, value) {
        return this._callScalar(this._exports.wasm_maximum_scalar, a, value);
    }
    minimumScalar(a, value) {
        return this._callScalar(this._exports.wasm_minimum_scalar, a, value);
    }
    greaterScalar(a, value) {
        return this._callScalar(this._exports.wasm_greater_scalar, a, value);
    }
    lessScalar(a, value) {
        return this._callScalar(this._exports.wasm_less_scalar, a, value);
    }
    equalScalar(a, value) {
        return this._callScalar(this._exports.wasm_equal_scalar, a, value);
    }
    sum(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_sum_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_sum, a);
    }
    mean(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_mean_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_mean, a);
    }
    max(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_max_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_max, a);
    }
    min(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_min_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_min, a);
    }
    prod(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_prod_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_prod, a);
    }
    argmax(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_argmax_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_argmax, a);
    }
    argmin(a, opts) {
        if (opts?.axis !== undefined)
            return this._reduceAxis(this._exports.wasm_argmin_axis, a, opts.axis);
        return this._reduceAll(this._exports.wasm_argmin, a);
    }
    slice(arr, dim, start, stop, step = 1) {
        const outPtr = this._allocOut();
        const rc = this._exports.wasm_slice(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, dim, start, stop, step, outPtr);
        if (rc !== 0)
            throw new Error(`slice failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    indexAxis(arr, dim, index) {
        const outPtr = this._allocOut();
        const rc = this._exports.wasm_index_axis(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, dim, index, outPtr);
        if (rc !== 0)
            throw new Error(`indexAxis failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    where(arr, mask) {
        if (!isNumberArray(mask))
            throw new Error("mask must be a number array");
        if (mask.length !== arr._held.dataLen)
            throw new Error("mask length mismatch");
        const maskPtr = mask.length === 0 ? 0 : this._exports.wasm_alloc(mask.length * F64);
        if (mask.length > 0 && maskPtr === 0)
            throw new Error("alloc failed for mask");
        if (mask.length > 0)
            new Float64Array(this._memory.buffer, maskPtr, mask.length).set(mask);
        const outPtr = this._allocOut();
        const rc = this._exports.wasm_where(arr._held.dataPtr, arr._held.dataLen, arr._held.shapePtr, arr._held.shapeLen, maskPtr, mask.length, outPtr);
        if (mask.length > 0)
            this._exports.wasm_free(maskPtr, mask.length * F64);
        if (rc !== 0)
            throw new Error(`where failed (rc=${rc})`);
        return this._parseResult(outPtr);
    }
    dot(a, b) {
        if (a.shape.length !== 1 || b.shape.length !== 1)
            throw new Error("dot requires 1D arrays");
        if (a._held.dataLen !== b._held.dataLen)
            throw new Error("dot requires equal lengths");
        return this._exports.wasm_dot(a._held.dataPtr, a._held.dataLen, a._held.shapePtr, a._held.shapeLen, b._held.dataPtr, b._held.dataLen, b._held.shapePtr, b._held.shapeLen);
    }
    matmul(a, b) {
        if (a.shape.length !== 2 || b.shape.length !== 2)
            throw new Error("matmul requires 2D arrays");
        return this._callBinary(this._exports.wasm_matmul, a, b);
    }
    outer(a, b) {
        if (a.shape.length !== 1 || b.shape.length !== 1)
            throw new Error("outer requires 1D arrays");
        return this._callBinary(this._exports.wasm_outer, a, b);
    }
}
//# sourceMappingURL=core.js.map