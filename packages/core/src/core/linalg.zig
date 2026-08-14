const std = @import("std");
const Allocator = std.mem.Allocator;
const testing = std.testing;

const NDArray = @import("ndarray.zig").NDArray;

pub fn dot(a: *const NDArray, b: *const NDArray) !f64 {
    if (a.ndim != 1 or b.ndim != 1) return error.MismatchDimension;
    if (a.data.len != b.data.len) return error.DimensionMismatch;

    var acc: f64 = 0.0;
    for (a.data, b.data) |x, y| acc += x * y;
    return acc;
}

pub fn matmul(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    if (a.ndim != 2 or b.ndim != 2) return error.MismatchDimension;

    const m = a.shape[0];
    const k = a.shape[1];
    const n = b.shape[1];
    if (b.shape[0] != k) return error.DimensionMismatch;

    var res = try NDArray.init(allocator, &[_]usize{ m, n });
    errdefer res.deinit();

    for (0..m) |i| {
        for (0..n) |j| {
            var acc: f64 = 0.0;
            for (0..k) |r| {
                acc += a.data[i * k + r] * b.data[r * n + j];
            }
            res.data[i * n + j] = acc;
        }
    }

    return res;
}

pub fn outer(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    if (a.ndim != 1 or b.ndim != 1) return error.MismatchDimension;

    const m = a.data.len;
    const n = b.data.len;

    var res = try NDArray.init(allocator, &[_]usize{ m, n });
    errdefer res.deinit();

    for (0..m) |i| {
        for (0..n) |j| {
            res.data[i * n + j] = a.data[i] * b.data[j];
        }
    }

    return res;
}

test "dot 1D" {
    var a = try NDArray.init(testing.allocator, &[_]usize{3});
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{3});
    defer b.deinit();
    a.data[0] = 1.0;
    a.data[1] = 2.0;
    a.data[2] = 3.0;
    b.data[0] = 4.0;
    b.data[1] = 5.0;
    b.data[2] = 6.0;

    try testing.expectEqual(@as(f64, 32.0), try dot(&a, &b));
}

test "dot length mismatch errors" {
    var a = try NDArray.init(testing.allocator, &[_]usize{2});
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{3});
    defer b.deinit();
    try testing.expectError(error.DimensionMismatch, dot(&a, &b));
}

test "dot rejects non-1D" {
    var a = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer b.deinit();
    try testing.expectError(error.MismatchDimension, dot(&a, &b));
}

test "matmul (2,3) × (3,2) → (2,2)" {
    var a = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{ 3, 2 });
    defer b.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i); // [[0,1,2],[3,4,5]]
    for (b.data, 0..) |*v, i| v.* = @floatFromInt(i); // [[0,1],[2,3],[4,5]]

    var res = try matmul(testing.allocator, &a, &b);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 2, 2 }, res.shape);
    // row 0: [0*0+1*2+2*4, 0*1+1*3+2*5] = [10, 13]
    // row 1: [3*0+4*2+5*4, 3*1+4*3+5*5] = [28, 40]
    try testing.expectEqualSlices(f64, &[_]f64{ 10.0, 13.0, 28.0, 40.0 }, res.data);
}

test "matmul identity" {
    var a = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer a.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i + 1); // 1..6

    var ident = try NDArray.init(testing.allocator, &[_]usize{ 3, 3 });
    defer ident.deinit();
    ident.data[0] = 1.0;
    ident.data[4] = 1.0;
    ident.data[8] = 1.0;

    var res = try matmul(testing.allocator, &a, &ident);
    defer res.deinit();

    try testing.expectEqualSlices(f64, a.data, res.data);
}

test "matmul dimension mismatch errors" {
    var a = try NDArray.init(testing.allocator, &[_]usize{ 2, 3 });
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{ 2, 2 });
    defer b.deinit();
    try testing.expectError(error.DimensionMismatch, matmul(testing.allocator, &a, &b));
}

test "matmul rejects non-2D" {
    var a = try NDArray.init(testing.allocator, &[_]usize{3});
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{3});
    defer b.deinit();
    try testing.expectError(error.MismatchDimension, matmul(testing.allocator, &a, &b));
}

test "outer [1,2] ⊗ [3,4,5]" {
    var a = try NDArray.init(testing.allocator, &[_]usize{2});
    defer a.deinit();
    var b = try NDArray.init(testing.allocator, &[_]usize{3});
    defer b.deinit();
    a.data[0] = 1.0;
    a.data[1] = 2.0;
    b.data[0] = 3.0;
    b.data[1] = 4.0;
    b.data[2] = 5.0;

    var res = try outer(testing.allocator, &a, &b);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 2, 3 }, res.shape);
    try testing.expectEqualSlices(f64, &[_]f64{ 3.0, 4.0, 5.0, 6.0, 8.0, 10.0 }, res.data);
}
