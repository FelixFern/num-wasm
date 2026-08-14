import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.array:");
  test("nw.array([[1,2,3],[4,5,6]]) infers shape", () => {
    const a = nw.array([[1, 2, 3], [4, 5, 6]]);
    assert.deepEqual(a.shape, [2, 3]);
    assert.deepEqual(a.toArray(), [1, 2, 3, 4, 5, 6]);
  });

  test("nw.array 3D infers shape", () => {
    const a = nw.array([[[1], [2]], [[3], [4]]]);
    assert.deepEqual(a.shape, [2, 2, 1]);
    assert.deepEqual(a.data, [1, 2, 3, 4]);
  });

  test("nw.array scalar (empty) shape", () => {
    const a = nw.array([]);
    assert.deepEqual(a.shape, [0]);
    assert.deepEqual(a.toArray(), []);
  });

  section("NdArray class:");
  test("toTypedArray returns copy, mutate safe", () => {
    const a = nw.array([1, 2, 3]);
    const t = a.toTypedArray();
    t[0] = 999;
    assert.equal(a.toArray()[0], 1);
  });

  test("free is idempotent", () => {
    const a = nw.array([1, 2, 3]);
    a.free();
    a.free();
    assert.deepEqual(a.shape, [3]);
  });

  section("Target API example from plan:");
  test("plan example works end-to-end", () => {
    const a = nw.array([[1, 2, 3], [4, 5, 6]]);
    const b = nw.ones([2, 3]);
    const c = nw.add(a, b);
    const s = nw.sum(c, { axis: 0 }) as { toArray(): number[] };
    assert.deepEqual(s.toArray(), [7, 9, 11]);
    a.free();
    b.free();
    c.free();
  });
}
