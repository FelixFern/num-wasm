const std = @import("std");
const Allocator = std.mem.Allocator;
const testing = std.testing;

const broadcasting = @import("broadcasting.zig");
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

pub fn binaryOp(
    allocator: Allocator,
    a: *const NDArray,
    b: *const NDArray,
    comptime op: fn (f64, f64) f64,
) !NDArray {
    const out_shape = try broadcasting.broadcastShapes(allocator, a.shape, b.shape);
    defer allocator.free(out_shape);

    var out = try NDArray.init(allocator, out_shape);
    errdefer out.deinit();

    const indices = try allocator.alloc(usize, out_shape.len);
    defer allocator.free(indices);
    @memset(indices, 0);

    for (out.data) |*dst| {
        const ia = try broadcasting.broadcastIndex(allocator, indices, a.shape);
        defer allocator.free(ia);
        const ib = try broadcasting.broadcastIndex(allocator, indices, b.shape);
        defer allocator.free(ib);

        dst.* = op(
            a.getItem(ia[ia.len - a.shape.len ..]),
            b.getItem(ib[ib.len - b.shape.len ..]),
        );

        if (!nextIndices(indices, out_shape)) break;
    }

    return out;
}

pub fn unaryOp(
    allocator: Allocator,
    a: *const NDArray,
    comptime op: fn (f64) f64,
) !NDArray {
    var out = try NDArray.init(allocator, a.shape);
    errdefer out.deinit();

    for (out.data, a.data) |*dst, src| dst.* = op(src);

    return out;
}

pub fn scalarOp(
    allocator: Allocator,
    a: *const NDArray,
    value: f64,
    comptime op: fn (f64, f64) f64,
) !NDArray {
    var out = try NDArray.init(allocator, a.shape);
    errdefer out.deinit();

    for (out.data, a.data) |*dst, src| dst.* = op(src, value);

    return out;
}

const OpAdd = struct { fn f(a: f64, b: f64) f64 { return a + b; } };
const OpSub = struct { fn f(a: f64, b: f64) f64 { return a - b; } };
const OpMul = struct { fn f(a: f64, b: f64) f64 { return a * b; } };
const OpDiv = struct { fn f(a: f64, b: f64) f64 { return a / b; } };
const OpNeg = struct { fn f(a: f64) f64 { return -a; } };
const OpAbs = struct { fn f(a: f64) f64 { return @abs(a); } };
const OpSqrt = struct { fn f(a: f64) f64 { return @sqrt(a); } };
const OpExp = struct { fn f(a: f64) f64 { return @exp(a); } };
const OpLog = struct { fn f(a: f64) f64 { return @log(a); } };
const OpAddScalar = struct { fn f(a: f64, b: f64) f64 { return a + b; } };
const OpMulScalar = struct { fn f(a: f64, b: f64) f64 { return a * b; } };
const OpMax = struct { fn f(a: f64, b: f64) f64 { return @max(a, b); } };
const OpMin = struct { fn f(a: f64, b: f64) f64 { return @min(a, b); } };
const OpGreater = struct { fn f(a: f64, b: f64) f64 { return if (a > b) 1.0 else 0.0; } };
const OpLess = struct { fn f(a: f64, b: f64) f64 { return if (a < b) 1.0 else 0.0; } };
const OpEqual = struct { fn f(a: f64, b: f64) f64 { return if (a == b) 1.0 else 0.0; } };

pub fn add(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpAdd.f);
}

pub fn subtract(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpSub.f);
}

pub fn multiply(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpMul.f);
}

pub fn divide(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpDiv.f);
}

pub fn negate(allocator: Allocator, a: *const NDArray) !NDArray {
    return unaryOp(allocator, a, OpNeg.f);
}

pub fn abs(allocator: Allocator, a: *const NDArray) !NDArray {
    return unaryOp(allocator, a, OpAbs.f);
}

pub fn sqrt(allocator: Allocator, a: *const NDArray) !NDArray {
    return unaryOp(allocator, a, OpSqrt.f);
}

pub fn exp(allocator: Allocator, a: *const NDArray) !NDArray {
    return unaryOp(allocator, a, OpExp.f);
}

pub fn log(allocator: Allocator, a: *const NDArray) !NDArray {
    return unaryOp(allocator, a, OpLog.f);
}

pub fn addScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpAddScalar.f);
}

pub fn mulScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpMulScalar.f);
}

pub fn maximum(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpMax.f);
}

pub fn minimum(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpMin.f);
}

pub fn maximumScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpMax.f);
}

pub fn minimumScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpMin.f);
}

pub fn greater(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpGreater.f);
}

pub fn less(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpLess.f);
}

pub fn equal(allocator: Allocator, a: *const NDArray, b: *const NDArray) !NDArray {
    return binaryOp(allocator, a, b, OpEqual.f);
}

pub fn greaterScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpGreater.f);
}

pub fn lessScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpLess.f);
}

pub fn equalScalar(allocator: Allocator, a: *const NDArray, value: f64) !NDArray {
    return scalarOp(allocator, a, value, OpEqual.f);
}

test "add (3,1) + (1,4) → (3,4) broadcast" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{ 3, 1 });
    defer a.deinit();
    var b = try NDArray.init(allocator, &[_]usize{ 1, 4 });
    defer b.deinit();
    a.data[0] = 1.0;
    a.data[1] = 2.0;
    a.data[2] = 3.0;
    for (b.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try add(allocator, &a, &b);
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 3, 4 }, res.shape);
    try testing.expectEqual(@as(f64, 1.0), res.getItem(&[_]usize{ 0, 0 }));
    try testing.expectEqual(@as(f64, 4.0), res.getItem(&[_]usize{ 0, 3 }));
    try testing.expectEqual(@as(f64, 3.0), res.getItem(&[_]usize{ 1, 1 }));
    try testing.expectEqual(@as(f64, 6.0), res.getItem(&[_]usize{ 2, 3 }));
}

test "add (3,4) + (4,) → (3,4) broadcast" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{ 3, 4 });
    defer a.deinit();
    var b = try NDArray.init(allocator, &[_]usize{4});
    defer b.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i);
    for (b.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var res = try add(allocator, &a, &b);
    defer res.deinit();

    try testing.expectEqual(@as(f64, 0.0), res.getItem(&[_]usize{ 0, 0 }));
    try testing.expectEqual(@as(f64, 6.0), res.getItem(&[_]usize{ 0, 3 }));
    try testing.expectEqual(@as(f64, 8.0), res.getItem(&[_]usize{ 2, 0 }));
}

test "add scalar (empty shape) + array broadcasts" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{ 3, 4 });
    defer a.deinit();
    var s = try NDArray.init(allocator, &[_]usize{});
    defer s.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i);
    s.data[0] = 10.0;

    var res = try add(allocator, &a, &s);
    defer res.deinit();

    try testing.expectEqual(@as(f64, 10.0), res.getItem(&[_]usize{ 0, 0 }));
    try testing.expectEqual(@as(f64, 15.0), res.getItem(&[_]usize{ 1, 1 }));
}

test "add incompatible shapes errors" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{ 3, 4 });
    defer a.deinit();
    var b = try NDArray.init(allocator, &[_]usize{ 3, 5 });
    defer b.deinit();

    try testing.expectError(error.IncompatibleShapes, add(allocator, &a, &b));
}

test "subtract, multiply, divide" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{2});
    defer a.deinit();
    var b = try NDArray.init(allocator, &[_]usize{2});
    defer b.deinit();
    a.data[0] = 10.0;
    a.data[1] = 20.0;
    b.data[0] = 4.0;
    b.data[1] = 5.0;

    var sub = try subtract(allocator, &a, &b);
    defer sub.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 6.0, 15.0 }, sub.data);

    var mul = try multiply(allocator, &a, &b);
    defer mul.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 40.0, 100.0 }, mul.data);

    var div = try divide(allocator, &a, &b);
    defer div.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 2.5, 4.0 }, div.data);
}

test "unary ops" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{4});
    defer a.deinit();
    a.data[0] = 4.0;
    a.data[1] = 16.0;
    a.data[2] = 9.0;
    a.data[3] = 0.0;

    var s = try sqrt(allocator, &a);
    defer s.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, 4.0, 3.0, 0.0 }, s.data);

    var e = try exp(allocator, &a);
    defer e.deinit();
    try testing.expectEqual(@as(f64, @exp(4.0)), e.data[0]);

    var l = try log(allocator, &a);
    defer l.deinit();
    try testing.expectEqual(@as(f64, @log(16.0)), l.data[1]);

    var n = try negate(allocator, &a);
    defer n.deinit();
    try testing.expectEqual(@as(f64, -16.0), n.data[1]);

    var ab = try abs(allocator, &n);
    defer ab.deinit();
    try testing.expectEqual(@as(f64, 16.0), ab.data[1]);
}

test "scalar ops" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{ 2, 2 });
    defer a.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i);

    var s = try addScalar(allocator, &a, 10.0);
    defer s.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 10.0, 11.0, 12.0, 13.0 }, s.data);

    var m = try mulScalar(allocator, &a, 2.0);
    defer m.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 2.0, 4.0, 6.0 }, m.data);
}

test "same shape add is elementwise" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{ 2, 2 });
    defer a.deinit();
    var b = try NDArray.init(allocator, &[_]usize{ 2, 2 });
    defer b.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i);
    for (b.data, 0..) |*v, i| v.* = @floatFromInt(10 * i);

    var res = try add(allocator, &a, &b);
    defer res.deinit();

    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 11.0, 22.0, 33.0 }, res.data);
}

test "maximum and minimum" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{3});
    defer a.deinit();
    var b = try NDArray.init(allocator, &[_]usize{3});
    defer b.deinit();
    a.data[0] = 1.0;
    a.data[1] = -5.0;
    a.data[2] = 3.0;
    b.data[0] = 2.0;
    b.data[1] = -1.0;
    b.data[2] = -1.0;

    var mx = try maximum(allocator, &a, &b);
    defer mx.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 2.0, -1.0, 3.0 }, mx.data);

    var mn = try minimum(allocator, &a, &b);
    defer mn.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 1.0, -5.0, -1.0 }, mn.data);

    // ReLU: maximum(Z, 0)
    var relu = try maximumScalar(allocator, &a, 0.0);
    defer relu.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 1.0, 0.0, 3.0 }, relu.data);
}

test "comparisons return 0/1" {
    const allocator = testing.allocator;
    var a = try NDArray.init(allocator, &[_]usize{4});
    defer a.deinit();
    for (a.data, 0..) |*v, i| v.* = @floatFromInt(i); // 0..3

    var gt = try greaterScalar(allocator, &a, 1.0);
    defer gt.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 0.0, 1.0, 1.0 }, gt.data);

    var ls = try lessScalar(allocator, &a, 2.0);
    defer ls.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 1.0, 1.0, 0.0, 0.0 }, ls.data);

    var eq = try equalScalar(allocator, &a, 2.0);
    defer eq.deinit();
    try testing.expectEqualSlices(f64, &[_]f64{ 0.0, 0.0, 1.0, 0.0 }, eq.data);
}

test "equal broadcasts for one-hot" {
    const allocator = testing.allocator;
    var y = try NDArray.init(allocator, &[_]usize{ 3, 1 }); // (m,1)
    defer y.deinit();
    y.data[0] = 0.0;
    y.data[1] = 2.0;
    y.data[2] = 1.0;
    var classes = try NDArray.init(allocator, &[_]usize{3});
    defer classes.deinit();
    classes.data[0] = 0.0;
    classes.data[1] = 1.0;
    classes.data[2] = 2.0;

    var res = try equal(allocator, &y, &classes); // (3,1) vs (3,) → (3,3)
    defer res.deinit();

    try testing.expectEqualSlices(usize, &[_]usize{ 3, 3 }, res.shape);
    // row for sample 0: [1,0,0]; sample 2: [0,0,1]; sample 1: [0,1,0]
    try testing.expectEqualSlices(f64, &[_]f64{
        1.0, 0.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 1.0, 0.0,
    }, res.data);
}
