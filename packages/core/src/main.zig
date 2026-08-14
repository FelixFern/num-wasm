const std = @import("std");

const num_wasm = @import("num_wasm");

pub fn main() !void {
    std.debug.print("All your {s} are belong to us.\n", .{"codebase"});
    try num_wasm.bufferedPrint();
}
