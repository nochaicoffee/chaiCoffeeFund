"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveEntry } from "@/app/goals/actions";
import type { GoalsFormsData } from "@/app/goals/formsView";
import { formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readEntryForm } from "@/lib/forms/goalForms";
import { fillInOrder, requiredFor } from "@/lib/aggregate/goals";
import { DateInput, Field, MoneyInput, PreviewPanel, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon, InfoIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { GoalTile } from "../parts";

const Line = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-extrabold" : ""}`}>
    <dt className={strong ? "" : "text-muted"}>{label}</dt>
    <dd className="text-right tabular-nums">{value}</dd>
  </div>
);

/**
 * Set aside and Take back (GoalsForms 3, GoalsForms2 Take back): the same form either way. Setting aside records money you've put towards a goal, and
 * nothing moves in your accounts; taking back releases it, for when the plan changes or the price came down. The preview shows the goal before and after,
 * and a take-back can't be more than what's set aside in that goal. `amount` starts the field at what a button on the page suggested.
 */
export function EntryDialog({ forms, kind, goalId, amount: start, onClose, onSaved }: { forms: GoalsFormsData; kind: "Set-aside" | "Take-back"; goalId?: string; amount?: number; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(saveEntry, IDLE);
  const take = kind === "Take-back";
  // Only an open main goal takes money (a part is funded from its goal's pot), and a take-back can come from any one with something free in its pot.
  const choices = forms.goals.filter((g) => !g.parentId && (take ? g.saved > 0 : g.status === "Active" || g.status === "Paused"));
  const first = choices.find((g) => g.id === goalId) ?? choices[0];
  const [chosen, setChosen] = useState(first?.id ?? "");
  const [amount, setAmount] = useState(start ? String(start) : take && first ? String(Math.max(0, first.saved - first.amount) || "") : "");
  const [date, setDate] = useState(forms.today);
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [give, setGive] = useState(true);
  const goal = choices.find((g) => g.id === chosen);
  const hasParts = Boolean(goal && goal.parts.length > 0);

  const values = { goalId: chosen, kind, amount, date, accountId, note };
  const read = readEntryForm(values, { goalIds: choices.map((g) => g.id), accountIds: forms.accounts.map((a) => a.id) });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  const paid = parseAmountText(amount) ?? 0;
  const tooMuch = take && goal !== undefined && paid > goal.saved;
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok && !tooMuch) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, take ? "Taken back" : "Set aside");
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // A goal with parts shows its whole pot (what's given to parts and what's free) against its whole total.
  const before = goal ? (hasParts ? goal.pot : goal.saved) : 0;
  const goalTarget = goal ? (hasParts ? goal.target : goal.amount) : 0;
  const after = goal ? (take ? Math.max(0, before - paid) : before + paid) : 0;
  const left = goal ? Math.max(0, goalTarget - after) : 0;
  const needsAfter = goal?.dueDate && !hasParts ? requiredFor(left, goal.targetDate ?? goal.dueDate, forms.today) : 0;
  const needsBefore = goal?.dueDate && !hasParts ? requiredFor(Math.max(0, goalTarget - before), goal.targetDate ?? goal.dueDate, forms.today) : 0;
  const given = goal && hasParts && !take && give ? fillInOrder(goal.parts.map((part) => ({ id: part.id, amount: part.amount, saved: part.saved, necessity: part.necessity, dateType: part.dateType, due: part.targetDate ?? goal.dueDate })), paid) : {};
  const givenTotal = Object.values(given).reduce((total, value) => total + value, 0);
  const filled = goal ? goal.parts.filter((part) => (given[part.id] ?? 0) > 0 && part.saved + (given[part.id] ?? 0) >= part.amount).length : 0;
  const account = forms.accounts.find((a) => a.id === accountId);

  return (
    <FormDialog
      icon={<CheckIcon />}
      title={take ? "Take back" : "Set aside"}
      subtitle={take ? "Release money from a goal. Nothing moves in your accounts." : "Record money you've put towards a goal. Nothing moves in your accounts."}
      preview={
        <PreviewPanel caption={take ? "The money is free again. It isn't set aside for anything until you give it to another goal." : "A goal never changes your net worth: the money is already in your accounts."}>
          {goal ? (
            <>
              <div className="flex flex-col gap-3 rounded-[16px] bg-surface p-4">
                <span className="flex items-center gap-3">
                  <GoalTile category={goal.category} colorKey={goal.colorKey} size={40} />
                  <span className="min-w-0">
                    <b className="block truncate text-[15px] font-extrabold">{goal.name}</b>
                    <span className="block truncate text-xs font-semibold text-muted">{hasParts ? `${goal.partCount} parts` : goal.category}</span>
                  </span>
                </span>
                <b className="text-[28px] leading-none font-extrabold tabular-nums">
                  {paid ? `${take ? "−" : "+"}${formatInr(paid)}` : "₹—"}
                </b>
              </div>
              <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                <Line label={hasParts ? "In the goal" : "Set aside"} value={`${formatInr(before)} → ${formatInr(after)}`} strong />
                <Line label="Still to go" value={`${formatInr(Math.max(0, goalTarget - before))} → ${formatInr(left)}`} />
                {goal.dueDate && !hasParts && <Line label="Needed a month" value={`${formatInr(needsBefore)} → ${formatInr(needsAfter)}`} />}
                {hasParts && !take && (
                  <Line label="Given to parts" value={give ? (givenTotal ? `${formatInr(givenTotal)}${filled ? ` · ${filled} filled` : ""}` : "nothing to fill") : "stays not given to a part"} />
                )}
              </dl>
              {account && !take && (
                <p className="flex items-start gap-2 text-[11.5px] font-medium text-muted">
                  <InfoIcon />
                  <span>It sits in {account.name}. A warning shows if the earmarks there pass the balance.</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-muted">{take ? "Nothing is set aside to take back." : "There's no goal to set money aside for."}</p>
          )}
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">{take ? "A take-back never takes a goal below zero." : "A take-back is this form the other way round."}</span>}
      primaryLabel={take ? (paid ? `Take back ${formatInr(paid)}` : "Take back") : paid ? `Set aside ${formatInr(paid)}` : "Set aside"}
      pending={pending}
      errorCount={count + (tooMuch ? 1 : 0)}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="kind" value={kind} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field id="goalId" label="Goal" required error={errors.goalId}>
            <SelectInput id="goalId" name="goalId" invalid={Boolean(errors.goalId)} options={choices.map((g) => ({ value: g.id, label: g.partCount ? `${g.name} · ${g.partCount} parts` : g.name, meta: take ? `${formatInr(g.saved)} ${g.parts.length ? "free" : "set aside"}` : g.dueDate ? `due ${formatShortDate(g.dueDate)}` : undefined, swatch: { background: `var(--card-${g.colorKey})` } }))} value={chosen} onChange={setChosen} placeholder="Choose the goal" />
          </Field>
        </div>
        <Field id="amount" label="Amount" required help={take && goal ? `At most ${formatInr(goal.saved)}: ${hasParts ? "what isn't given to any part" : "what's set aside"}.` : undefined} error={errors.amount ?? (tooMuch && goal ? `Only ${formatInr(goal.saved)} is ${hasParts ? "not given to a part in" : "set aside in"} ${goal.name}` : undefined)}>
          <MoneyInput {...describedBy("amount", errors.amount, Boolean(take && goal))} data-autofocus name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount || tooMuch)} />
        </Field>
        <Field id="date" label="Date" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} label="Date" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
        </Field>
        {hasParts && !take && (
          <label className="flex items-start gap-2.5 text-[12.5px] font-semibold md:col-span-2">
            <input type="checkbox" name="give" checked={give} onChange={(e) => setGive(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            <span>
              Give it to the parts in order
              <small className="block text-[11.5px] font-medium text-muted">Needs first, then the soonest, then the smaller. What no part can take stays not given to a part. Leave it off to give each part its share by hand in Edit.</small>
            </span>
          </label>
        )}
        <div className="md:col-span-2">
          <Field id="accountId" label="Where it sits" help={take ? undefined : "Optional. It lets the page warn if an account is promised more than it holds."} error={errors.accountId}>
            <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={[{ value: "", label: "Not said", display: "Not said", quiet: true }, ...forms.accounts.map((a) => ({ value: a.id, label: a.name }))]} value={accountId} onChange={setAccountId} placeholder="Not said" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field id="note" label="Note" error={errors.note}>
            <TextInput {...describedBy("note", errors.note, false)} name="note" value={note} onChange={(e) => setNote(e.target.value)} invalid={Boolean(errors.note)} placeholder={take ? "Price came down" : "Added from the bonus"} />
          </Field>
        </div>
      </div>
    </FormDialog>
  );
}
