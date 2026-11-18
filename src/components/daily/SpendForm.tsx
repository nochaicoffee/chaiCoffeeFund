"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveDailySpend } from "@/app/daily/actions";
import { METHOD_NAMES } from "@/app/daily/views";
import { addDays } from "@/lib/forms/dates";
import { formatInrExact, parseAmountText } from "@/lib/format/money";
import { readDailySpendForm } from "@/lib/forms/dailySpendForms";
import { IDLE, type FormState } from "@/lib/forms/formState";
import { DAILY_SPEND_METHODS, type DailySpend, type DailySpendMethod } from "@/lib/sheets/types";
import { DateInput, Field, TextInput, describedBy } from "../cards/forms/fields";
import { useFieldErrors } from "../cards/forms/useFieldErrors";
import { CheckIcon } from "../cards/forms/icons";
import { CategoryPicker } from "./CategoryPicker";
import { useDaily } from "./context";
import { formatDayDate } from "@/lib/format/date";

export interface SpendDraft {
  date: string;
  amount: string;
  method: DailySpendMethod;
  category: string;
  note: string;
}

/**
 * The fields of a spend (docs/design/daily.md): the amount first (it has focus), UPI or card, the category chips, a note, and in a sheet the day. `card` is
 * quick add beside the calendar (dark, for the selected day: it empties after each add so the next one can go in); `sheet` is the add and edit screens.
 */
export function SpendForm({ variant, draft, editing, onSaved, onAdded, footer }: { variant: "card" | "sheet"; draft: SpendDraft; editing?: DailySpend; /** An edit was saved. */ onSaved?: (state: FormState) => void; /** An add was handed over: it's already on the page, and the save finishes in the background. */ onAdded?: () => void; footer?: React.ReactNode }) {
  const daily = useDaily();
  const [state, formAction, pending] = useActionState(saveDailySpend, IDLE);
  const [amount, setAmount] = useState(draft.amount);
  const [method, setMethod] = useState<DailySpendMethod>(draft.method);
  const [category, setCategory] = useState(draft.category);
  const [note, setNote] = useState(draft.note);
  const [sheetDate, setSheetDate] = useState(draft.date);
  // Quick add follows the day picked on the calendar; a day to come can't have a spend, so it falls back to today.
  const date = variant === "card" ? (daily.selected > daily.today ? daily.today : daily.selected) : sheetDate;

  const ids = [...daily.categories, ...daily.addedCategories].map((c) => c.id);
  const values = { amount, method, date, category, note };
  const read = readDailySpendForm(values, { categoryIds: ids }, daily.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // An edit goes to the Sheet through the form's action and waits for it. An add doesn't wait: it's in every figure at once, and the shell finishes the save.
    if (read.ok && editing) return markSubmitted();
    event.preventDefault();
    if (!read.ok) return revealAll();
    daily.addSpend(read.input);
    onAdded?.();
  }
  useEffect(() => {
    if (state.status !== "saved") return;
    onSaved?.(state);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cost = parseAmountText(amount);
  const label = date === daily.today ? "today" : formatDayDate(date);
  return (
    <form action={editing ? formAction : undefined} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="category" value={category} />
      {variant === "card" && <input type="hidden" name="date" value={date} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="err">
          {state.errors.form}
        </p>
      )}
      {(state.status === "failed" || count > 1) && (
        <p role="alert" className="err">
          {state.status === "failed" ? (state.message ?? "Couldn't save to the Sheet, so nothing was written. What you entered is still here: try again.") : `${count} fields need fixing.`}
        </p>
      )}
      <div className="fld">
        <label className="fl" htmlFor={`amount-${variant}`}>
          Amount
        </label>
        <span className="amt">
          <em>₹</em>
          <input id={`amount-${variant}`} name="amount" inputMode="decimal" autoComplete="off" data-autofocus value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} aria-invalid={Boolean(errors.amount)} />
        </span>
        {errors.amount && <p className="err">{errors.amount}</p>}
      </div>
      <div className="fld">
        <span className="fl" id={`method-${variant}`}>
          Paid with
        </span>
        <div className="seg2" role="radiogroup" aria-labelledby={`method-${variant}`}>
          {DAILY_SPEND_METHODS.map((m) => (
            <label key={m}>
              <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
              <span>
                <i className={`md ${m === "UPI" ? "md-u" : "md-c"}`} />
                {METHOD_NAMES[m]}
              </span>
            </label>
          ))}
        </div>
        {errors.method && <p className="err">{errors.method}</p>}
      </div>
      {variant === "sheet" && (
        <Field id={`date-${variant}`} label="Day" required error={errors.date}>
          <DateInput
            {...describedBy(`date-${variant}`, errors.date, false)}
            label="Day"
            name="date"
            value={sheetDate}
            onChange={setSheetDate}
            onBlur={() => reveal("date")}
            today={daily.today}
            max={daily.today}
            shortcuts={[
              { label: "Today", date: daily.today },
              { label: "Yesterday", date: addDays(daily.today, -1) },
            ]}
            invalid={Boolean(errors.date)}
          />
        </Field>
      )}
      <div className="fld">
        <span className="fl">
          Category <small>optional</small>
        </span>
        <CategoryPicker value={category} onChange={setCategory} />
        {errors.category && <p className="err">{errors.category}</p>}
      </div>
      {variant === "sheet" ? (
        <Field id="note-sheet" label="What it was" error={errors.note}>
          <TextInput {...describedBy("note-sheet", errors.note, false)} name="note" value={note} placeholder="Lunch" onChange={(e) => setNote(e.target.value)} invalid={Boolean(errors.note)} />
        </Field>
      ) : (
        <div className="fld">
          <label className="fl" htmlFor="note-card">
            What it was <small>optional</small>
          </label>
          <span className="inp">
            <input id="note-card" name="note" value={note} placeholder="Lunch" onChange={(e) => setNote(e.target.value)} />
          </span>
          {errors.note && <p className="err">{errors.note}</p>}
        </div>
      )}
      <button type="submit" disabled={pending} className={variant === "card" ? "btn-lime" : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"}>
        <CheckIcon /> {pending ? "Saving…" : editing ? "Save" : cost && cost > 0 ? `Add ${formatInrExact(cost)} to ${label}` : `Add to ${label}`}
      </button>
      {footer}
    </form>
  );
}
