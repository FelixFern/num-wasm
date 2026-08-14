import { Github, Package } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-900">
        <div className="flex items-center justify-between max-w-4xl px-6 py-4 mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src="./num-wasm.svg" className="size-7" alt="num-wasm" />

              <span className="font-mono text-sm font-semibold">
                <span className="text-zinc-500">@felixfern</span>/num-wasm
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/docs"
              className="text-sm transition-colors text-zinc-500 hover:text-zinc-300"
            >
              Docs
            </Link>
            <a
              href="https://www.npmjs.com/package/@felixfern/num-wasm"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors rounded-md text-zinc-500 hover:text-zinc-300"
              aria-label="npm"
            >
              <Package size={18} />
            </a>
            <a
              href="https://github.com/FelixFern/numwasm"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors rounded-md text-zinc-500 hover:text-zinc-300"
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="py-8 text-xs text-center border-t border-zinc-900 text-zinc-600">
        Built by{" "}
        <a
          href="https://github.com/FelixFern"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors text-zinc-400 hover:text-white"
        >
          Felix Fernando
        </a>
      </footer>
    </div>
  );
}

export default App;
