import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.slice:");
  test("nw.slice((4,5), dim 1, 1..4) → (4,3)", () => {
    const a = nw.arange(0, 20, 1);
    const m = nw.reshape(a, [4, 5]);
    const s = nw.slice(m, 1, 1, 4);
    assert.deepEqual(s.shape, [4, 3]);
    assert.deepEqual(s.data, [1, 2, 3, 6, 7, 8, 11, 12, 13, 16, 17, 18]);
  });

  test("nw.slice negative start picks last rows", () => {
    const a = nw.arange(0, 20, 1);
    const m = nw.reshape(a, [4, 5]);
    const s = nw.slice(m, 0, -2, 4);
    assert.deepEqual(s.shape, [2, 5]);
    assert.deepEqual(s.data, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  test("nw.slice with step 2", () => {
    const a = nw.arange(0, 6, 1);
    const s = nw.slice(a, 0, 0, 6, 2);
    assert.deepEqual(s.data, [0, 2, 4]);
  });

  section("nw.indexAxis:");
  test("nw.indexAxis((4,5), dim 0, 1) → row [5..9]", () => {
    const a = nw.arange(0, 20, 1);
    const m = nw.reshape(a, [4, 5]);
    const r = nw.indexAxis(m, 0, 1);
    assert.deepEqual(r.shape, [5]);
    assert.deepEqual(r.data, [5, 6, 7, 8, 9]);
  });

  test("nw.indexAxis((4,5), dim 0, -1) → last row", () => {
    const a = nw.arange(0, 20, 1);
    const m = nw.reshape(a, [4, 5]);
    const r = nw.indexAxis(m, 0, -1);
    assert.deepEqual(r.data, [15, 16, 17, 18, 19]);
  });

  test("nw.indexAxis((4,5), dim 1, 2) → column of 2s", () => {
    const a = nw.arange(0, 20, 1);
    const m = nw.reshape(a, [4, 5]);
    const c = nw.indexAxis(m, 1, 2);
    assert.deepEqual(c.shape, [4]);
    assert.deepEqual(c.data, [2, 7, 12, 17]);
  });

  test("nw.indexAxis out of bounds throws", () => {
    const a = nw.arange(0, 20, 1);
    const m = nw.reshape(a, [4, 5]);
    assert.throws(() => nw.indexAxis(m, 0, 9));
    assert.throws(() => nw.indexAxis(m, 0, -5));
  });

  section("nw.where:");
  test("nw.where masks out zero positions", () => {
    const a = nw.arange(0, 6, 1); // [0..5]
    const mask = [1, 0, 1, 0, 0, 1];
    const r = nw.where(a, mask);
    assert.deepEqual(r.shape, [3]);
    assert.deepEqual(r.data, [0, 2, 5]);
  });

  test("nw.where empty selection", () => {
    const a = nw.arange(0, 3, 1);
    const r = nw.where(a, [0, 0, 0]);
    assert.deepEqual(r.data, []);
  });

  test("nw.where mask length mismatch throws", () => {
    const a = nw.arange(0, 3, 1);
    assert.throws(() => nw.where(a, [1]));
  });
}
