const std = @import("std");
const Allocator = std.mem.Allocator;
const testing = std.testing;

const NDArray = @import("ndarray.zig").NDArray;

pub fn reshape(allocator: Allocator, arr: *const NDArray, new_shape: []const usize) !NDArray {
    var new_total: usize = 1;
    for (new_shape) |size| {
        new_total *= size;
    }

    if (new_total != arr.data.len) return error.ShapeMismatch;

    const res = try NDArray.init(allocator, new_shape);
    @memcpy(res.data, arr.data);

    return res;
}

pub fn transpose(allocator: Allocator, arr: *const NDArray) !NDArray {
    if (arr.ndim != 2) return error.MismatchDimension;

    const rows = arr.shape[0];
    const cols = arr.shape[1];
    var res = try NDArray.init(allocator, &[_]usize{ cols, rows });

    for (0..cols) |c| {
        for (0..rows) |r| {
            res.setItem(&[_]usize{ c, r }, arr.getItem(&[_]usize{ r, c }));
        }
    }

    return res;
}

pub fn flatten(allocator: Allocator, arr: *const NDArray) !NDArray {
    return reshape(allocator, arr, &[_]usize{arr.data.len});
}

pub fn squeeze(allocator: Allocator, arr: *const NDArray) !NDArray {
    var keep_count: usize = 0;
    for (arr.shape) |size| {
        if (size != 1) keep_count += 1;
    }

    const new_shape = try allocator.alloc(usize, keep_count);
    var walk: usize = 0;

    for (arr.shape) |size| {
        if (size == 1) continue;
        new_shape[walk] = size;
        walk += 1;
    }

    const res: NDArray = try NDArray.init(allocator, new_shape);
    allocator.free(new_shape);
    @memcpy(res.data, arr.data);

    return res;
}

test "reshape (2, 6) to (3, 4) preserves values" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{ 2, 6 });
    defer arr.deinit();

    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try reshape(allocator, &arr, &[_]usize{ 3, 4 });
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 3, 4 }, res.shape);
    try testing.expectEqual(@as(usize, 12), res.data.len);
    try testing.expectEqualSlices(f64, arr.data, res.data);
}

test "reshape with mismatched total returns error" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{ 2, 6 });
    defer arr.deinit();

    try testing.expectError(error.ShapeMismatch, reshape(allocator, &arr, &[_]usize{ 2, 5 }));
}

test "transpose (3, 4) to (4, 3)" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{ 3, 4 });
    defer arr.deinit();

    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);
    // arr[i][j] = i*4 + j
    arr.setItem(&[_]usize{ 2, 3 }, 99.0);

    var res = try transpose(allocator, &arr);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 4, 3 }, res.shape);
    // res[j][i] = arr[i][j]
    try testing.expectEqual(@as(f64, 99.0), res.getItem(&[_]usize{ 3, 2 }));
    try testing.expectEqual(@as(f64, 1.0), res.getItem(&[_]usize{ 1, 0 }));
    try testing.expectEqual(@as(f64, 5.0), res.getItem(&[_]usize{ 1, 1 }));
}

test "transpose rejects non-2D" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{5});
    defer arr.deinit();

    try testing.expectError(error.MismatchDimension, transpose(allocator, &arr));
}

test "flatten (2, 3) to 1D" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{ 2, 3 });
    defer arr.deinit();

    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try flatten(allocator, &arr);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{6}, res.shape);
    try testing.expectEqualSlices(f64, arr.data, res.data);
}

test "squeeze removes size-1 dims" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{ 3, 1, 4 });
    defer arr.deinit();

    for (arr.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try squeeze(allocator, &arr);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 3, 4 }, res.shape);
    try testing.expectEqualSlices(f64, arr.data, res.data);
}

test "squeeze with no size-1 dims returns same shape" {
    const allocator = testing.allocator;
    var arr = try NDArray.init(allocator, &[_]usize{ 2, 3 });
    defer arr.deinit();

    var res = try squeeze(allocator, &arr);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 2, 3 }, res.shape);
}
