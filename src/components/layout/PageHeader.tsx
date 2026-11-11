import type { CSSProperties, ReactNode } from "react";

/** Title block at the top of a sub-page. The title slides up from a mask on load. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pt-6 sm:pt-10">
      <h1 className="section-title">
        <span className="line-mask">
          <span className="line-rise">{title}</span>
        </span>
      </h1>
      {children ? (
        <p className="rise max-w-2xl text-lg text-muted" style={{ "--d": "200ms" } as CSSProperties}>
          {children}
        </p>
      ) : null}
    </header>
  );
}
