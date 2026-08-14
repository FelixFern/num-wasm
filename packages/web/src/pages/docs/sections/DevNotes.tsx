import { designChoices, devWarnings, roadmap } from "../data";

const statusColor: Record<string, string> = {
  Done: "bg-emerald-400",
  Planned: "bg-zinc-600",
};

export function DevNotes() {
  return (
    <section id="dev-notes" className="scroll-mt-24">
      <h2 className="text-2xl font-bold">Dev notes &amp; roadmap</h2>
      <p className="mt-3 text-zinc-400">
        Everything you might trip on, and where the project is going.
      </p>

      <h3 className="mt-6 mb-3 text-lg font-semibold">Common issues</h3>
      <div className="overflow-hidden border rounded-xl border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 bg-zinc-900/80">
              <th className="px-4 py-2.5 font-medium">Warning</th>
              <th className="px-4 py-2.5 font-medium">Cause</th>
              <th className="px-4 py-2.5 font-medium">Fix</th>
            </tr>
          </thead>
          <tbody>
            {devWarnings.map((w) => (
              <tr
                key={w.warning}
                className="border-t border-zinc-800 align-top"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-amber-400">
                  {w.warning}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{w.cause}</td>
                <td className="px-4 py-2.5 text-zinc-400">{w.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 mb-3 text-lg font-semibold">Design choices</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {designChoices.map((d) => (
          <div
            key={d.title}
            className="p-4 border rounded-xl border-zinc-800 bg-zinc-900/30"
          >
            <h4 className="font-medium">{d.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              {d.desc}
            </p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 mb-3 text-lg font-semibold">Roadmap</h3>
      <div className="overflow-hidden border rounded-xl border-zinc-800">
        {roadmap.map(([phase, status], i) => (
          <div
            key={phase}
            className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 first:border-t-0"
          >
            <span className="text-sm text-zinc-400">
              <span className="text-zinc-600 font-mono text-xs mr-2">
                P{i + 1}
              </span>
              {phase}
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${statusColor[status]}`}
              />
              <span className="text-xs text-zinc-500">{status}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
