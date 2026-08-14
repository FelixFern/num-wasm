import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.sum / mean / max / min / prod (no axis):");
  test("full reductions of arange(0,6) → 0..5", () => {
    const a = nw.arange(0, 6, 1);
    assert.equal(nw.sum(a), 15);
    assert.equal(nw.mean(a), 2.5);
    assert.equal(nw.max(a), 5);
    assert.equal(nw.min(a), 0);
    assert.equal(nw.prod(nw.arange(1, 6, 1)), 120);
    assert.equal(nw.argmax(a), 5);
    assert.equal(nw.argmin(a), 0);
  });

  section("nw.sum with axis:");
  test("nw.sum((3,4), {axis:0}) → [12,15,18,21]", () => {
    const a = nw.arange(0, 12, 1);
    const m = nw.reshape(a, [3, 4]);
    const s = nw.sum(m, { axis: 0 }) as { data: number[]; shape: number[] };
    assert.deepEqual(s.shape, [4]);
    assert.deepEqual(s.data, [12, 15, 18, 21]);
  });

  test("nw.sum((3,4), {axis:1}) → [6,22,38]", () => {
    const a = nw.arange(0, 12, 1);
    const m = nw.reshape(a, [3, 4]);
    const s = nw.sum(m, { axis: 1 }) as { data: number[]; shape: number[] };
    assert.deepEqual(s.shape, [3]);
    assert.deepEqual(s.data, [6, 22, 38]);
  });

  test("nw.mean((2,2), {axis:0}) → [2,3]", () => {
    // [[1,2],[3,4]] → col means [2,3]
    const base = nw.arange(1, 5, 1);
    const arr = nw.reshape(base, [2, 2]);
    const s = nw.mean(arr, { axis: 0 }) as { data: number[]; shape: number[] };
    assert.deepEqual(s.shape, [2]);
    assert.deepEqual(s.data, [2, 3]);
  });

  test("nw.max / min with axis", () => {
    const base = nw.arange(1, 9, 1); // 1..8
    const arr = nw.reshape(base, [2, 4]);
    const mx = nw.max(arr, { axis: 1 }) as { data: number[]; shape: number[] };
    assert.deepEqual(mx.data, [4, 8]);
    const mn = nw.min(arr, { axis: 0 }) as { data: number[]; shape: number[] };
    assert.deepEqual(mn.data, [1, 2, 3, 4]);
  });
}
