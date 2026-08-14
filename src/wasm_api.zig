const std = @import("std");
const wasm_allocator = std.heap.wasm_allocator;

const broadcasting = @import("core/broadcasting.zig");
const creation = @import("core/creation.zig");
const elementwise = @import("core/elementwise.zig");
const linalg = @import("core/linalg.zig");
const NDArray = @import("core/ndarray.zig").NDArray;
const reduce = @import("core/reduce.zig");
const shaper = @import("core/shape.zig");
const slicing = @import("core/slicing.zig");

export fn wasm_alloc(len: usize) usize {
    const slice = wasm_allocator.alloc(u8, len) catch return 0;
    return @intFromPtr(slice.ptr);
}

export fn wasm_free(ptr: usize, len: usize) void {
    const start: [*]u8 = @ptrFromInt(ptr);
    wasm_allocator.free(start[0..len]);
}

fn writeResult(arr: *NDArray, out_ptr: usize) void {
    const out: [*]usize = @ptrFromInt(out_ptr);
    out[0] = @intFromPtr(arr.data.ptr);
    out[1] = arr.data.len;
    out[2] = @intFromPtr(arr.shape.ptr);
    out[3] = arr.shape.len;
}

fn shapeSlice(shape_ptr: usize, shape_len: usize) []const usize {
    const start: [*]const usize = @ptrFromInt(shape_ptr);
    return start[0..shape_len];
}

export fn wasm_zeros(shape_ptr: usize, shape_len: usize, out_ptr: usize) i32 {
    const shape = shapeSlice(shape_ptr, shape_len);
    var arr = creation.zeros(wasm_allocator, shape) catch return -1;
    writeResult(&arr, out_ptr);
    return 0;
}

export fn wasm_ones(shape_ptr: usize, shape_len: usize, out_ptr: usize) i32 {
    const shape = shapeSlice(shape_ptr, shape_len);
    var arr = creation.ones(wasm_allocator, shape) catch return -1;
    writeResult(&arr, out_ptr);
    return 0;
}

export fn wasm_full(shape_ptr: usize, shape_len: usize, value: f64, out_ptr: usize) i32 {
    const shape = shapeSlice(shape_ptr, shape_len);
    var arr = creation.full(wasm_allocator, shape, value) catch return -1;
    writeResult(&arr, out_ptr);
    return 0;
}

export fn wasm_arange(start: f64, stop: f64, step: f64, out_ptr: usize) i32 {
    var arr = creation.arange(wasm_allocator, start, stop, step) catch return -1;
    writeResult(&arr, out_ptr);
    return 0;
}

export fn wasm_linspace(start: f64, stop: f64, count: usize, out_ptr: usize) i32 {
    var arr = creation.linspace(wasm_allocator, start, stop, count) catch return -1;
    writeResult(&arr, out_ptr);
    return 0;
}

fn arrayFromPtrs(data_ptr: usize, data_len: usize, shape_ptr: usize, shape_len: usize) NDArray {
    const data: [*]f64 = @ptrFromInt(data_ptr);
    const shape_ptr_casted: [*]usize = @ptrFromInt(shape_ptr);
    return NDArray{
        .data = data[0..data_len],
        .shape = shape_ptr_casted[0..shape_len],
        .ndim = shape_len,
        .allocator = wasm_allocator,
    };
}

export fn wasm_reshape(data_ptr: usize, data_len: usize, shape_ptr: usize, shape_len: usize, new_shape_ptr: usize, new_shape_len: usize, out_ptr: usize) i32 {
    const arr = arrayFromPtrs(data_ptr, data_len, shape_ptr, shape_len);
    const new_shape = shapeSlice(new_shape_ptr, new_shape_len);
    var res = shaper.reshape(wasm_allocator, &arr, new_shape) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_transpose(data_ptr: usize, data_len: usize, shape_ptr: usize, shape_len: usize, out_ptr: usize) i32 {
    const arr = arrayFromPtrs(data_ptr, data_len, shape_ptr, shape_len);
    var res = shaper.transpose(wasm_allocator, &arr) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_flatten(data_ptr: usize, data_len: usize, shape_ptr: usize, shape_len: usize, out_ptr: usize) i32 {
    const arr = arrayFromPtrs(data_ptr, data_len, shape_ptr, shape_len);
    var res = shaper.flatten(wasm_allocator, &arr) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_squeeze(data_ptr: usize, data_len: usize, shape_ptr: usize, shape_len: usize, out_ptr: usize) i32 {
    const arr = arrayFromPtrs(data_ptr, data_len, shape_ptr, shape_len);
    var res = shaper.squeeze(wasm_allocator, &arr) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_broadcast_shapes(a_ptr: usize, a_len: usize, b_ptr: usize, b_len: usize, out_ptr: usize) i32 {
    const a = shapeSlice(a_ptr, a_len);
    const b = shapeSlice(b_ptr, b_len);
    const res = broadcasting.broadcastShapes(wasm_allocator, a, b) catch return -1;
    const out: [*]usize = @ptrFromInt(out_ptr);
    out[0] = @intFromPtr(res.ptr);
    out[1] = res.len;
    return 0;
}

fn callBinary(
    comptime op: anytype,
    a_ptr: usize,
    a_data_len: usize,
    a_shape_ptr: usize,
    a_shape_len: usize,
    b_ptr: usize,
    b_data_len: usize,
    b_shape_ptr: usize,
    b_shape_len: usize,
    out_ptr: usize,
) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    const b = arrayFromPtrs(b_ptr, b_data_len, b_shape_ptr, b_shape_len);
    var res = op(wasm_allocator, &a, &b) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

fn callUnary(
    comptime op: anytype,
    a_ptr: usize,
    a_data_len: usize,
    a_shape_ptr: usize,
    a_shape_len: usize,
    out_ptr: usize,
) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    var res = op(wasm_allocator, &a) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

fn callScalar(
    comptime op: anytype,
    a_ptr: usize,
    a_data_len: usize,
    a_shape_ptr: usize,
    a_shape_len: usize,
    value: f64,
    out_ptr: usize,
) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    var res = op(wasm_allocator, &a, value) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_add(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize, out_ptr: usize) i32 {
    return callBinary(elementwise.add, a_ptr, a_data_len, a_shape_ptr, a_shape_len, b_ptr, b_data_len, b_shape_ptr, b_shape_len, out_ptr);
}

export fn wasm_subtract(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize, out_ptr: usize) i32 {
    return callBinary(elementwise.subtract, a_ptr, a_data_len, a_shape_ptr, a_shape_len, b_ptr, b_data_len, b_shape_ptr, b_shape_len, out_ptr);
}

export fn wasm_multiply(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize, out_ptr: usize) i32 {
    return callBinary(elementwise.multiply, a_ptr, a_data_len, a_shape_ptr, a_shape_len, b_ptr, b_data_len, b_shape_ptr, b_shape_len, out_ptr);
}

export fn wasm_divide(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize, out_ptr: usize) i32 {
    return callBinary(elementwise.divide, a_ptr, a_data_len, a_shape_ptr, a_shape_len, b_ptr, b_data_len, b_shape_ptr, b_shape_len, out_ptr);
}

export fn wasm_negate(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, out_ptr: usize) i32 {
    return callUnary(elementwise.negate, a_ptr, a_data_len, a_shape_ptr, a_shape_len, out_ptr);
}

export fn wasm_abs(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, out_ptr: usize) i32 {
    return callUnary(elementwise.abs, a_ptr, a_data_len, a_shape_ptr, a_shape_len, out_ptr);
}

export fn wasm_sqrt(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, out_ptr: usize) i32 {
    return callUnary(elementwise.sqrt, a_ptr, a_data_len, a_shape_ptr, a_shape_len, out_ptr);
}

export fn wasm_exp(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, out_ptr: usize) i32 {
    return callUnary(elementwise.exp, a_ptr, a_data_len, a_shape_ptr, a_shape_len, out_ptr);
}

export fn wasm_log(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, out_ptr: usize) i32 {
    return callUnary(elementwise.log, a_ptr, a_data_len, a_shape_ptr, a_shape_len, out_ptr);
}

export fn wasm_add_scalar(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, value: f64, out_ptr: usize) i32 {
    return callScalar(elementwise.addScalar, a_ptr, a_data_len, a_shape_ptr, a_shape_len, value, out_ptr);
}

export fn wasm_mul_scalar(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, value: f64, out_ptr: usize) i32 {
    return callScalar(elementwise.mulScalar, a_ptr, a_data_len, a_shape_ptr, a_shape_len, value, out_ptr);
}

fn callReduceAxis(
    comptime op: anytype,
    a_ptr: usize,
    a_data_len: usize,
    a_shape_ptr: usize,
    a_shape_len: usize,
    axis: usize,
    out_ptr: usize,
) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    var res = op(wasm_allocator, &a, axis) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

fn dataSlice(data_ptr: usize, data_len: usize) []const f64 {
    const start: [*]const f64 = @ptrFromInt(data_ptr);
    return start[0..data_len];
}

export fn wasm_sum(data_ptr: usize, data_len: usize) f64 {
    const data = dataSlice(data_ptr, data_len);
    var acc: f64 = 0.0;
    for (data) |v| acc += v;
    return acc;
}

export fn wasm_mean(data_ptr: usize, data_len: usize) f64 {
    if (data_len == 0) return std.math.nan(f64);
    return wasm_sum(data_ptr, data_len) / @as(f64, @floatFromInt(data_len));
}

export fn wasm_max(data_ptr: usize, data_len: usize) f64 {
    const data = dataSlice(data_ptr, data_len);
    var acc = -std.math.inf(f64);
    for (data) |v| acc = @max(acc, v);
    return acc;
}

export fn wasm_min(data_ptr: usize, data_len: usize) f64 {
    const data = dataSlice(data_ptr, data_len);
    var acc = std.math.inf(f64);
    for (data) |v| acc = @min(acc, v);
    return acc;
}

export fn wasm_prod(data_ptr: usize, data_len: usize) f64 {
    const data = dataSlice(data_ptr, data_len);
    var acc: f64 = 1.0;
    for (data) |v| acc *= v;
    return acc;
}

export fn wasm_argmax(data_ptr: usize, data_len: usize) usize {
    const data = dataSlice(data_ptr, data_len);
    var best: usize = 0;
    for (data, 0..) |v, i| {
        if (v > data[best]) best = i;
    }
    return best;
}

export fn wasm_argmin(data_ptr: usize, data_len: usize) usize {
    const data = dataSlice(data_ptr, data_len);
    var best: usize = 0;
    for (data, 0..) |v, i| {
        if (v < data[best]) best = i;
    }
    return best;
}

export fn wasm_sum_axis(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, axis: usize, out_ptr: usize) i32 {
    return callReduceAxis(reduce.sumAxis, a_ptr, a_data_len, a_shape_ptr, a_shape_len, axis, out_ptr);
}

export fn wasm_mean_axis(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, axis: usize, out_ptr: usize) i32 {
    return callReduceAxis(reduce.meanAxis, a_ptr, a_data_len, a_shape_ptr, a_shape_len, axis, out_ptr);
}

export fn wasm_max_axis(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, axis: usize, out_ptr: usize) i32 {
    return callReduceAxis(reduce.maxAxis, a_ptr, a_data_len, a_shape_ptr, a_shape_len, axis, out_ptr);
}

export fn wasm_min_axis(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, axis: usize, out_ptr: usize) i32 {
    return callReduceAxis(reduce.minAxis, a_ptr, a_data_len, a_shape_ptr, a_shape_len, axis, out_ptr);
}

export fn wasm_prod_axis(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, axis: usize, out_ptr: usize) i32 {
    return callReduceAxis(reduce.prodAxis, a_ptr, a_data_len, a_shape_ptr, a_shape_len, axis, out_ptr);
}

export fn wasm_slice(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, dim: usize, start: i32, stop: i32, step: i32, out_ptr: usize) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    var res = slicing.sliceDim(wasm_allocator, &a, dim, start, stop, step) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_index_axis(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, dim: usize, index: i32, out_ptr: usize) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    var res = slicing.indexAxis(wasm_allocator, &a, dim, index) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_where(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, mask_ptr: usize, mask_len: usize, out_ptr: usize) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    const mask = dataSlice(mask_ptr, mask_len);
    var res = slicing.whereMask(wasm_allocator, &a, mask) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_dot(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize) f64 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    const b = arrayFromPtrs(b_ptr, b_data_len, b_shape_ptr, b_shape_len);
    return linalg.dot(&a, &b) catch 0.0;
}

export fn wasm_matmul(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize, out_ptr: usize) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    const b = arrayFromPtrs(b_ptr, b_data_len, b_shape_ptr, b_shape_len);
    var res = linalg.matmul(wasm_allocator, &a, &b) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}

export fn wasm_outer(a_ptr: usize, a_data_len: usize, a_shape_ptr: usize, a_shape_len: usize, b_ptr: usize, b_data_len: usize, b_shape_ptr: usize, b_shape_len: usize, out_ptr: usize) i32 {
    const a = arrayFromPtrs(a_ptr, a_data_len, a_shape_ptr, a_shape_len);
    const b = arrayFromPtrs(b_ptr, b_data_len, b_shape_ptr, b_shape_len);
    var res = linalg.outer(wasm_allocator, &a, &b) catch return -1;
    writeResult(&res, out_ptr);
    return 0;
}
