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
export interface NdArrayHeld {
    nw: NumWasm;
    dataPtr: number;
    dataLen: number;
    shapePtr: number;
    shapeLen: number;
    freed: boolean;
}
export declare class NdArray {
    private _nw;
    _held: NdArrayHeld;
    private _shapeCache;
    private static _finalizer;
    constructor(nw: NumWasm, dataPtr: number, dataLen: number, shapePtr: number, shapeLen: number);
    get shape(): number[];
    get data(): number[];
    toArray(): number[];
    toTypedArray(): Float64Array;
    free(): void;
}
export declare class NumWasm {
    private _exports;
    private _memory;
    protected constructor(instance: WebAssembly.Instance);
    get memory(): WebAssembly.Memory;
    static initFromBytes(bytes: BufferSource): Promise<NumWasm>;
    static init(): Promise<NumWasm>;
    static initFromResponse(res: Response): Promise<NumWasm>;
    static initFromUrl(url: string): Promise<NumWasm>;
    _freeHeld(held: NdArrayHeld): void;
    private _writeShape;
    private _allocOut;
    private _readUsizeArray;
    private _parseResult;
    private _callWithShape;
    private _callOnArray;
    private _callBinary;
    private _callUnary;
    private _callScalar;
    private _reduceAll;
    private _reduceAxis;
    array(jsData: number[] | number[][] | number[][][]): NdArray;
    zeros(shape: number[]): NdArray;
    ones(shape: number[]): NdArray;
    full(shape: number[], value: number): NdArray;
    arange(start: number, stop: number, step: number): NdArray;
    linspace(start: number, stop: number, count: number): NdArray;
    random(shape: number[], seed: number): NdArray;
    reshape(arr: NdArray, newShape: number[]): NdArray;
    transpose(arr: NdArray): NdArray;
    flatten(arr: NdArray): NdArray;
    squeeze(arr: NdArray): NdArray;
    broadcastShapes(a: number[], b: number[]): number[];
    add(a: NdArray, b: NdArray): NdArray;
    subtract(a: NdArray, b: NdArray): NdArray;
    multiply(a: NdArray, b: NdArray): NdArray;
    divide(a: NdArray, b: NdArray): NdArray;
    negate(a: NdArray): NdArray;
    abs(a: NdArray): NdArray;
    sqrt(a: NdArray): NdArray;
    exp(a: NdArray): NdArray;
    log(a: NdArray): NdArray;
    addScalar(a: NdArray, value: number): NdArray;
    mulScalar(a: NdArray, value: number): NdArray;
    maximum(a: NdArray, b: NdArray): NdArray;
    minimum(a: NdArray, b: NdArray): NdArray;
    greater(a: NdArray, b: NdArray): NdArray;
    less(a: NdArray, b: NdArray): NdArray;
    equal(a: NdArray, b: NdArray): NdArray;
    maximumScalar(a: NdArray, value: number): NdArray;
    minimumScalar(a: NdArray, value: number): NdArray;
    greaterScalar(a: NdArray, value: number): NdArray;
    lessScalar(a: NdArray, value: number): NdArray;
    equalScalar(a: NdArray, value: number): NdArray;
    sum(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    mean(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    max(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    min(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    prod(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    argmax(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    argmin(a: NdArray, opts?: {
        axis?: number;
    }): number | NdArray;
    slice(arr: NdArray, dim: number, start: number, stop: number, step?: number): NdArray;
    indexAxis(arr: NdArray, dim: number, index: number): NdArray;
    where(arr: NdArray, mask: number[]): NdArray;
    dot(a: NdArray, b: NdArray): number;
    matmul(a: NdArray, b: NdArray): NdArray;
    outer(a: NdArray, b: NdArray): NdArray;
}
//# sourceMappingURL=core.d.ts.map