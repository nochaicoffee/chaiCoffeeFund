"use client";

import { formatInr } from "@/lib/format/money";
import type { GoalNecessity } from "@/lib/sheets/types";
import { DateInput, MoneyInput, TextInput } from "../../cards/forms/fields";
import { PlusIcon } from "../../cards/forms/icons";

/** One row of the Parts section, as typed. `given` is what the goal's pot has given it, shown once the goal has money set aside. */
export interface PartRow {
  key: string;
  id?: string;
  name: string;
  amount: string;
  necessity: GoalNecessity;
  targetDate: string;
  given: string;
}

// A row's key stays with it while it's edited or others are removed. The stamp keeps keys apart if the module is reloaded while a form is open.
const stamp = Date.now().toString(36);
let counter = 0;
export const newPartRow = (init: Partial<PartRow> = {}): PartRow => ({ key: `part-${stamp}-${++counter}`, name: "", amount: "", necessity: "Want", targetDate: "", given: "", ...init });

/** The rows as the form sends them: one JSON field, every box as typed. */
export const partsJson = (rows: PartRow[]): string => JSON.stringify(rows.map((row) => ({ id: row.id, name: row.name, amount: row.amount, necessity: row.necessity, targetDate: row.targetDate, given: row.given })));

const SHADES = ["oklch(0.82 0.1 55)", "oklch(0.74 0.12 52)", "oklch(0.66 0.13 50)", "oklch(0.58 0.12 48)", "oklch(0.5 0.1 46)"];
const NEED_WANT: GoalNecessity[] = ["Need", "Want"];

/**
 * The Parts section of Add and Edit goal (docs/design/goals.md, "Round 5"): a part is a piece of the goal with its own cost and date, like the
 * suspension of a car. A row has a name, a cost, an optional date (blank follows the goal's), Need or Want and, for a goal that has money set aside,
 * what the pot gives it. Parts are added and changed here and nowhere else.
 */
export function PartsSection({ rows, onChange, today, showGiven, error }: { rows: PartRow[]; onChange: (rows: PartRow[]) => void; today: string; showGiven: boolean; error?: string }) {
  const set = (key: string, patch: Partial<PartRow>) => onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  return (
    <fieldset className="flex min-w-0 flex-col gap-2.5 md:col-span-2" aria-describedby={error ? "parts-error" : "parts-help"}>
      <legend className="mb-1 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
        Parts <span className="font-semibold normal-case">· optional</span>
      </legend>
      {rows.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 rounded-[14px] bg-fill/60 p-2.5">
          <i className="h-3 w-3 rounded-[3px]" style={{ background: SHADES[index % SHADES.length] }} aria-hidden="true" />
          <TextInput aria-label={`Part ${index + 1} name`} placeholder="Suspension" value={row.name} onChange={(e) => set(row.key, { name: e.target.value })} invalid={false} />
          <button type="button" onClick={() => onChange(rows.filter((r) => r.key !== row.key))} aria-label={`Remove ${row.name.trim() || `part ${index + 1}`}`} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
            <span aria-hidden="true">×</span>
          </button>
          <div className="col-span-3 grid grid-cols-2 items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
            <MoneyInput aria-label={`${row.name.trim() || `Part ${index + 1}`} cost`} placeholder="Cost" value={row.amount} onChange={(e) => set(row.key, { amount: e.target.value })} invalid={false} />
            <DateInput label={`${row.name.trim() || `Part ${index + 1}`} date`} name={`partDate${index}`} value={row.targetDate} onChange={(value) => set(row.key, { targetDate: value })} today={today} invalid={false} placeholder="Goal's date" />
            <div role="group" aria-label={`${row.name.trim() || `Part ${index + 1}`}: Need or Want`} className="flex rounded-full bg-fill p-[3px] max-md:col-span-2">
              {NEED_WANT.map((option) => (
                <button key={option} type="button" aria-pressed={row.necessity === option} onClick={() => set(row.key, { necessity: option })} className={`min-h-7 flex-1 rounded-full px-3 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${row.necessity === option ? "bg-surface text-fg shadow-sm" : "text-muted"}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          {showGiven && (
            <label className="col-span-3 flex items-center gap-2 text-[11.5px] font-semibold text-muted">
              <span className="shrink-0">Given from the pot</span>
              <span className="w-36">
                <MoneyInput aria-label={`${row.name.trim() || `Part ${index + 1}`}: given from the pot`} placeholder="0" value={row.given} onChange={(e) => set(row.key, { given: e.target.value })} invalid={false} />
              </span>
              {row.amount && <span className="tabular-nums">of {formatInr(Number(row.amount.replace(/[^\d.]/g, "")) || 0)}</span>}
            </label>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, newPartRow()])} className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full bg-fill px-3.5 text-xs font-extrabold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
        <PlusIcon /> Add a part
      </button>
      {error ? (
        <p id="parts-error" role="alert" className="text-[11.5px] font-semibold text-negative">
          {error}
        </p>
      ) : (
        <p id="parts-help" className="text-[11.5px] font-medium text-muted">
          A part is a piece of this goal with its own cost and date, like the suspension of a car. Set money aside on the goal, then give each part its share here.
        </p>
      )}
    </fieldset>
  );
}
