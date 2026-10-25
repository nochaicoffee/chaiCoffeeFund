"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveEntry } from "@/app/income/actions";
import type { FormEntry, IncomeFormsData } from "@/app/income/views";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { cardColorKey } from "@/lib/format/colors";
import { formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { INCOME_TAGS, readEntryForm } from "@/lib/forms/incomeForms";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { SourceIcon } from "../SourceIcon";

export type EntryStart =
  /** Record income, from a source or from nowhere in particular. */
  | { kind: "record"; sourceId?: string }
  /** Mark received: Record income opened on a payment that's owed. */
  | { kind: "receive"; sourceId: string; expectedDate: string; amount: number }
  | { kind: "edit"; entry: FormEntry };

const TAG_LABELS = { Regular: "Regular", Bonus: "Bonus", Other: "One-off" } as const;

/**
 * Record income (IncomeZForms): money that landed. Mark received is the same form started on a payment that's owed
 * (its source and expected day, landed today at the usual amount), and Edit entry the same form on a payment, with
 * Delete. An entry records income only; balances are updated on the Accounts page.
 */
export function EntryFormDialog({ start, forms, onClose, onRecorded, onDelete }: { start: EntryStart; forms: IncomeFormsData; onClose: () => void; onRecorded: (undo: { id: string; message: string }, written: { incomeSourceId: string; receivedDate: string; amount: number }) => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveEntry, IDLE);
  const editing = start.kind === "edit" ? start.entry : undefined;
  const firstSource = start.kind === "edit" ? start.entry.incomeSourceId : (start.sourceId ?? forms.sources.find((s) => s.status === "Active")?.id ?? "");
  const sourceOf = (id: string) => forms.sources.find((s) => s.id === id);
  const [sourceId, setSourceId] = useState(firstSource);
  // Record income starts on the source's oldest payment owed, so a late payment pays that payday, not the one
  // nearest the day it landed (which can be the next); it's changed by hand for an early or extra payment.
  const owedOf = (id: string) => forms.pending.find((p) => p.sourceId === id)?.expectedDate ?? "";
  const [expectedDate, setExpectedDate] = useState(start.kind === "edit" ? start.entry.expectedDate : start.kind === "receive" ? start.expectedDate : owedOf(firstSource));
  const [receivedDate, setReceivedDate] = useState(start.kind === "edit" ? start.entry.receivedDate : forms.today);
  const [amount, setAmount] = useState(start.kind === "edit" ? String(start.entry.amount) : start.kind === "receive" ? String(start.amount) : sourceOf(firstSource) ? String(sourceOf(firstSource)!.expectedAmount) : "");
  const [tag, setTag] = useState<string>(start.kind === "edit" ? start.entry.tag : "Regular");
  const [accountId, setAccountId] = useState(start.kind === "edit" ? (start.entry.accountId ?? "") : (sourceOf(firstSource)?.accountId ?? ""));

  const values = { incomeSourceId: sourceId, expectedDate, receivedDate, amount, tag, accountId };
  const check = readEntryForm(values, { sourceIds: forms.sources.map((s) => s.id), accountIds: forms.accounts.map((a) => a.id) }, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  // A new payment saved: hand its Undo to the toast.
  useEffect(() => {
    if (state.status === "saved" && state.undo && check.ok) onRecorded(state.undo, { incomeSourceId: check.input.incomeSourceId, receivedDate: check.input.receivedDate, amount: check.input.amount });
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Picking another source starts its usual amount and account, until they're changed by hand.
  function chooseSource(id: string) {
    const before = sourceOf(sourceId);
    const next = sourceOf(id);
    setSourceId(id);
    if (start.kind === "record" && expectedDate === owedOf(sourceId)) setExpectedDate(owedOf(id));
    if (next && (amount === "" || (before && parseAmountText(amount) === before.expectedAmount))) setAmount(String(next.expectedAmount));
    if (next && (accountId === "" || accountId === before?.accountId)) setAccountId(next.accountId ?? "");
  }

  const source = sourceOf(sourceId);
  const landed = parseAmountText(amount);
  const late = check.ok && check.input.receivedDate > check.input.expectedDate ? daysBetween(check.input.expectedDate, check.input.receivedDate) : 0;
  const title = start.kind === "edit" ? "Edit payment" : start.kind === "receive" ? "Mark received" : "Record income";

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={title}
      subtitle={start.kind === "receive" ? `${source?.alias || source?.name || "A source"} · expected ${formatShortDate(start.expectedDate)}` : start.kind === "edit" ? `${source?.alias || source?.name || "A payment"}${editing?.fromStatement ? " · read from a statement" : ""}` : "Money that landed: a salary, interest, a dividend, a one-off"}
      preview={
        <PreviewPanel caption="An income entry records income only. Account balances are updated on the Accounts page.">
          <div className="flex flex-col gap-3 rounded-[16px] bg-fill p-4">
            <span className="flex items-center gap-3">
              {source && <SourceIcon icon={source.icon} name={source.alias || source.name} colorKey={cardColorKey(source.color)} size={40} />}
              <span className="min-w-0">
                <b className="block truncate text-[15px] font-extrabold">{source ? source.alias || source.name : "Choose a source"}</b>
                <span className="text-xs font-semibold text-muted">{TAG_LABELS[tag as keyof typeof TAG_LABELS] ?? tag}</span>
              </span>
            </span>
            <b className="text-2xl font-extrabold tabular-nums">{landed ? formatInr(landed) : "₹—"}</b>
            <span className="text-xs font-semibold text-muted">
              {receivedDate ? `Landed ${formatShortDate(receivedDate)}` : "When it landed"}
              {late > 3 ? ` · ${late} days after expected, so it counts as late` : late > 0 ? ` · ${late} ${late === 1 ? "day" : "days"} after expected` : ""}
            </span>
          </div>
        </PreviewPanel>
      }
      footerNote={
        editing && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete payment
          </button>
        ) : (
          <span className="max-md:hidden">You can undo it for a few seconds after saving.</span>
        )
      }
      primaryLabel={start.kind === "edit" ? "Save changes" : start.kind === "receive" ? "Mark received" : "Record income"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field id="incomeSourceId" label="Source" required error={errors.incomeSourceId}>
            <SelectInput id="incomeSourceId" name="incomeSourceId" invalid={Boolean(errors.incomeSourceId)} options={forms.sources.map((s) => ({ value: s.id, label: `${s.alias || s.name}${s.status === "Active" ? "" : " (inactive)"}`, swatch: { background: `var(--card-${cardColorKey(s.color)})` } }))} value={sourceId} onChange={chooseSource} placeholder="Choose where it came from" />
          </Field>
        </div>
        <Field id="receivedDate" label="Landed on" required error={errors.receivedDate}>
          <DateInput {...describedBy("receivedDate", errors.receivedDate, false)} label="Landed on" name="receivedDate" value={receivedDate} onChange={setReceivedDate} onBlur={() => reveal("receivedDate")} today={forms.today} invalid={Boolean(errors.receivedDate)} />
        </Field>
        <Field id="amount" label="Amount" required error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, false)} data-autofocus name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        <Field id="expectedDate" label="Expected on" help="Optional. The payday it's for; blank is the day it landed." error={errors.expectedDate}>
          <DateInput {...describedBy("expectedDate", errors.expectedDate, true)} label="Expected on" name="expectedDate" value={expectedDate} onChange={setExpectedDate} onBlur={() => reveal("expectedDate")} today={forms.today} invalid={Boolean(errors.expectedDate)} />
        </Field>
        <Field id="accountId" label="Landed in" help="Optional." error={errors.accountId}>
          <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={[{ value: "", label: "Not set", quiet: true }, ...forms.accounts.map((a) => ({ value: a.id, label: a.name }))]} value={accountId} onChange={setAccountId} placeholder="Not set" />
        </Field>
        <div className="md:col-span-2">
          <Segmented name="tag" legend="Kind" required options={INCOME_TAGS.map((t) => ({ value: t, label: TAG_LABELS[t] }))} value={tag as (typeof INCOME_TAGS)[number]} onChange={setTag} help="Regular is on a schedule; a bonus is variable pay on top; one-off is once." error={errors.tag} />
        </div>
      </div>
    </FormDialog>
  );
}
