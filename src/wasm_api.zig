const std = @import("std");
const wasm_allocator = std.heap.wasm_allocator;

const creation = @import("core/creation.zig");
const NDArray = @import("core/ndarray.zig").NDArray;
const shaper = @import("core/shape.zig");

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
