import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.dot:");
  test("nw.dot([1,2,3], [4,5,6]) → 32", () => {
    const a = nw.arange(1, 4, 1);
    const b = nw.arange(4, 7, 1);
    assert.equal(nw.dot(a, b), 32);
  });

  test("nw.dot length mismatch throws", () => {
    assert.throws(() => nw.dot(nw.arange(0, 3, 1), nw.arange(0, 4, 1)));
  });

  section("nw.matmul:");
  test("nw.matmul((2,3) × (3,2)) → (2,2)", () => {
    const a = nw.reshape(nw.arange(0, 6, 1), [2, 3]); // [[0,1,2],[3,4,5]]
    const b = nw.reshape(nw.arange(0, 6, 1), [3, 2]); // [[0,1],[2,3],[4,5]]
    const r = nw.matmul(a, b);
    assert.deepEqual(r.shape, [2, 2]);
    assert.deepEqual(r.data, [10, 13, 28, 40]);
  });

  test("nw.matmul identity preserves", () => {
    const a = nw.array([[1, 2, 3], [4, 5, 6]]);
    const ident = nw.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
    const r = nw.matmul(a, ident);
    assert.deepEqual(r.data, [1, 2, 3, 4, 5, 6]);
  });

  test("nw.matmul incompatible throws", () => {
    assert.throws(() => nw.matmul(nw.full([2, 3], 1), nw.full([2, 2], 1)));
  });

  section("nw.outer:");
  test("nw.outer([1,2], [3,4,5]) → (2,3)", () => {
    const a = nw.arange(1, 3, 1);
    const b = nw.arange(3, 6, 1);
    const r = nw.outer(a, b);
    assert.deepEqual(r.shape, [2, 3]);
    assert.deepEqual(r.data, [3, 4, 5, 6, 8, 10]);
  });
}
