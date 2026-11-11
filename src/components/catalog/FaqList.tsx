/** Expandable questions. The plus sign turns into a cross when a question is open. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="flex flex-col">
      {items.map((faq) => (
        <details key={faq.q} className="faq border-b border-line py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium">
            {faq.q}
            <span
              aria-hidden="true"
              className="faq-icon grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-xl"
            >
              +
            </span>
          </summary>
          <p className="mt-3 max-w-2xl text-muted">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
