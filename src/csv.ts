export interface GridDataset {
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

export function parseGridCsv(text: string, opts: { hasHeader?: boolean } = {}): GridDataset {
  const hasHeader = opts.hasHeader ?? true;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const rows = hasHeader ? lines.slice(1) : lines;
  const x: number[][] = [];
  const y: number[] = [];

  for (const line of rows) {
    const fields = parseFields(line);
    const label = parseFloat(fields[0]);
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
