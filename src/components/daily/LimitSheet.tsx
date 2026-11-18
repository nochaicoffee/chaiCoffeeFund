"use client";

import { useActionState, useEffect, useState } from "react";
import { setLimit } from "@/app/daily/actions";
import { formatMonthYear } from "@/lib/format/date";
import { IDLE } from "@/lib/forms/formState";
import { CheckIcon } from "../cards/forms/icons";

/** The monthly limit: one figure from this month on, until it's changed. Today's allowance moves with it. */
export function LimitForm({ month, current, onSaved }: { month: string; current: number | null; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(setLimit, IDLE);
  const [limit, setValue] = useState(current ? String(current) : "");
  useEffect(() => {
    if (state.status === "saved") onSaved();
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const error = state.status === "invalid" ? (state.errors.limit ?? state.errors.month ?? state.errors.form) : undefined;
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="month" value={month} />
      <div className="fld">
        <label className="fl" htmlFor="limit">
          Limit from {formatMonthYear(month)}
        </label>
        <span className="amt">
          <em>₹</em>
          <input id="limit" name="limit" inputMode="decimal" autoComplete="off" data-autofocus value={limit} placeholder="30,000" onChange={(e) => setValue(e.target.value)} aria-invalid={Boolean(error)} />
        </span>
        {error && <p className="err">{error}</p>}
        {state.status === "failed" && <p className="err">{state.message ?? "Couldn't save to the Sheet, so nothing was written. Try again."}</p>}
      </div>
      <p className="note-p">UPI and credit card together. It applies to every month from this one on, until you change it. Today&apos;s allowance is what&apos;s left of it, shared over the days to go, so it moves as you spend.</p>
      <button type="submit" disabled={pending} className="flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">
        <span className="inline-flex items-center gap-2">
          <CheckIcon /> {pending ? "Saving…" : "Save limit"}
        </span>
      </button>
    </form>
  );
}
