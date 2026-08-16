import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const TRAIN_SRC = process.env.MNIST_TRAIN || "/Users/felixfernando/Developer/Zig/mnist_train.csv";
const TEST_SRC = process.env.MNIST_TEST || "/Users/felixfernando/Developer/Zig/mnist_test.csv";
const TRAIN_N = parseInt(process.env.TRAIN_N || "1000", 10);
const TEST_N = parseInt(process.env.TEST_N || "300", 10);

function slice(src: string, n: number): string {
  const lines = fs.readFileSync(src, "utf8").trim().split(/\r?\n/);
  const pixelCount = lines[0].split(",").length - 1;
  const header = "label," + Array.from({ length: pixelCount }, (_, i) => `p${i + 1}`).join(",");
  const body = lines.slice(0, n).join("\n");
  return header + "\n" + body + "\n";
}

const trainOut = path.join(root, "public", "dataset.csv");
const testOut = path.join(root, "public", "mnist_test.csv");
fs.mkdirSync(path.dirname(trainOut), { recursive: true });
fs.writeFileSync(trainOut, slice(TRAIN_SRC, TRAIN_N));
fs.writeFileSync(testOut, slice(TEST_SRC, TEST_N));

console.log(`wrote ${trainOut} (${TRAIN_N} rows)`);
console.log(`wrote ${testOut} (${TEST_N} rows)`);
