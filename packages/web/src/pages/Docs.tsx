import { useEffect, useState } from "react";
import { apiGroups, sections } from "./docs/data";
import { ApiSection } from "./docs/sections/ApiSection";
import { DevNotes } from "./docs/sections/DevNotes";
import { GettingStarted } from "./docs/sections/GettingStarted";
import { NdArray } from "./docs/sections/NdArray";

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0]);

  useEffect(() => {
    const visibleRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRatios.set(entry.target.id, entry.intersectionRatio);
        }

        let bestId = sectionIds[0];
        let bestRatio = 0;
        for (const id of sectionIds) {
          const ratio = visibleRatios.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        if (bestRatio > 0) {
          setActiveId(bestId);
        }
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

function Docs() {
  const activeSection = useActiveSection(sections.map((s) => s.id));
  return (
    <div className="max-w-4xl px-6 py-12 mx-auto lg:flex lg:gap-12">
      <nav className="hidden w-48 lg:block shrink-0">
        <div className="sticky top-8">
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
            API Reference
          </span>
          <ul className="mt-3 space-y-1 border-l border-zinc-800">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`block py-1 pl-3 text-sm transition-colors ${
                    activeSection === s.id
                      ? "text-white border-l-2 border-white -ml-px"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="flex-1 min-w-0 space-y-16">
        <GettingStarted />
        <ApiSection id="creation" group={apiGroups.creation} />
        <ApiSection id="shape" group={apiGroups.shape} />
        <ApiSection id="elementwise" group={apiGroups.elementwise} />
        <ApiSection id="reductions" group={apiGroups.reductions} />
        <ApiSection id="linalg" group={apiGroups.linalg} />
        <NdArray />
        <DevNotes />
      </div>
    </div>
  );
}

export default Docs;
