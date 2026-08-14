import type { ApiGroup, ApiMethod, Param } from "../data";

function ParamList({ params }: { params: Param[] }) {
  if (params.length === 0) return null;
  return (
    <>
      <div className="mt-6 text-xs font-semibold tracking-wider uppercase text-zinc-500">
        Parameters
      </div>
      <div className="mt-2">
        {params.map((p) => (
          <div
            key={p.name}
            className="py-1.5 border-b border-zinc-800/60 last:border-b-0"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <code className="font-mono text-sm text-zinc-200">{p.name}</code>
              <span className="text-xs text-zinc-600">{p.type}</span>
              {p.default && (
                <span className="text-xs text-zinc-600">= {p.default}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function Returns({
  returns,
}: {
  returns: { name?: string; type: string; desc: string };
}) {
  return (
    <>
      <div className="mt-6 text-xs font-semibold tracking-wider uppercase text-zinc-500">
        Returns
      </div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        {returns.name && (
          <code className="font-mono text-sm text-zinc-200">
            {returns.name}
          </code>
        )}
        <code className="font-mono text-sm text-amber-400">{returns.type}</code>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">
        {returns.desc}
      </p>
    </>
  );
}

function Examples({ examples }: { examples: string[] }) {
  return (
    <>
      <div className="mt-6 text-xs font-semibold tracking-wider uppercase text-zinc-500">
        Examples
      </div>
      <div className="mt-2 overflow-hidden border rounded-xl border-zinc-800 bg-zinc-950">
        {examples.map((block, i) => (
          <div
            key={i}
            className={i > 0 ? "px-4 py-2 border-t border-zinc-800/60" : "px-4 py-2"}
          >
            {block.split("\n").map((line, j) =>
              line.startsWith(">>>") ? (
                <div
                  key={j}
                  className="font-mono text-sm leading-relaxed break-words"
                >
                  <span className="text-amber-400">&gt;&gt;&gt; </span>
                  <span className="text-zinc-300">{line.slice(3)}</span>
                </div>
              ) : (
                <div
                  key={j}
                  className="pl-7 font-mono text-sm leading-relaxed text-zinc-500 break-words"
                >
                  {line}
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function MethodDoc({ method }: { method: ApiMethod }) {
  return (
    <div className="py-5 border-t border-zinc-800/60 first:border-t-0">
      <code className="font-mono text-[15px] text-white">
        {method.signature}
      </code>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
        {method.summary}
      </p>

      <ParamList params={method.parameters} />
      <Returns returns={method.returns} />

      {method.notes && (
        <>
          <div className="mt-6 text-xs font-semibold tracking-wider uppercase text-zinc-500">
            Notes
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {method.notes}
          </p>
        </>
      )}

      {method.examples && <Examples examples={method.examples} />}
    </div>
  );
}

export function ApiSection({ id, group }: { id: string; group: ApiGroup }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold">{group.title}</h2>
      <p className="mt-3 mb-4 text-zinc-400">{group.desc}</p>
      <div className="p-4 border rounded-xl border-zinc-800 bg-zinc-900/30">
        {group.methods.map((m) => (
          <MethodDoc key={m.signature} method={m} />
        ))}
      </div>
    </section>
  );
}
