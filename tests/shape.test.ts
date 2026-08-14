import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.reshape:");
  test("nw.reshape((2, 6) → (3, 4)) preserves values", () => {
    const a = nw.arange(0, 12, 1);
    const r = nw.reshape(a, [3, 4]);
    assert.deepEqual(r.shape, [3, 4]);
    assert.deepEqual(r.data, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test("nw.reshape with mismatched total throws", () => {
    const a = nw.arange(0, 12, 1);
    assert.throws(() => nw.reshape(a, [2, 5]));
  });

  section("nw.transpose:");
  test("nw.transpose((3, 4)) → shape (4, 3), correct elements", () => {
    const a = nw.arange(0, 12, 1); // shape [12] then reshape
    const m = nw.reshape(a, [3, 4]);
    const t = nw.transpose(m);
    assert.deepEqual(t.shape, [4, 3]);
    assert.deepEqual(t.data, [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11]);
  });

  section("nw.flatten:");
  test("nw.flatten((2, 3)) → 1D", () => {
    const a = nw.arange(0, 6, 1);
    const m = nw.reshape(a, [2, 3]);
    const f = nw.flatten(m);
    assert.deepEqual(f.shape, [6]);
    assert.deepEqual(f.data, [0, 1, 2, 3, 4, 5]);
  });

  section("nw.squeeze:");
  test("nw.squeeze((3, 1, 4)) → (3, 4)", () => {
    const a = nw.arange(0, 12, 1);
    const m = nw.reshape(a, [3, 1, 4]);
    const s = nw.squeeze(m);
    assert.deepEqual(s.shape, [3, 4]);
    assert.deepEqual(s.data, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test("nw.squeeze((2, 3)) unchanged", () => {
    const a = nw.arange(0, 6, 1);
    const m = nw.reshape(a, [2, 3]);
    const s = nw.squeeze(m);
    assert.deepEqual(s.shape, [2, 3]);
    assert.deepEqual(s.data, [0, 1, 2, 3, 4, 5]);
  });
}
