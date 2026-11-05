import Link from "next/link";
import type { AttentionItem } from "@/app/lent/views";

const TONE = {
  warn: "border-warning/30 bg-warning-tint text-warning-text",
  late: "border-negative/30 bg-negative-tint text-negative",
} as const;

/**
 * The strip under the greeting (docs/design/lent-out.md): a payout that is late or never came, a loan out a long time with nothing paid back,
 * a payout loan no income source is tracking. Each is one line, with a link where there is somewhere to go.
 */
export function AttentionStrip({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs attention" className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border px-4 py-3 md:px-5 ${TONE[item.tone]}`}>
          <p className="flex min-w-0 flex-1 basis-full items-start gap-2.5 text-[13px] font-semibold sm:basis-auto">
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <b className="font-extrabold">{item.title}</b> {item.text}
            </span>
          </p>
          {item.href && item.action && (
            <Link href={item.href} className="inline-flex min-h-8 items-center rounded-full bg-surface px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
              {item.action}
            </Link>
          )}
        </div>
      ))}
    </section>
  );
}
