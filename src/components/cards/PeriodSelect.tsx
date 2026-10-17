"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The "This year ▾" pill from the design. Changing it updates `?period=` and
 * keeps everything else in the URL, so every number on the page follows it,
 * except a page number: a different period's list starts again at page 1.
 */
export function PeriodSelect({ years, currentYear, value }: { years: number[]; currentYear: number; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function choose(next: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("page");
    if (next === String(currentYear)) query.delete("period");
    else query.set("period", next);
    const text = query.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
    router.push(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  return (
    <label className="relative flex items-center rounded-full border border-surface-line bg-surface shadow-soft focus-within:outline-2 focus-within:outline-accent">
      <span className="sr-only">Period</span>
      <svg className="pointer-events-none absolute left-4 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
      <select
        value={value}
        onChange={(e) => choose(e.target.value)}
        className="min-h-11 cursor-pointer appearance-none rounded-full bg-transparent py-2.5 pr-9 pl-10 text-[13px] font-bold text-fg outline-none md:min-h-0"
      >
        {years.map((year) => (
          <option key={year} value={String(year)}>
            {year === currentYear ? "This year" : String(year)}
          </option>
        ))}
        <option value="all">All time</option>
      </select>
      <svg className="pointer-events-none absolute right-4 text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </label>
  );
}
