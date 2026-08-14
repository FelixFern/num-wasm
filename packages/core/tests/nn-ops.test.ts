import assert from "node:assert/strict";
import type { NumWasm } from "../src/nw";
import { section, test } from "./runner";

export function register(nw: NumWasm): void {
  section("nw.random:");
  test("nw.random shape + determinism with seed", () => {
    const a = nw.random([10, 784], 42);
    const b = nw.random([10, 784], 42);
    const c = nw.random([10, 784], 1);
    assert.deepEqual(a.shape, [10, 784]);
    assert.deepEqual(a.data, b.data);
    assert.ok(a.data.some((v, i) => v !== c.data[i]));
    a.data.forEach((v) => assert.ok(v >= 0 && v < 1));
  });

  test("nw.random init params shape: random - 0.5", () => {
    const w = nw.addScalar(nw.random([10, 784], 7), -0.5);
    assert.deepEqual(w.shape, [10, 784]);
    w.data.forEach((v) => assert.ok(v >= -0.5 && v < 0.5));
  });

  section("nw.maximum / minimum (ReLU):");
  test("nw.maximumScalar is ReLU", () => {
    const a = nw.array([-2, 0, 3, 0.5]);
    const relu = nw.maximumScalar(a, 0);
    assert.deepEqual(relu.data, [0, 0, 3, 0.5]);
  });

  test("nw.maximum / minimum elementwise", () => {
    const a = nw.array([1, -5, 3]);
    const b = nw.array([2, -1, -1]);
    assert.deepEqual(nw.maximum(a, b).data, [2, -1, 3]);
    assert.deepEqual(nw.minimum(a, b).data, [1, -5, -1]);
  });

  section("nw.greater / less / equal (ReLU_deriv, one-hot):");
  test("nw.greaterScalar is ReLU derivative", () => {
    const z = nw.array([-2, 0, 3, 0.5]);
    assert.deepEqual(nw.greaterScalar(z, 0).data, [0, 0, 1, 1]);
  });

  test("nw.equal broadcasts → one-hot", () => {
    const y = nw.reshape(nw.array([0, 2, 1]), [3, 1]);
    const classes = nw.array([0, 1, 2]);
    const oh = nw.transpose(nw.equal(y, classes));
    assert.deepEqual(oh.shape, [3, 3]);
    assert.deepEqual(oh.data, [1, 0, 0, 0, 0, 1, 0, 1, 0]);
  });

  test("nw.equal for accuracy", () => {
    const preds = nw.array([0, 1, 1, 2]);
    const y = nw.array([0, 1, 2, 2]);
    const correct = nw.sum(nw.equal(preds, y));
    assert.equal(correct, 3); // 3/4 accuracy
  });

  section("nw.argmax with axis:");
  test("nw.argmax((3,4), {axis:0}) → [2,2,2,2]", () => {
    const a = nw.reshape(nw.arange(0, 12, 1), [3, 4]);
    const r = nw.argmax(a, { axis: 0 }) as { toArray(): number[]; shape: number[] };
    assert.deepEqual(r.shape, [4]);
    assert.deepEqual(r.toArray(), [2, 2, 2, 2]);
  });

  test("nw.argmax((2,3), {axis:1}) per-row class predictions", () => {
    const a = nw.array([[5, 1, 3], [0, 2, 9]]);
    const r = nw.argmax(a, { axis: 1 }) as { toArray(): number[] };
    assert.deepEqual(r.toArray(), [0, 2]);
  });

  test("nw.argmax no axis still returns number", () => {
    const a = nw.array([1, 5, 2]);
    assert.equal(nw.argmax(a), 1);
  });
}
