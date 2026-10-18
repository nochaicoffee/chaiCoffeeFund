import { skippedRowsNotice } from "@/lib/format/skippedRows";
import type { SkippedRows } from "@/lib/sheets/rowReading";

/**
 * A small notice for each tab that left rows out because they failed its schema,
 * so a badly edited row never just vanishes from the page (see "Reading from
 * Sheets" in docs/system-design.md). Renders nothing when every row was read.
 */
export function SkippedRowsNotice({ tabs }: { tabs: SkippedRows[] }) {
  const notices = tabs.flatMap((tab) => {
    const notice = skippedRowsNotice(tab);
    return notice ? [{ tab: tab.tab, ...notice }] : [];
  });
  if (notices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {notices.map(({ tab, headline, detail }) => (
        <p key={tab} className="flex w-fit max-w-full items-start gap-2.5 rounded-control bg-negative-tint px-3.5 py-2.5 text-[13px] leading-relaxed font-medium text-fg">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-[3px] shrink-0 text-negative"
          >
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="min-w-0">
            <span className="font-bold">{headline}</span>: {detail}
          </span>
        </p>
      ))}
    </div>
  );
}
