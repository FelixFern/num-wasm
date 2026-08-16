export function Sparkline({
  points,
  strokeClass = "spark-line",
  dotClass = "spark-dot",
  height = 40,
}: {
  points: number[];
  strokeClass?: string;
  dotClass?: string;
  height?: number;
}) {
  const w = 240;
  const h = height;
  if (points.length < 2) {
    return (
      <svg width={w} height={h} className="sparkline" aria-label="series">
        <line x1={0} y1={h - 4} x2={w} y2={h - 4} className="spark-grid" />
      </svg>
    );
  }
  const max = Math.max(...points, 0.1);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 0.01);
  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((p - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} className="sparkline" viewBox={`0 0 ${w} ${h}`} aria-label="series">
      <line x1={0} y1={h - 4} x2={w} y2={h - 4} className="spark-grid" />
      <polyline points={pts.join(" ")} className={strokeClass} />
      <circle cx={w - 2} cy={h - 4 - ((points[points.length - 1] - min) / span) * (h - 8)} r={2.5} className={dotClass} />
    </svg>
  );
}
