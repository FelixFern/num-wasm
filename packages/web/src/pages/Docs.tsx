import { NavLink, Outlet } from "react-router-dom";
import { apiGroups, sections } from "./docs/data";

function Docs() {
  return (
    <div className="max-w-4xl px-6 py-12 mx-auto lg:flex lg:gap-12">
      <nav className="hidden w-52 lg:block shrink-0">
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pr-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
            API Reference
          </span>
          <ul className="mt-3 space-y-1 border-l border-zinc-800 pb-6">
            <li>
              <NavLink
                to="/docs"
                end
                className={({ isActive }) =>
                  `block py-1 pl-3 text-sm transition-colors ${
                    isActive
                      ? "text-white border-l-2 border-white -ml-px"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`
                }
              >
                {sections[0].label}
              </NavLink>
            </li>
            {Object.entries(apiGroups).map(([groupId, group]) => (
              <li key={groupId}>
                <span className="block px-3 mt-3 mb-1 text-xs font-semibold tracking-wider uppercase text-zinc-600">
                  {group.title}
                </span>
                <ul className="space-y-1">
                  {group.methods.map((m) => (
                    <li key={m.name}>
                      <NavLink
                        to={`/docs/${groupId}/${m.name}`}
                        className={({ isActive }) =>
                          `block py-1 pl-3 text-sm font-mono transition-colors ${
                            isActive
                              ? "text-white border-l-2 border-white -ml-px"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`
                        }
                      >
                        {m.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            <li>
              <NavLink
                to="/docs/ndarray"
                className={({ isActive }) =>
                  `block py-1 pl-3 mt-3 text-sm transition-colors ${
                    isActive
                      ? "text-white border-l-2 border-white -ml-px"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`
                }
              >
                {sections[6].label}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/docs/dev-notes"
                className={({ isActive }) =>
                  `block py-1 pl-3 text-sm transition-colors ${
                    isActive
                      ? "text-white border-l-2 border-white -ml-px"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`
                }
              >
                {sections[7].label}
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

export default Docs;
