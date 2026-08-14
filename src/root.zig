const std = @import("std");

pub const NDArray = @import("core/ndarray.zig").NDArray;
pub const creation = @import("core/creation.zig");
pub const elementwise = @import("core/elementwise.zig");
pub const shape = @import("core/shape.zig");

test {
    std.testing.refAllDecls(@This());
}
