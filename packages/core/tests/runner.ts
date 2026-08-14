let passed = 0;
let failed = 0;

export function test(name: string, fn: () => void): void {
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

export function section(label: string): void {
  console.log(`\n${label}`);
}

export function summary(): { passed: number; failed: number } {
  return { passed, failed };
}
