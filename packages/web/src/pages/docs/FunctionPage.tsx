import { Link, useParams } from "react-router-dom";
import { CodeBlock } from "@/components/CodeBlock";
import { methodRouteFor, methodRoutes, type ApiMethod } from "./data";

function ParamBlock({ params }: { params: ApiMethod["parameters"] }) {
  if (params.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Parameters</h2>
      <dl className="mt-3 space-y-4">
        {params.map((p) => (
          <div key={p.name} className="flex gap-3">
            <dt className="w-40 shrink-0">
              <code className="font-mono text-sm text-zinc-200">{p.name}</code>
              {p.default !== undefined && (
                <span className="block text-xs text-zinc-600">default: {p.default}</span>
              )}
            </dt>
            <dd className="min-w-0">
              <span className="font-mono text-sm italic text-zinc-400">{p.type}</span>
              <span className="block mt-0.5 text-sm leading-relaxed text-zinc-500">
                {p.desc}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReturnsBlock({ returns }: { returns: ApiMethod["returns"] }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Returns</h2>
      <div className="mt-3 flex gap-3">
        {returns.name && (
          <dt className="w-40 shrink-0">
            <code className="font-mono text-sm text-zinc-200">{returns.name}</code>
          </dt>
        )}
        <dd className="min-w-0">
          <span className="font-mono text-sm italic text-zinc-400">{returns.type}</span>
          <span className="block mt-0.5 text-sm leading-relaxed text-zinc-500">
            {returns.desc}
          </span>
        </dd>
      </div>
    </div>
  );
}

function SeeAlso({ names }: { names: string[] }) {
  const links = names
    .map((n) => methodRouteFor(n))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);
  if (links.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">See also</h2>
      <ul className="mt-3 space-y-1">
        {links.map((r) => (
          <li key={r.method.name}>
            <Link
              to={`/docs/${r.groupId}/${r.method.name}`}
              className="font-mono text-sm text-zinc-300 transition-colors hover:text-white"
            >
              {r.method.name}
            </Link>
            <span className="ml-2 text-sm text-zinc-500">{r.method.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExampleBlock({ examples }: { examples: string[] }) {
  if (examples.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Examples</h2>
      <div className="mt-3">
        <CodeBlock title="doctest" code={examples.join("\n")} lang="ts" />
      </div>
    </div>
  );
}

function PrevNext({ name }: { name: string }) {
  const idx = methodRoutes.findIndex((r) => r.method.name === name);
  if (idx < 0) return null;
  const prev = idx > 0 ? methodRoutes[idx - 1] : null;
  const next = idx < methodRoutes.length - 1 ? methodRoutes[idx + 1] : null;
  return (
    <div className="flex justify-between mt-12 pt-4 border-t border-zinc-800">
      {prev ? (
        <Link
          to={`/docs/${prev.groupId}/${prev.method.name}`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← {prev.method.name}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          to={`/docs/${next.groupId}/${next.method.name}`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {next.method.name} →
        </Link>
      )}
    </div>
  );
}

function FunctionPage() {
  const { group, name } = useParams();
  const route = methodRoutes.find((r) => r.groupId === group && r.method.name === name);

  if (!route) {
    return (
      <div>
        <p className="text-sm text-zinc-500">
          Function not found.{" "}
          <Link to="/docs" className="text-zinc-300 hover:text-white">
            Back to docs
          </Link>
          .
        </p>
      </div>
    );
  }

  const { method, groupTitle } = route;

  return (
    <article>
      <p className="text-xs uppercase tracking-wider text-zinc-600">{groupTitle}</p>
      <h1 className="mt-1 text-2xl font-bold">
        <code className="font-mono">{method.name}</code>
      </h1>
      <pre className="mt-3 p-3 overflow-x-auto font-mono text-sm text-zinc-300 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        {method.signature}
      </pre>
      <p className="mt-4 text-base text-zinc-300">{method.summary}</p>

      <ParamBlock params={method.parameters} />
      <ReturnsBlock returns={method.returns} />

      {method.notes && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">{method.notes}</p>
        </div>
      )}

      {method.seeAlso && <SeeAlso names={method.seeAlso} />}
      {method.examples && <ExampleBlock examples={method.examples} />}

      <PrevNext name={method.name} />
    </article>
  );
}

export default FunctionPage;
