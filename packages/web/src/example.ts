export const initCode = `import { NumWasm } from "@felixfern/num-wasm";

const nw = await NumWasm.init();`;

export const quickstartCode = `import { NumWasm } from "@felixfern/num-wasm";

const nw = await NumWasm.init();

const a = nw.array([[1, 2, 3], [4, 5, 6]]);
const b = nw.ones([2, 3]);
const c = nw.add(a, b);           // broadcasting
const s = nw.sum(c, { axis: 0 });

console.log(s.toArray());         // [7, 9, 11]
a.free(); b.free(); c.free();     // optional — FinalizationRegistry auto-frees`;

export const nnCode = `// 2-layer MLP — forward, backprop, gradient descent
const W1 = nw.addScalar(nw.random([10, 784], 42), -0.5);
const b1 = nw.addScalar(nw.random([10, 1], 42), -0.5);

// forward: Z1 = W1 @ X + b1 ; A1 = ReLU(Z1)
const Z1 = nw.add(nw.matmul(W1, X), b1);   // (10,m) + (10,1) broadcasts
const A1 = nw.maximumScalar(Z1, 0);        // ReLU

// one-hot: transpose(equal(y.(m,1), classes))
// predict: argmax(A2, { axis: 0 })`;
