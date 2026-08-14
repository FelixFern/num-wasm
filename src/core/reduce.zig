const std = @import("std");
const Allocator = std.mem.Allocator;
const testing = std.testing;

const NDArray = @import("ndarray.zig").NDArray;

fn nextIndices(indices: []usize, shape: []const usize) bool {
    var d: usize = indices.len;
    while (d > 0) {
        d -= 1;
        indices[d] += 1;
        if (indices[d] < shape[d]) return true;
        indices[d] = 0;
    }
    return false;
}

pub fn reduceAll(
    arr: *const NDArray,
    comptime op: fn (f64, f64) f64,
    comptime identity: f64,
) f64 {
    var acc = identity;
    for (arr.data) |v| acc = op(acc, v);
    return acc;
}

pub fn reduceAxis(
    allocator: Allocator,
    arr: *const NDArray,
    axis: usize,
    comptime op: fn (f64, f64) f64,
    comptime identity: f64,
) !NDArray {
    if (axis >= arr.ndim) return error.OutOfBounds;

    const out_shape = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_shape);
    for (arr.shape, 0..) |d, i| {
        if (i < axis) {
            out_shape[i] = d;
        } else if (i > axis) {
            out_shape[i - 1] = d;
        }
    }

    var out = try NDArray.init(allocator, out_shape);
    errdefer out.deinit();

    const out_idx = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_idx);
    @memset(out_idx, 0);

    const in_idx = try allocator.alloc(usize, arr.ndim);
    defer allocator.free(in_idx);

    for (out.data) |*dst| {
        for (out_idx, 0..) |v, i| {
            if (i < axis) in_idx[i] = v else in_idx[i + 1] = v;
        }

        var acc = identity;
        for (0..arr.shape[axis]) |k| {
            in_idx[axis] = k;
            acc = op(acc, arr.getItem(in_idx));
        }
        dst.* = acc;

        if (!nextIndices(out_idx, out_shape)) break;
    }

    return out;
}

const OpSum = struct { fn f(a: f64, b: f64) f64 { return a + b; } };
const OpProd = struct { fn f(a: f64, b: f64) f64 { return a * b; } };
const OpMax = struct { fn f(a: f64, b: f64) f64 { return @max(a, b); } };
const OpMin = struct { fn f(a: f64, b: f64) f64 { return @min(a, b); } };

const neg_inf = -std.math.inf(f64);
const pos_inf = std.math.inf(f64);

pub fn sumAll(arr: *const NDArray) f64 {
    return reduceAll(arr, OpSum.f, 0.0);
}

pub fn prodAll(arr: *const NDArray) f64 {
    return reduceAll(arr, OpProd.f, 1.0);
}

pub fn maxAll(arr: *const NDArray) f64 {
    return reduceAll(arr, OpMax.f, neg_inf);
}

pub fn minAll(arr: *const NDArray) f64 {
    return reduceAll(arr, OpMin.f, pos_inf);
}

pub fn meanAll(arr: *const NDArray) f64 {
    if (arr.data.len == 0) return std.math.nan(f64);
    return sumAll(arr) / @as(f64, @floatFromInt(arr.data.len));
}

pub fn sumAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    return reduceAxis(allocator, arr, axis, OpSum.f, 0.0);
}

pub fn prodAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    return reduceAxis(allocator, arr, axis, OpProd.f, 1.0);
}

pub fn maxAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    return reduceAxis(allocator, arr, axis, OpMax.f, neg_inf);
}

pub fn minAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    return reduceAxis(allocator, arr, axis, OpMin.f, pos_inf);
}

pub fn meanAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    var out = try sumAxis(allocator, arr, axis);
    errdefer out.deinit();
    const count = @as(f64, @floatFromInt(arr.shape[axis]));
    for (out.data) |*v| v.* /= count;
    return out;
}

pub fn argmax(arr: *const NDArray) usize {
    var best: usize = 0;
    for (arr.data, 0..) |v, i| {
        if (v > arr.data[best]) best = i;
    }
    return best;
}

pub fn argmin(arr: *const NDArray) usize {
    var best: usize = 0;
    for (arr.data, 0..) |v, i| {
        if (v < arr.data[best]) best = i;
    }
    return best;
}

pub fn argmaxAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    if (axis >= arr.ndim) return error.OutOfBounds;

    const out_shape = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_shape);
    for (arr.shape, 0..) |d, i| {
        if (i < axis) {
            out_shape[i] = d;
        } else if (i > axis) {
            out_shape[i - 1] = d;
        }
    }

    var out = try NDArray.init(allocator, out_shape);
    errdefer out.deinit();

    const out_idx = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_idx);
    @memset(out_idx, 0);

    const in_idx = try allocator.alloc(usize, arr.ndim);
    defer allocator.free(in_idx);

    for (out.data) |*dst| {
        for (out_idx, 0..) |v, i| {
            if (i < axis) in_idx[i] = v else in_idx[i + 1] = v;
        }

        var best_value = -std.math.inf(f64);
        var best_index: usize = 0;
        for (0..arr.shape[axis]) |k| {
            in_idx[axis] = k;
            const val = arr.getItem(in_idx);
            if (val > best_value) {
                best_value = val;
                best_index = k;
            }
        }
        dst.* = @floatFromInt(best_index);

        if (!nextIndices(out_idx, out_shape)) break;
    }

    return out;
}

pub fn argminAxis(allocator: Allocator, arr: *const NDArray, axis: usize) !NDArray {
    if (axis >= arr.ndim) return error.OutOfBounds;

    const out_shape = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_shape);
    for (arr.shape, 0..) |d, i| {
        if (i < axis) {
            out_shape[i] = d;
        } else if (i > axis) {
            out_shape[i - 1] = d;
        }
    }

    var out = try NDArray.init(allocator, out_shape);
    errdefer out.deinit();

    const out_idx = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_idx);
    @memset(out_idx, 0);

    const in_idx = try allocator.alloc(usize, arr.ndim);
    defer allocator.free(in_idx);

    for (out.data) |*dst| {
        for (out_idx, 0..) |v, i| {
            if (i < axis) in_idx[i] = v else in_idx[i + 1] = v;
        }

        var best_value = std.math.inf(f64);
        var best_index: usize = 0;
        for (0..arr.shape[axis]) |k| {
            in_idx[axis] = k;
            const val = arr.getItem(in_idx);
            if (val < best_value) {
                best_value = val;
                best_index = k;
            }
        }
        dst.* = @floatFromInt(best_index);

        if (!nextIndices(out_idx, out_shape)) break;
    }

    return out;
}

test "full reductions" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i); // 0..5

    try testing.expectEqual(@as(f64, 15.0), sumAll(&arr));
    try testing.expectEqual(@as(f64, 0.0), prodAll(&arr));
    try testing.expectEqual(@as(f64, 5.0), maxAll(&arr));
    try testing.expectEqual(@as(f64, 0.0), minAll(&arr));
    try testing.expectEqual(@as(f64, 2.5), meanAll(&arr));
    try testing.expectEqual(@as(usize, 5), argmax(&arr));
    try testing.expectEqual(@as(usize, 0), argmin(&arr));
}

test "sum axis 0 of (3,4) → (4,)" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 3, 4 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);
    // arr[i][j] = i*4 + j
    // col j sums: 0+4+8, 1+5+9, 2+6+10, 3+7+11 = 12, 15, 18, 21

    var res = try sumAxis(testing.allocator, &arr, 0);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{4}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 12.0, 15.0, 18.0, 21.0 }, res.data);
}

test "sum axis 1 of (3,4) → (3,)" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 3, 4 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);
    // row i sums: 6, 22, 38

    var res = try sumAxis(testing.allocator, &arr, 1);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{3}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 6.0, 22.0, 38.0 }, res.data);
}

test "mean / max / min / prod axis" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer arr.deinit();
    arr.data[0] = 1.0;
    arr.data[1] = 2.0;
    arr.data[2] = 3.0;
    arr.data[3] = 8.0;

    var m = try meanAxis(testing.allocator, &arr, 0);
    defer m.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, 5.0 }, m.data);

    var mx = try maxAxis(testing.allocator, &arr, 1);
    defer mx.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, 8.0 }, mx.data);

    var mn = try minAxis(testing.allocator, &arr, 0);
    defer mn.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 1.0, 2.0 }, mn.data);

    var p = try prodAxis(testing.allocator, &arr, 0);
    defer p.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 3.0, 16.0 }, p.data);
}

test "reduce axis out of bounds errors" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer arr.deinit();
    try testing.expectError(error.OutOfBounds, sumAxis(testing.allocator, &arr, 2));
}

test "reduce 3D axis" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 2, 2 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);
    // shape (2,2,2), values 0..7
    // sum axis 1 → shape (2,2): [sum(0,2), sum(1,3), sum(4,6), sum(5,7)] = [2,4,10,12]

    var res = try sumAxis(testing.allocator, &arr, 1);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 2, 2 }, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, 4.0, 10.0, 12.0 }, res.data);
}

test "argmax axis 0 of (3,4)" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 3, 4 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);
    // arr[i][j] = i*4 + j
    // col j argmax over rows: index 2 for all (2*4+j is largest)

    var res = try argmaxAxis(testing.allocator, &arr, 0);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{4}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, 2.0, 2.0, 2.0 }, res.data);
}

test "argmax axis 1 picks per-row max index" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer arr.deinit();
    // row 0: [5, 1, 3] → argmax 0 ; row 1: [0, 2, 9] → argmax 2
    arr.data[0] = 5.0;
    arr.data[1] = 1.0;
    arr.data[2] = 3.0;
    arr.data[3] = 0.0;
    arr.data[4] = 2.0;
    arr.data[5] = 9.0;

    var res = try argmaxAxis(testing.allocator, &arr, 1);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{2}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 2.0 }, res.data);
}

test "argmin axis" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer arr.deinit();
    arr.data[0] = 5.0;
    arr.data[1] = 1.0;
    arr.data[2] = 3.0;
    arr.data[3] = 0.0;
    arr.data[4] = 2.0;
    arr.data[5] = 9.0;

    var res = try argminAxis(testing.allocator, &arr, 1);
    defer res.deinit();

    try testing.expectEqualSlices(f64, &[_]f64{ 1.0, 0.0 }, res.data);
}

test "argmax axis out of bounds errors" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer arr.deinit();
    try testing.expectError(error.OutOfBounds, argmaxAxis(testing.allocator, &arr, 5));
}
