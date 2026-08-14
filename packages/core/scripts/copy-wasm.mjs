import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "zig-out", "bin", "num-wasm.wasm");
const destDir = path.join(root, "dist");
const dest = path.join(destDir, "num-wasm.wasm");

if (!fs.existsSync(src)) {
  console.error(`WASM not found at ${src} — run \`zig build wasm\` first`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`copied wasm -> ${dest}`);
