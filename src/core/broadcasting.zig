const std = @import("std");
const Allocator = std.mem.Allocator;
const testing = std.testing;

pub fn broadcastShapes(allocator: Allocator, a: []const usize, b: []const usize) ![]usize {
    const ndim = @max(a.len, b.len);
    const res = try allocator.alloc(usize, ndim);

    for (0..ndim) |i| {
        const offset = ndim - 1 - i;

        const dim_a = if (i >= a.len) 1 else a[a.len - 1 - i];
        const dim_b = if (i >= b.len) 1 else b[b.len - 1 - i];

        if (dim_a == dim_b) {
            res[offset] = dim_b;
        } else if (dim_a == 1) {
            res[offset] = dim_b;
        } else if (dim_b == 1) {
            res[offset] = dim_a;
        } else {
            allocator.free(res);
            return error.IncompatibleShapes;
        }
    }
    return res;
}

pub fn broadcastIndex(allocator: Allocator, indices: []const usize, original_shape: []const usize) ![]usize {
    const broadcast_ndim = indices.len;
    const lead = broadcast_ndim - original_shape.len;
    const out = try allocator.alloc(usize, broadcast_ndim);

    for (0..broadcast_ndim) |i| {
        if (i < lead) {
            out[i] = 0;
        } else {
            const orig_dim = original_shape[i - lead];
            out[i] = if (orig_dim == 1) 0 else indices[i];
        }
    }

    return out;
}

test "broadcastShapes (3,1) and (1,4) → (3,4)" {
    const shape = try broadcastShapes(testing.allocator, &[_]usize{ 3, 1 }, &[_]usize{ 1, 4 });
    defer testing.allocator.free(shape);
    try testing.expectEqualSlices(usize, &[_]usize{ 3, 4 }, shape);
}

test "broadcastShapes scalar and (3,4) → (3,4)" {
    const shape = try broadcastShapes(testing.allocator, &[_]usize{}, &[_]usize{ 3, 4 });
    defer testing.allocator.free(shape);
    try testing.expectEqualSlices(usize, &[_]usize{ 3, 4 }, shape);
}

test "broadcastShapes (3,4) and (3,5) → error" {
    try testing.expectError(error.IncompatibleShapes, broadcastShapes(testing.allocator, &[_]usize{ 3, 4 }, &[_]usize{ 3, 5 }));
}

test "broadcastShapes (2,3,1) and (4,) → (2,3,4)" {
    const shape = try broadcastShapes(testing.allocator, &[_]usize{ 2, 3, 1 }, &[_]usize{4});
    defer testing.allocator.free(shape);
    try testing.expectEqualSlices(usize, &[_]usize{ 2, 3, 4 }, shape);
}

test "broadcastShapes empty and empty → empty" {
    const shape = try broadcastShapes(testing.allocator, &[_]usize{}, &[_]usize{});
    defer testing.allocator.free(shape);
    try testing.expectEqualSlices(usize, &[_]usize{}, shape);
}

test "broadcastIndex orig (4,) in bcast (3,4)" {
    const out = try broadcastIndex(testing.allocator, &[_]usize{ 1, 2 }, &[_]usize{4});
    defer testing.allocator.free(out);
    try testing.expectEqualSlices(usize, &[_]usize{ 0, 2 }, out);
}

test "broadcastIndex orig (3,1) in bcast (3,4)" {
    const out = try broadcastIndex(testing.allocator, &[_]usize{ 2, 3 }, &[_]usize{ 3, 1 });
    defer testing.allocator.free(out);
    try testing.expectEqualSlices(usize, &[_]usize{ 2, 0 }, out);
}

test "broadcastIndex same shape is identity" {
    const out = try broadcastIndex(testing.allocator, &[_]usize{ 2, 3 }, &[_]usize{ 3, 4 });
    defer testing.allocator.free(out);
    try testing.expectEqualSlices(usize, &[_]usize{ 2, 3 }, out);
}

test "broadcastIndex scalar orig [] in bcast (3,4)" {
    const out = try broadcastIndex(testing.allocator, &[_]usize{ 1, 2 }, &[_]usize{});
    defer testing.allocator.free(out);
    try testing.expectEqualSlices(usize, &[_]usize{ 0, 0 }, out);
}
