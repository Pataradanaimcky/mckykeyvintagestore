import { HOW_TO_TITLE, type HowToSection } from "./howto";

/** Closed-by-default "วิธีเล่น" fold under a simulator page (SIMULATOR.md S13). */
export function HowToPlay({ sections }: { sections: HowToSection[] }) {
  return (
    <details className="border-t border-line pt-2 text-sm">
      <summary className="cursor-pointer font-semibold text-ink">{HOW_TO_TITLE}</summary>
      <div className="mt-2 flex flex-col gap-3 text-muted">
        {sections.map((s) => (
          <div key={s.heading}>
            <p className="font-semibold text-ink">{s.heading}</p>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
              {s.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
