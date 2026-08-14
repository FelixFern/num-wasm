export interface Dataset {
  x: number[][];
  y: number[];
}

function parseFields(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

export function parseGridCsv(text: string, opts: { hasHeader?: boolean } = {}): Dataset {
  const hasHeader = opts.hasHeader ?? true;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const rows = hasHeader ? lines.slice(1) : lines;

  const x: number[][] = [];
  const y: number[] = [];

  for (const line of rows) {
    const fields = parseFields(line);
    const label = parseFloat(fields[0]);
    if (Number.isNaN(label)) continue;
    let pixels: number[];
    if (fields.length === 2) {
      pixels = fields[1].split(",").map((p) => parseFloat(p.trim()));
    } else {
      pixels = fields.slice(1).map((p) => parseFloat(p));
    }
    if (pixels.some((p) => Number.isNaN(p))) continue;
    x.push(pixels);
    y.push(label);
  }

  return { x, y };
}

// ---- Synthetic demo dataset ----------------------------------------------

const CANVAS = 28;

function drawPattern(kind: number, jitter: number): number[] {
  const grid = new Array(CANVAS * CANVAS).fill(0);
  const put = (r: number, c: number, v = 255) => {
    if (r < 0 || r >= CANVAS || c < 0 || c >= CANVAS) return;
    grid[r * CANVAS + c] = Math.min(255, grid[r * CANVAS + c] + v);
  };
  const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
  const addJitter = (i: number) => i + r(-jitter, jitter);

  const n = r(10, 14); // stroke length
  if (kind === 0) {
    // vertical bar
    const col = 13 + r(-2, 2);
    for (let i = 0; i < n; i++) put(addJitter(7 + i), col);
  } else if (kind === 1) {
    // horizontal bar
    const row = 13 + r(-2, 2);
    for (let j = 0; j < n; j++) put(row, addJitter(7 + j));
  } else {
    // diagonal
    for (let i = 0; i < n; i++) {
      put(addJitter(7 + i), addJitter(7 + i));
    }
  }
  return grid;
}

export function generateSyntheticDataset(perClass = 30, classes = 3): Dataset {
  const x: number[][] = [];
  const y: number[] = [];
  for (let k = 0; k < classes; k++) {
    for (let s = 0; s < perClass; s++) {
      x.push(drawPattern(k, 2));
      y.push(k);
    }
  }
  return { x, y };
}

export function summarize(ds: Dataset): { samples: number; classes: number[] } {
  const counts = new Map<number, number>();
  for (const label of ds.y) counts.set(label, (counts.get(label) ?? 0) + 1);
  return { samples: ds.y.length, classes: [...counts.keys()].sort((a, b) => a - b) };
}
