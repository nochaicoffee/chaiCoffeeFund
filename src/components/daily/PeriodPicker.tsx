"use client";

import type { PeriodOption } from "@/app/daily/views";
import { CalendarIcon, PILL_SELECT_CLASS, useSearchParamNavigation } from "@/components/cards/PeriodSelect";
import { Select } from "@/components/Select";

/** The period pill: This month, or a year. It sets `?period=` (a year, or "month"); the default is the current year, so that leaves the address clean. */
export function PeriodPicker({ options, value, defaultValue }: { options: PeriodOption[]; value: string; defaultValue: string }) {
  const choose = useSearchParamNavigation("period");
  return (
    <Select
      variant="pill"
      aria-label="Period"
      options={[...options.map((o) => ({ value: o.value, label: o.label, meta: o.meta })), { value: "range", label: "Range…", meta: "later", disabled: true }]}
      value={value}
      onChange={(v) => choose(v === defaultValue ? "" : v)}
      icon={<CalendarIcon />}
      className={PILL_SELECT_CLASS}
    />
  );
}
