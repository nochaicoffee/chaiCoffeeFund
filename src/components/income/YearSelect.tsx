"use client";

import { CalendarIcon, PILL_SELECT_CLASS, useSearchParamNavigation } from "@/components/cards/PeriodSelect";
import { Select, type SelectOption } from "@/components/Select";

/**
 * The Income page's year pill: the cover is a year in columns, so the period is a year, this one (the default,
 * no `?year=`) back to the first with income. It looks and navigates like the period pill.
 */
export function YearSelect({ options, value }: { options: SelectOption[]; value: string }) {
  const choose = useSearchParamNavigation("year");
  return <Select variant="pill" aria-label="Year" options={options} value={value} onChange={choose} icon={<CalendarIcon />} className={PILL_SELECT_CLASS} />;
}
