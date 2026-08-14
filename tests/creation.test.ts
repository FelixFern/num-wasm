import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.zeros:");
  test("nw.zeros([2, 3]) → 6 zeros", () => {
    const a = nw.zeros([2, 3]);
    assert.equal(a.data.length, 6);
    assert.deepEqual(a.shape, [2, 3]);
    a.data.forEach((v) => assert.equal(v, 0.0));
  });

  test("nw.zeros([5]) → 5 zeros", () => {
    const a = nw.zeros([5]);
    assert.equal(a.data.length, 5);
    assert.deepEqual(a.shape, [5]);
    a.data.forEach((v) => assert.equal(v, 0.0));
  });

  section("nw.ones:");
  test("nw.ones([2, 3]) → 6 ones", () => {
    const a = nw.ones([2, 3]);
    assert.equal(a.data.length, 6);
    a.data.forEach((v) => assert.equal(v, 1.0));
  });

  section("nw.full:");
  test("nw.full([2, 2], 7.5) → 4 elements of 7.5", () => {
    const a = nw.full([2, 2], 7.5);
    assert.equal(a.data.length, 4);
    a.data.forEach((v) => assert.equal(v, 7.5));
  });

  section("nw.arange:");
  test("nw.arange(0, 5, 1) → [0, 1, 2, 3, 4]", () => {
    const a = nw.arange(0, 5, 1);
    assert.deepEqual(a.data, [0, 1, 2, 3, 4]);
    assert.deepEqual(a.shape, [5]);
  });

  test("nw.arange(1, 10, 3) → [1, 4, 7]", () => {
    const a = nw.arange(1, 10, 3);
    assert.deepEqual(a.data, [1, 4, 7]);
  });

  section("nw.linspace:");
  test("nw.linspace(0, 1, 5) → [0, 0.25, 0.5, 0.75, 1]", () => {
    const a = nw.linspace(0, 1, 5);
    assert.equal(a.data.length, 5);
    const expected = [0, 0.25, 0.5, 0.75, 1.0];
    a.data.forEach((v, i) =>
      assert.ok(Math.abs(v - expected[i]) < 1e-10, `data[${i}]: got ${v}`),
    );
  });

  test("nw.linspace(5, 5, 1) → [5]", () => {
    const a = nw.linspace(5, 5, 1);
    assert.deepEqual(a.data, [5]);
  });
}
