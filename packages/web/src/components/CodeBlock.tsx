import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Check, Copy } from "lucide-react";
import { Fragment, useEffect, useState, type JSX } from "react";
import { jsx, jsxs } from "react/jsx-runtime";

export function useHighlight(code: string, lang: string) {
  const [highlighted, setHighlighted] = useState<JSX.Element | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("shiki").then(({ createHighlighter }) =>
      createHighlighter({
        themes: ["github-dark"],
        langs: ["typescript", "tsx", "bash"],
      }).then((highlighter) => {
        if (cancelled) return;
        const hast = highlighter.codeToHast(code, {
          lang,
          theme: "github-dark",
        });
        setHighlighted(
          toJsxRuntime(hast, { Fragment, jsx, jsxs }) as JSX.Element,
        );
        highlighter.dispose();
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  return highlighted;
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 transition-colors rounded text-zinc-500 hover:text-zinc-300"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function CodeBlock({
  code,
  title,
  lang = "tsx",
}: {
  code: string;
  title: string;
  lang?: string;
}) {
  const highlighted = useHighlight(code, lang);

  return (
    <div className="overflow-hidden border rounded-xl border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <span className="font-mono text-xs text-zinc-500">{title}</span>
        <CopyButton text={code} />
      </div>
      {highlighted ? (
        <div className="[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed [&_.shiki]:!bg-transparent">
          {highlighted}
        </div>
      ) : (
        <pre className="p-4 overflow-x-auto font-mono text-sm leading-relaxed bg-zinc-950 text-zinc-300">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
