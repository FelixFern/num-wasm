import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.broadcastShapes:");
  test("nw.broadcastShapes([3,1], [1,4]) → [3,4]", () => {
    assert.deepEqual(nw.broadcastShapes([3, 1], [1, 4]), [3, 4]);
  });

  test("nw.broadcastShapes([3,4], [4]) → [3,4]", () => {
    assert.deepEqual(nw.broadcastShapes([3, 4], [4]), [3, 4]);
  });

  test("nw.broadcastShapes([], [3,4]) → [3,4]", () => {
    assert.deepEqual(nw.broadcastShapes([], [3, 4]), [3, 4]);
  });

  test("nw.broadcastShapes([3,4], [3,5]) throws", () => {
    assert.throws(() => nw.broadcastShapes([3, 4], [3, 5]));
  });

  test("nw.broadcastShapes([2,3,1], [4]) → [2,3,4]", () => {
    assert.deepEqual(nw.broadcastShapes([2, 3, 1], [4]), [2, 3, 4]);
  });
}
