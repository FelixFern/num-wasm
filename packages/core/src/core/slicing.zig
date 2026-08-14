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

pub fn sliceDim(
    allocator: Allocator,
    arr: *const NDArray,
    dim: usize,
    start: isize,
    stop: isize,
    step: isize,
) !NDArray {
    if (dim >= arr.ndim) return error.OutOfBounds;
    if (step == 0) return error.InvalidStep;
    if (step < 0) return error.UnsupportedStep;

    const dim_len: isize = @intCast(arr.shape[dim]);
    const norm_start: isize = if (start < 0) dim_len + start else start;
    const norm_stop: isize = if (stop < 0) dim_len + stop else stop;
    const s = @max(norm_start, 0);
    const e = @min(norm_stop, dim_len);
    const st: isize = step;

    const count: usize = if (e <= s) 0 else @intCast(@divFloor(e - s + st - 1, st));

    const out_shape = try allocator.dupe(usize, arr.shape);
    defer allocator.free(out_shape);
    out_shape[dim] = count;

    var out = try NDArray.init(allocator, out_shape);
    errdefer out.deinit();

    const out_idx = try allocator.alloc(usize, arr.ndim);
    defer allocator.free(out_idx);
    @memset(out_idx, 0);

    const in_idx = try allocator.alloc(usize, arr.ndim);
    defer allocator.free(in_idx);

    for (out.data) |*dst| {
        for (0..arr.ndim) |i| {
            if (i == dim) {
                in_idx[i] = @intCast(s + @as(isize, @intCast(out_idx[i])) * st);
            } else {
                in_idx[i] = out_idx[i];
            }
        }
        dst.* = arr.getItem(in_idx);
        if (!nextIndices(out_idx, out_shape)) break;
    }

    return out;
}

pub fn indexAxis(
    allocator: Allocator,
    arr: *const NDArray,
    dim: usize,
    index: isize,
) !NDArray {
    if (dim >= arr.ndim) return error.OutOfBounds;

    const dim_len: isize = @intCast(arr.shape[dim]);
    const norm_index: isize = if (index < 0) dim_len + index else index;
    if (norm_index < 0 or norm_index >= dim_len) return error.OutOfBounds;
    const idx: usize = @intCast(norm_index);

    const out_shape = try allocator.alloc(usize, arr.ndim - 1);
    defer allocator.free(out_shape);
    for (arr.shape, 0..) |d, i| {
        if (i < dim) {
            out_shape[i] = d;
        } else if (i > dim) {
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
            if (i < dim) in_idx[i] = v else in_idx[i + 1] = v;
        }
        in_idx[dim] = idx;
        dst.* = arr.getItem(in_idx);
        if (!nextIndices(out_idx, out_shape)) break;
    }

    return out;
}

pub fn whereMask(allocator: Allocator, arr: *const NDArray, mask: []const f64) !NDArray {
    if (mask.len != arr.data.len) return error.MaskLengthMismatch;

    var count: usize = 0;
    for (mask) |m| {
        if (m != 0.0) count += 1;
    }

    var out = try NDArray.init(allocator, &[_]usize{count});
    errdefer out.deinit();

    var w: usize = 0;
    for (arr.data, mask) |v, m| {
        if (m != 0.0) {
            out.data[w] = v;
            w += 1;
        }
    }

    return out;
}

test "slice (4,5) dim 1 → (4,3)" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 4, 5 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);
    // row r: [5r .. 5r+4]

    var res = try sliceDim(testing.allocator, &arr, 1, 1, 4, 1);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 4, 3 }, res.shape);
    // row 0 cols 1..3 → 1,2,3 ; row 1 → 6,7,8
    try testing.expectEqual(@as(f64, 1.0), res.getItem(&[_]usize{ 0, 0 }));
    try testing.expectEqual(@as(f64, 3.0), res.getItem(&[_]usize{ 0, 2 }));
    try testing.expectEqual(@as(f64, 7.0), res.getItem(&[_]usize{ 1, 1 }));
    try testing.expectEqual(@as(f64, 18.0), res.getItem(&[_]usize{ 3, 2 }));
}

test "slice dim 0 negative start" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 4, 5 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try sliceDim(testing.allocator, &arr, 0, -2, 4, 1);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 2, 5 }, res.shape);
    // rows 2 and 3
    try testing.expectEqual(@as(f64, 10.0), res.getItem(&[_]usize{ 0, 0 }));
    try testing.expectEqual(@as(f64, 15.0), res.getItem(&[_]usize{ 1, 0 }));
}

test "slice with step" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{6});
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try sliceDim(testing.allocator, &arr, 0, 0, 6, 2);
    defer res.deinit();

    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 2.0, 4.0 }, res.data);
}

test "slice out of bounds dim errors" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer arr.deinit();
    try testing.expectError(error.OutOfBounds, sliceDim(testing.allocator, &arr, 2, 0, 1, 1));
    try testing.expectError(error.InvalidStep, sliceDim(testing.allocator, &arr, 0, 0, 1, 0));
    try testing.expectError(error.UnsupportedStep, sliceDim(testing.allocator, &arr, 0, 0, 1, -1));
}

test "indexAxis (4,5) dim 0 → row 1" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 4, 5 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try indexAxis(testing.allocator, &arr, 0, 1);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{5}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 5.0, 6.0, 7.0, 8.0, 9.0 }, res.data);
}

test "indexAxis negative index takes last" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 4, 5 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try indexAxis(testing.allocator, &arr, 0, -1);
    defer res.deinit();

    try testing.expectEqual(@as(f64, 15.0), res.getItem(&[_]usize{0}));
    try testing.expectEqual(@as(f64, 19.0), res.getItem(&[_]usize{4}));
}

test "indexAxis dim 1 picks column" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 4, 5 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try indexAxis(testing.allocator, &arr, 1, 2);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{4}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, 7.0, 12.0, 17.0 }, res.data);
}

test "indexAxis out of bounds errors" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer arr.deinit();
    try testing.expectError(error.OutOfBounds, indexAxis(testing.allocator, &arr, 0, 5));
    try testing.expectError(error.OutOfBounds, indexAxis(testing.allocator, &arr, 0, -3));
}

test "whereMask selects nonzero mask positions" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer arr.deinit();
    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i); // 0..5

    const mask = [_]f64{ 1.0, 0.0, 1.0, 0.0, 0.0, 1.0 };
    var res = try whereMask(testing.allocator, &arr, &mask);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{3}, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 2.0, 5.0 }, res.data);
}

test "whereMask empty selection" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{2});
    defer arr.deinit();
    const mask = [_]f64{ 0.0, 0.0 };
    var res = try whereMask(testing.allocator, &arr, &mask);
    defer res.deinit();
    try testing.expectEqual(@as(usize, 0), res.data.len);
}

test "whereMask length mismatch errors" {
    var arr = try NDArray.init(testing.allocator, &[_]usize{2});
    defer arr.deinit();
    const mask = [_]f64{1.0};
    try testing.expectError(error.MaskLengthMismatch, whereMask(testing.allocator, &arr, &mask));
}
