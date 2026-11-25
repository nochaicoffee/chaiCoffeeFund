"use client";

import { useActionState, useEffect, useState } from "react";
import { setLimits } from "@/app/daily/actions";
import { categoryLimitFor } from "@/lib/aggregate/dailyCategoryLimits";
import { formatMonthYear } from "@/lib/format/date";
import { CATEGORY_LIMIT_FIELD } from "@/lib/forms/dailyLimitForms";
import { IDLE } from "@/lib/forms/formState";
import { CheckIcon } from "../cards/forms/icons";
import { CategoryTile } from "./CategoryPicker";
import { useDaily } from "./context";

/**
 * The limits (docs/design/daily.md, round 6, L3): the monthly limit, one figure from this month on, until it's changed (today's allowance moves with it), and
 * a box per category for an optional limit of its own. A category left blank has none. Category limits may add up to more or less than the monthly one; the
 * monthly one still decides the strip and the pace.
 */
export function LimitForm({ month, current, onSaved }: { month: string; current: number | null; onSaved: () => void }) {
  const daily = useDaily();
  const [state, formAction, pending] = useActionState(setLimits, IDLE);
  const [limit, setValue] = useState(current ? String(current) : "");
  // A hidden category is listed only while it has a limit, so one can still be taken off.
  const rows = daily.categories.filter((c) => !c.hidden || categoryLimitFor(daily.model.categoryLimits, c.id, month) !== null);
  const [boxes, setBoxes] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((c) => [c.id, String(categoryLimitFor(daily.model.categoryLimits, c.id, month) ?? "")])));
  useEffect(() => {
    if (state.status === "saved") onSaved();
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const errors = state.status === "invalid" ? state.errors : {};
  const error = errors.limit ?? errors.month ?? errors.form;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      <div className="fld">
        <label className="fl" htmlFor="limit">
          Monthly limit from {formatMonthYear(month)}
        </label>
        <span className="amt">
          <em>₹</em>
          <input id="limit" name="limit" inputMode="decimal" autoComplete="off" data-autofocus value={limit} placeholder="Not set" onChange={(e) => setValue(e.target.value)} aria-invalid={Boolean(errors.limit)} />
        </span>
        {error && <p className="err">{error}</p>}
        {state.status === "failed" && <p className="err">{state.message ?? "Couldn't save to the Sheet, so nothing was written. Try again."}</p>}
      </div>
      <p className="note-p">Leave it blank to keep the monthly limit as it is. UPI, credit card and cash together. It applies to every month from this one on, until you change it. Today&apos;s allowance is what&apos;s left of it, shared over the days to go, so it moves as you spend.</p>
      <div className="fld">
        <span className="fl">
          By category <small>optional · blank means no limit</small>
        </span>
        <div className="cl-list">
          {rows.map((c) => {
            const field = `${CATEGORY_LIMIT_FIELD}${c.id}`;
            return (
              <div key={c.id} className="cl-row">
                <CategoryTile category={c} small />
                <label htmlFor={field}>{c.name}</label>
                <span className="amt cl-amt">
                  <em>₹</em>
                  <input id={field} name={field} inputMode="decimal" autoComplete="off" value={boxes[c.id] ?? ""} placeholder="No limit" onChange={(e) => setBoxes((b) => ({ ...b, [c.id]: e.target.value }))} aria-invalid={Boolean(errors[field])} />
                </span>
                {errors[field] && <p className="err cl-err">{errors[field]}</p>}
              </div>
            );
          })}
        </div>
      </div>
      <p className="note-p">Category limits apply from this month on too, until you change them. Taking one off keeps the spends and last month&apos;s limit.</p>
      <button type="submit" disabled={pending} className="flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
        <span className="inline-flex items-center gap-2">
          <CheckIcon /> {pending ? "Saving…" : "Save limits"}
        </span>
      </button>
    </form>
  );
}
