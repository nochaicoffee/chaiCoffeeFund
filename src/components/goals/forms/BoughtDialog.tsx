"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { boughtGoalForm } from "@/app/goals/actions";
import type { FormGoal, GoalsFormsData } from "@/app/goals/formsView";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readBoughtForm } from "@/lib/forms/goalForms";
import { DateInput, Field, MoneyInput, PreviewPanel, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import { GoalTile } from "../parts";

const Line = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-extrabold" : ""}`}>
    <dt className={strong ? "" : "text-muted"}>{label}</dt>
    <dd className="text-right tabular-nums">{value}</dd>
  </div>
);

/**
 * Mark bought (GoalsForms 4): what it really cost, the day, and where it was paid from (an account or a card, never both). The preview sets the cost
 * against the estimate. A goal with an open part can't be bought: it asks to finish or drop them first. Its money is released when it's bought.
 */
export function BoughtDialog({ forms, goal, onClose, onSaved }: { forms: GoalsFormsData; goal: FormGoal; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(boughtGoalForm, IDLE);
  const [actualCost, setActualCost] = useState(String(goal.target || ""));
  const [doneOn, setDoneOn] = useState(forms.today);
  const [paidFrom, setPaidFrom] = useState("");
  const blocked = goal.openKids > 0;

  const values = { goalId: goal.id, actualCost, doneOn, paidFrom };
  const read = readBoughtForm(values, { goalIds: [goal.id], accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id) });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok && !blocked) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, `${goal.name} bought`);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cost = parseAmountText(actualCost) ?? 0;
  const diff = goal.target - cost;
  return (
    <FormDialog
      icon={<CheckIcon />}
      title="Mark as bought"
      subtitle={`${goal.name} is done: record what it really cost.`}
      preview={
        <PreviewPanel caption={`The ${formatInr(goal.totalSaved)} set aside is released: nothing stays in the goal, and it stops being earmarked.`}>
          <div className="flex flex-col gap-3 rounded-[16px] bg-surface p-4">
            <span className="flex items-center gap-3">
              <GoalTile category={goal.category} colorKey={goal.colorKey} size={40} />
              <b className="block truncate text-[15px] font-extrabold">{goal.name}</b>
            </span>
            <b className="text-[28px] leading-none font-extrabold tabular-nums">{cost ? formatInr(cost) : "₹—"}</b>
          </div>
          <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
            <Line label="Estimate" value={formatInr(goal.target)} />
            <Line label="Cost" value={cost ? formatInr(cost) : "₹—"} />
            {cost > 0 && <Line label={diff >= 0 ? "Under by" : "Over by"} value={`${formatInr(Math.abs(diff))} · ${goal.target ? ((Math.abs(diff) / goal.target) * 100).toFixed(1) : "0"}%`} strong />}
          </dl>
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">You can reopen it from Finished.</span>}
      primaryLabel="Mark bought"
      pending={pending}
      errorCount={count + (blocked ? 1 : 0)}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="goalId" value={goal.id} />
      {(blocked || (state.status === "invalid" && state.errors.form)) && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {blocked ? `${goal.name} still has ${goal.openKids} open part${goal.openKids === 1 ? "" : "s"}. Finish or drop them first.` : state.status === "invalid" ? state.errors.form : ""}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="actualCost" label="What it cost" required error={errors.actualCost}>
          <MoneyInput {...describedBy("actualCost", errors.actualCost, false)} data-autofocus name="actualCost" value={actualCost} onChange={(e) => setActualCost(e.target.value)} onBlur={() => reveal("actualCost")} invalid={Boolean(errors.actualCost)} />
        </Field>
        <Field id="doneOn" label="Bought on" required error={errors.doneOn}>
          <DateInput {...describedBy("doneOn", errors.doneOn, false)} label="Bought on" name="doneOn" value={doneOn} onChange={setDoneOn} onBlur={() => reveal("doneOn")} today={forms.today} invalid={Boolean(errors.doneOn)} />
        </Field>
        <div className="md:col-span-2">
          <ChargedToField name="paidFrom" label="Paid from" value={paidFrom} onChange={setPaidFrom} forms={{ cards: forms.cards, accounts: forms.accounts }} help="Optional. An account or a card, at most one." error={errors.paidFrom} />
        </div>
      </div>
    </FormDialog>
  );
}
