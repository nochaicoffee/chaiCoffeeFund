"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveGoal } from "@/app/goals/actions";
import type { FormGoal, GoalsFormsData } from "@/app/goals/formsView";
import { monthsLeft, requiredFor } from "@/lib/aggregate/goals";
import { goalColorKey } from "@/lib/format/goalLabels";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readGoalForm } from "@/lib/forms/goalForms";
import { GOAL_CATEGORIES, GOAL_COLORS, type GoalCategory, type GoalDateType, type GoalNecessity, type GoalScale } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy, inputClass } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ColorSwatches } from "../../shell/ColorSwatches";
import { GoalTile } from "../parts";

const CATEGORY_OPTIONS = GOAL_CATEGORIES.map((c) => ({ value: c, label: c }));

const Line = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-extrabold" : ""}`}>
    <dt className={strong ? "" : "text-muted"}>{label}</dt>
    <dd className="text-right tabular-nums">{value}</dd>
  </div>
);

/**
 * Add goal, Add sub-goal and Edit goal (GoalsForms 1 and 2, GoalsForms2 Edit). A sub-goal is a goal with a `parentId`: it grows its parent's total by its
 * amount. The preview works out what it needs a month from the amount and the date, with the same rule the page uses. Editing changes the goal's own
 * fields; what's set aside is entries, never typed here, and a blank optional box clears it.
 */
export function GoalFormDialog({ forms, editing, parent, category: startCategory, onClose, onSaved }: { forms: GoalsFormsData; editing?: FormGoal; parent?: FormGoal; category?: GoalCategory; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(saveGoal, IDLE);
  const parentGoal = parent ?? (editing?.parentId ? forms.goals.find((g) => g.id === editing.parentId) : undefined);
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<GoalCategory | "">(editing?.category ?? parentGoal?.category ?? startCategory ?? "");
  const [necessity, setNecessity] = useState<GoalNecessity | "">(editing?.necessity ?? "Want");
  const [scale, setScale] = useState<GoalScale | "">(editing?.scale ?? parentGoal?.scale ?? "Minor");
  const [amount, setAmount] = useState(editing ? String(editing.amount || "") : "");
  const [targetDate, setTargetDate] = useState(editing?.targetDate ?? "");
  const [dateType, setDateType] = useState<GoalDateType>(editing?.dateType ?? "Flexible");
  const [startDate, setStartDate] = useState(editing?.startDate ?? forms.today);
  const [plannedMonthly, setPlannedMonthly] = useState(editing?.plannedMonthly ? String(editing.plannedMonthly) : "");
  const [color, setColor] = useState<string>(editing?.color ?? "");
  const [link, setLink] = useState(editing?.link ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const values = { id: editing?.id ?? "", parentId: parentGoal && !editing ? parentGoal.id : "", name, category, necessity, scale, amount, targetDate, dateType: targetDate ? dateType : "", startDate, plannedMonthly, color, link, notes };
  const read = readGoalForm(values, forms.goals.filter((g) => !g.parentId).map((g) => g.id), { allowZeroAmount: Boolean(editing && editing.openKids > 0) });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, `${name.trim()} ${editing ? "saved" : "added"}`);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cost = parseAmountText(amount) ?? 0;
  const planned = parseAmountText(plannedMonthly) ?? 0;
  const saved = editing?.saved ?? 0;
  const months = targetDate ? monthsLeft(targetDate, forms.today) : null;
  const needs = targetDate ? requiredFor(Math.max(0, cost - saved), targetDate, forms.today) : 0;
  const colorKey = color ? (color.toLowerCase() as ReturnType<typeof goalColorKey>) : editing ? editing.colorKey : goalColorKey({ category: (category || "Other") as GoalCategory });
  const title = editing ? "Edit goal" : parentGoal ? "Add a sub-goal" : "Add a goal";

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={title}
      subtitle={editing ? `${editing.name}. Saved and funded are worked out, so they follow.` : parentGoal ? `A piece of ${parentGoal.name}. Its total grows by this amount.` : "Something you're saving a sum of money for."}
      preview={
        <PreviewPanel caption={parentGoal ? `${parentGoal.name} becomes ${formatInr(parentGoal.target + (editing ? cost - editing.amount : cost))} with this.` : "What you set aside is recorded as entries, so a goal's progress is never typed in."}>
          <div className="flex flex-col gap-3 rounded-[16px] bg-surface p-4">
            <span className="flex items-center gap-3">
              <GoalTile category={(category || "Other") as GoalCategory} colorKey={colorKey} size={40} />
              <span className="min-w-0">
                <b className="block truncate text-[15px] font-extrabold">{name.trim() || "New goal"}</b>
                <span className="block truncate text-xs font-semibold text-muted">
                  {category || "Category"} · {necessity || "Need or Want"} · {scale || "Minor or Major"}
                </span>
              </span>
            </span>
            <b className="text-[28px] leading-none font-extrabold tabular-nums">{cost ? formatInr(cost) : "₹—"}</b>
          </div>
          <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
            <Line label="Needed a month" value={needs ? formatInr(needs) : "—"} strong />
            <Line label="Months left" value={months === null ? "someday" : String(months || 1)} />
            <Line label="You plan" value={planned ? formatInr(planned) : "nothing yet"} />
            {needs > 0 && planned > 0 && <Line label="Standing" value={planned >= needs ? "On track" : `Behind by ${formatInr(needs - planned)} a month`} />}
            {needs > 0 && !planned && <Line label="Standing" value="No plan yet" />}
          </dl>
          <ColorSwatches colors={GOAL_COLORS} value={color} onChange={setColor} error={errors.color} optional />
          <p className="text-[11.5px] font-medium text-muted">{color ? "Your colour." : "Its category's colour. Pick one above to change it."}</p>
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">{editing ? "Your set-asides stay as they are." : "A goal can be split into sub-goals afterwards."}</span>}
      primaryLabel={editing ? "Save goal" : parentGoal ? "Add sub-goal" : "Add goal"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      {parentGoal && !editing && <input type="hidden" name="parentId" value={parentGoal.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="name" label="Name" required className="md:col-span-2" error={errors.name}>
          <TextInput {...describedBy("name", errors.name, false)} data-autofocus name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} />
        </Field>
        <Field id="category" label="Category" required error={errors.category}>
          <SelectInput id="category" name="category" invalid={Boolean(errors.category)} options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as GoalCategory)} placeholder="Choose a category" />
        </Field>
        <Segmented name="necessity" legend="Why" required options={[{ value: "Need", label: "Need" }, { value: "Want", label: "Want" }]} value={necessity} onChange={setNecessity} help="A Need breaks or goes undone without it." error={errors.necessity} />
        <Segmented name="scale" legend="How long" required options={[{ value: "Minor", label: "Minor" }, { value: "Major", label: "Major" }]} value={scale} onChange={setScale} help="Minor: short-term. Major: a long-term commitment." error={errors.scale} />
        <Field id="amount" label={parentGoal || editing?.parentId ? "Amount" : editing?.hasKids ? "Its own part" : "Amount"} required help={editing?.hasKids ? "The part that isn't a sub-goal. Its sub-goals add to the total." : undefined} error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, Boolean(editing?.hasKids))} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        <Field id="targetDate" label="Target date" help="Leave it empty for someday." error={errors.targetDate}>
          <DateInput {...describedBy("targetDate", errors.targetDate, true)} label="Target date" name="targetDate" value={targetDate} onChange={setTargetDate} onBlur={() => reveal("targetDate")} today={forms.today} invalid={Boolean(errors.targetDate)} />
        </Field>
        <Segmented name="dateType" legend="Date type" options={[{ value: "Flexible", label: "Flexible" }, { value: "Fixed", label: "Fixed" }]} value={dateType} onChange={setDateType} help="Fixed can't slip, and is funded first." error={errors.dateType} />
        <Field id="startDate" label="Saving began" required help="The pace line counts from here." error={errors.startDate}>
          <DateInput {...describedBy("startDate", errors.startDate, true)} label="Saving began" name="startDate" value={startDate} onChange={setStartDate} onBlur={() => reveal("startDate")} today={forms.today} invalid={Boolean(errors.startDate)} />
        </Field>
        <Field id="plannedMonthly" label="Planned a month" help="What you intend to put aside. Optional." error={errors.plannedMonthly}>
          <MoneyInput {...describedBy("plannedMonthly", errors.plannedMonthly, true)} name="plannedMonthly" value={plannedMonthly} onChange={(e) => setPlannedMonthly(e.target.value)} onBlur={() => reveal("plannedMonthly")} invalid={Boolean(errors.plannedMonthly)} />
        </Field>
        <Field id="link" label="Link" help="A product or booking page." error={errors.link}>
          <TextInput {...describedBy("link", errors.link, true)} name="link" value={link} onChange={(e) => setLink(e.target.value)} onBlur={() => reveal("link")} invalid={Boolean(errors.link)} placeholder="https://" />
        </Field>
        <Field id="notes" label="Notes" className="md:col-span-2" error={errors.notes}>
          <textarea {...describedBy("notes", errors.notes, false)} name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass(Boolean(errors.notes))} h-auto py-2.5`} />
        </Field>
      </div>
    </FormDialog>
  );
}
