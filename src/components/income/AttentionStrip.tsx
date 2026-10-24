import type { AttentionItem } from "@/app/income/views";

/**
 * The strip under the Income greeting while money is past its expected date (docs/design/income.md): a line per
 * source saying how much, since when, and where it should have landed. Mark received and Edit come with the forms (#190).
 */
export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Income that hasn't landed" className="flex flex-col gap-2 rounded-[18px] border border-warning/30 bg-warning-tint px-4 py-3 md:px-5">
      {items.map((item) => (
        <p key={item.sourceId} className="flex items-start gap-2.5 text-[13px] font-semibold text-warning-text">
          <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <b className="font-extrabold">
              {item.name} · {item.amount}
            </b>{" "}
            {item.text}
          </span>
        </p>
      ))}
    </section>
  );
}
