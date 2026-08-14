import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.add:");
  test("nw.add two (2,2) arrays", () => {
    const a = nw.full([2, 2], 1.0);
    const b = nw.full([2, 2], 2.0);
    const c = nw.add(a, b);
    assert.deepEqual(c.shape, [2, 2]);
    assert.deepEqual(c.data, [3, 3, 3, 3]);
  });

  test("nw.add broadcasts (3,1) + (1,4) → (3,4)", () => {
    const a = nw.arange(1, 4, 1); // [1,2,3]
    const m = nw.reshape(a, [3, 1]);
    const b = nw.arange(0, 4, 1); // [0,1,2,3]
    const r = nw.reshape(b, [1, 4]);
    const c = nw.add(m, r);
    assert.deepEqual(c.shape, [3, 4]);
    assert.deepEqual(c.data, [1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6]);
  });

  test("nw.add scalar (empty shape) + (3,4)", () => {
    const s = nw.zeros([]);
    const a = nw.arange(0, 12, 1);
    const m = nw.reshape(a, [3, 4]);
    const c = nw.add(s, m);
    assert.deepEqual(c.shape, [3, 4]);
    assert.deepEqual(c.data, m.data);
  });

  test("nw.add incompatible shapes throws", () => {
    const a = nw.arange(0, 12, 1);
    const b = nw.arange(0, 15, 1);
    assert.throws(() => nw.add(a, nw.reshape(b, [3, 5])));
  });

  section("nw.subtract / multiply / divide:");
  test("arithmetic ops on (2,2)", () => {
    const a = nw.full([2, 2], 10.0);
    const b = nw.full([2, 2], 4.0);
    assert.deepEqual(nw.subtract(a, b).data, [6, 6, 6, 6]);
    assert.deepEqual(nw.multiply(a, b).data, [40, 40, 40, 40]);
    assert.deepEqual(nw.divide(a, b).data, [2.5, 2.5, 2.5, 2.5]);
  });

  section("nw.sqrt / exp / log / negate / abs:");
  test("unary ops on [0, 1, 4, 9]", () => {
    const base = nw.arange(0, 4, 1);
    const a = nw.multiply(base, base); // [0, 1, 4, 9]
    assert.deepEqual(nw.sqrt(a).data, [0, 1, 2, 3]);
    assert.deepEqual(nw.negate(a).data, [-0, -1, -4, -9]);
    assert.deepEqual(nw.abs(nw.negate(a)).data, [0, 1, 4, 9]);
    assert.deepEqual(
      nw.log(nw.exp(a)).data.map((v) => Math.round(v)),
      [0, 1, 4, 9],
    );
  });

  section("nw.addScalar / mulScalar:");
  test("scalar ops", () => {
    const a = nw.arange(0, 4, 1);
    assert.deepEqual(nw.addScalar(a, 10).data, [10, 11, 12, 13]);
    assert.deepEqual(nw.mulScalar(a, 2).data, [0, 2, 4, 6]);
  });
}
