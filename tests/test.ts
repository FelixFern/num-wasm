import { NumWasm } from "../src/nw";
import { summary } from "./runner";
import { register as broadcastTests } from "./broadcast.test";
import { register as creationTests } from "./creation.test";
import { register as elementwiseTests } from "./elementwise.test";
import { register as linalgTests } from "./linalg.test";
import { register as ndarrayTests } from "./ndarray.test";
import { register as nnOpsTests } from "./nn-ops.test";
import { register as reductionsTests } from "./reductions.test";
import { register as shapeTests } from "./shape.test";
import { register as slicingTests } from "./slicing.test";

async function main(): Promise<void> {
  const nw = await NumWasm.init();

  creationTests(nw);
  shapeTests(nw);
  broadcastTests(nw);
  elementwiseTests(nw);
  reductionsTests(nw);
  slicingTests(nw);
  linalgTests(nw);
  ndarrayTests(nw);
  nnOpsTests(nw);

  const { passed, failed } = summary();
  console.log(`\n${"─".repeat(40)}`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: Error) => {
  console.error("Fatal:", err);
  process.exit(1);
});
