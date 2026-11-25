"use client";

import { useMemo } from "react";
import { periodOptions, type PeriodOption } from "@/app/daily/views";
import { CalendarIcon, PILL_SELECT_CLASS, useSearchParamNavigation } from "@/components/cards/PeriodSelect";
import { Select } from "@/components/Select";
import { useDaily } from "./context";

/** The pill as the page header carries it, beside Refresh like every other dashboard's: it reads the shell's model for its options and the current year for its default. */
export function HeaderPeriodPicker() {
  const { model, today } = useDaily();
  const picker = useMemo(() => periodOptions(model), [model]);
  return <PeriodPicker options={picker.options} value={picker.value} defaultValue={today.slice(0, 4)} />;
}

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
