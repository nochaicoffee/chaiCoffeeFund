"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, type SelectOption } from "../Select";

/**
 * The "This year ▾" pill from the design, opening the app's own menu (Select)
 * with what was spent in each period. Choosing one updates `?period=` and
 * keeps everything else in the URL, so every number on the page follows it,
 * except a page number: a different period's list starts again at page 1.
 * Each option's value is its `?period=`, blank for this year (params.ts, periodMenu).
 */
export function PeriodSelect({ options, value }: { options: SelectOption[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function choose(next: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    if (next === "") query.delete("period");
    else query.set("period", next);
    const text = query.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
    router.push(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  return (
    <Select
      variant="pill"
      aria-label="Period"
      options={options}
      value={value}
      onChange={choose}
      icon={
        <svg className="shrink-0 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </svg>
      }
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-surface-line bg-surface py-2.5 pr-4 pl-4 text-[13px] font-bold text-fg shadow-soft focus-visible:outline-2 focus-visible:outline-accent aria-expanded:border-accent/45 md:min-h-0"
    />
  );
}
