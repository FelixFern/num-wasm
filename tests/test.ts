import assert from "node:assert/strict";
import { NumWasm } from "../src/nw";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${(err as Error).message}`);
    failed++;
  }
}

async function main(): Promise<void> {
  const nw = await NumWasm.init();

  console.log("nw.zeros:");
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

  console.log("\nnw.ones:");
  test("nw.ones([2, 3]) → 6 ones", () => {
    const a = nw.ones([2, 3]);
    assert.equal(a.data.length, 6);
    a.data.forEach((v) => assert.equal(v, 1.0));
  });

  console.log("\nnw.full:");
  test("nw.full([2, 2], 7.5) → 4 elements of 7.5", () => {
    const a = nw.full([2, 2], 7.5);
    assert.equal(a.data.length, 4);
    a.data.forEach((v) => assert.equal(v, 7.5));
  });

  console.log("\nnw.arange:");
  test("nw.arange(0, 5, 1) → [0, 1, 2, 3, 4]", () => {
    const a = nw.arange(0, 5, 1);
    assert.deepEqual(a.data, [0, 1, 2, 3, 4]);
    assert.deepEqual(a.shape, [5]);
  });

  test("nw.arange(1, 10, 3) → [1, 4, 7]", () => {
    const a = nw.arange(1, 10, 3);
    assert.deepEqual(a.data, [1, 4, 7]);
  });

  console.log("\nnw.linspace:");
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

  console.log("\nnw.reshape:");
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

  console.log("\nnw.transpose:");
  test("nw.transpose((3, 4)) → shape (4, 3), correct elements", () => {
    const a = nw.arange(0, 12, 1); // shape [12] then reshape
    const m = nw.reshape(a, [3, 4]);
    const t = nw.transpose(m);
    assert.deepEqual(t.shape, [4, 3]);
    assert.deepEqual(t.data, [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11]);
  });

  console.log("\nnw.flatten:");
  test("nw.flatten((2, 3)) → 1D", () => {
    const a = nw.arange(0, 6, 1);
    const m = nw.reshape(a, [2, 3]);
    const f = nw.flatten(m);
    assert.deepEqual(f.shape, [6]);
    assert.deepEqual(f.data, [0, 1, 2, 3, 4, 5]);
  });

  console.log("\nnw.squeeze:");
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

  console.log("\nnw.broadcastShapes:");
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

  console.log("\nnw.add:");
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

  console.log("\nnw.subtract / multiply / divide:");
  test("arithmetic ops on (2,2)", () => {
    const a = nw.full([2, 2], 10.0);
    const b = nw.full([2, 2], 4.0);
    assert.deepEqual(nw.subtract(a, b).data, [6, 6, 6, 6]);
    assert.deepEqual(nw.multiply(a, b).data, [40, 40, 40, 40]);
    assert.deepEqual(nw.divide(a, b).data, [2.5, 2.5, 2.5, 2.5]);
  });

  console.log("\nnw.sqrt / exp / log / negate / abs:");
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

  console.log("\nnw.addScalar / mulScalar:");
  test("scalar ops", () => {
    const a = nw.arange(0, 4, 1);
    assert.deepEqual(nw.addScalar(a, 10).data, [10, 11, 12, 13]);
    assert.deepEqual(nw.mulScalar(a, 2).data, [0, 2, 4, 6]);
  });

  console.log("\nnw.sum / mean / max / min / prod (no axis):");
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

  console.log("\nnw.sum with axis:");
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

  console.log("\nnw.slice:");
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

  console.log("\nnw.indexAxis:");
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

  console.log("\nnw.where:");
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

  console.log(`\n${"─".repeat(40)}`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: Error) => {
  console.error("Fatal:", err);
  process.exit(1);
});
