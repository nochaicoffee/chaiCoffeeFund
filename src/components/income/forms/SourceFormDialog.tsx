"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveSource } from "@/app/income/actions";
import type { FormSource, IncomeFormsData } from "@/app/income/views";
import { monthlyEquivalentIncome } from "@/lib/aggregate/income";
import { cardColorKey, colorGradient, freeColor } from "@/lib/format/colors";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { INCOME_CATEGORIES, INCOME_FREQUENCIES, readSourceForm } from "@/lib/forms/incomeForms";
import { CARD_COLORS, INCOME_ICONS, type CardColor, type IncomeFrequency, type IncomeIcon } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ColorSwatches } from "../../shell/ColorSwatches";
import { SourceIcon } from "../SourceIcon";

const usualOf = (s: Pick<FormSource, "expectedAmount" | "frequency" | "status">) => monthlyEquivalentIncome({ expectedAmount: s.expectedAmount, frequency: s.frequency, status: s.status } as Parameters<typeof monthlyEquivalentIncome>[0]);

/**
 * Add source, and Edit source when given one (IncomeZForms): the source's block is the live preview, with what a
 * usual month becomes. "Next expected" is a day it's due; its schedule counts from it both ways, so pending and
 * upcoming payments are worked out from it (PRD §8). The statement text lets the statement sync record it (#187).
 * Edit can mark it inactive, and offers Delete.
 */
export function SourceFormDialog({ source, forms, onClose, onDelete }: { source?: FormSource; forms: IncomeFormsData; onClose: () => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveSource, IDLE);
  const editing = Boolean(source);
  const [name, setName] = useState(source?.name ?? "");
  const [alias, setAlias] = useState(source && source.alias !== source.name ? source.alias : "");
  const [category, setCategory] = useState<string>(source?.category ?? "Salary");
  const [frequency, setFrequency] = useState<string>(source?.frequency ?? "Monthly");
  const [amount, setAmount] = useState(source ? String(source.expectedAmount) : "");
  const [scheduleDate, setScheduleDate] = useState(source?.nextExpected ?? "");
  const [color, setColor] = useState<string>(source?.color ?? freeColor(forms.sources.filter((s) => s.status === "Active").map((s) => s.color), ["Emerald"]));
  const [icon, setIcon] = useState<string>(source?.icon ?? "");
  const [accountId, setAccountId] = useState(source?.accountId ?? "");
  const [statementMatch, setStatementMatch] = useState(source?.statementMatch ?? "");
  const [status, setStatus] = useState<string>(source?.status ?? "Active");

  const values = { name, alias, category, frequency, expectedAmount: amount, scheduleDate, color, icon, accountId, statementMatch, status };
  const check = readSourceForm(values, { accountIds: forms.accounts.map((a) => a.id) }, editing);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }

  const usual = parseAmountText(amount) ?? 0;
  const monthly = usualOf({ expectedAmount: usual, frequency: frequency as IncomeFrequency, status: status as FormSource["status"] });
  const others = forms.sources.filter((s) => s.id !== source?.id).reduce((t, s) => t + usualOf(s), 0);
  const label = (alias || name).trim() || "New source";

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={editing ? "Edit source" : "Add source"}
      subtitle={editing ? source!.name : "Something that pays you: a salary, interest, dividends, a one-off"}
      preview={
        <PreviewPanel caption="How it looks on the Income page. It updates as you type.">
          <div className="relative isolate flex h-[150px] flex-col justify-between overflow-hidden rounded-[18px] p-4 text-on-card" style={{ background: colorGradient(cardColorKey(color as CardColor)) }}>
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <b className="block truncate text-[15px] font-extrabold">{label}</b>
                <span className="text-[11px] font-semibold text-on-card-muted">
                  {category} · {frequency}
                </span>
              </span>
              <SourceIcon icon={(icon || undefined) as IncomeIcon | undefined} name={label} colorKey={cardColorKey(color as CardColor)} size={30} />
            </span>
            <b className="text-xl font-extrabold tabular-nums">{usual ? formatInr(usual) : "₹—"}</b>
          </div>
          <dl className="flex flex-col gap-1.5 rounded-[14px] bg-fill px-3.5 py-3 text-[12.5px] font-semibold">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">A month&apos;s worth</dt>
              <dd className="tabular-nums">{frequency === "One-Time" ? "none: it pays once" : formatInr(monthly)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">A usual month becomes</dt>
              <dd className="font-extrabold tabular-nums">{formatInr(others + monthly)}</dd>
            </div>
          </dl>
          <ColorSwatches colors={CARD_COLORS} value={color} onChange={setColor} error={errors.color} />
        </PreviewPanel>
      }
      footerNote={
        editing && onDelete ? (
          <span className="flex items-center gap-2">
            <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Delete source
            </button>
            <span className="max-md:hidden">
              Removes it and its {source!.entries} {source!.entries === 1 ? "payment" : "payments"}. To keep them, mark it inactive.
            </span>
          </span>
        ) : (
          <span className="max-md:hidden">Payments it owes are worked out from Next expected; nothing is written until money lands.</span>
        )
      }
      primaryLabel={editing ? "Save changes" : "Add source"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {source && <input type="hidden" name="id" value={source.id} />}
      <input type="hidden" name="icon" value={icon} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <Segmented name="category" legend="What it is" required options={INCOME_CATEGORIES.map((c) => ({ value: c, label: c }))} value={category as (typeof INCOME_CATEGORIES)[number]} onChange={setCategory} error={errors.category} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          <TextInput {...describedBy("name", errors.name, false)} data-autofocus name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} placeholder="e.g. NetApp Salary" />
        </Field>
        <Field id="alias" label="Short name" help="Optional. Shown on the cover and in the tables." error={errors.alias}>
          <TextInput {...describedBy("alias", errors.alias, true)} name="alias" value={alias} onChange={(e) => setAlias(e.target.value)} invalid={Boolean(errors.alias)} placeholder={name || "e.g. Salary"} />
        </Field>
        <Field id="frequency" label="How often" required error={errors.frequency}>
          <SelectInput id="frequency" name="frequency" invalid={Boolean(errors.frequency)} options={INCOME_FREQUENCIES.map((f) => ({ value: f, label: f === "One-Time" ? "Once" : f }))} value={frequency} onChange={setFrequency} placeholder="Choose" />
        </Field>
        <Field id="expectedAmount" label="Usual amount" required help="What a payment usually is." error={errors.expectedAmount}>
          <MoneyInput {...describedBy("expectedAmount", errors.expectedAmount, true)} name="expectedAmount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("expectedAmount")} invalid={Boolean(errors.expectedAmount)} />
        </Field>
        <Field id="scheduleDate" label={frequency === "One-Time" ? "Expected on" : "Next expected"} required help={frequency === "One-Time" ? "The day it should land." : "The next day it should land; the schedule counts from it."} error={errors.scheduleDate}>
          <DateInput {...describedBy("scheduleDate", errors.scheduleDate, true)} label="Next expected" name="scheduleDate" value={scheduleDate} onChange={setScheduleDate} onBlur={() => reveal("scheduleDate")} today={forms.today} invalid={Boolean(errors.scheduleDate)} />
        </Field>
        <Field id="accountId" label="Lands in" help="Optional." error={errors.accountId}>
          <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={[{ value: "", label: "Not set", quiet: true }, ...forms.accounts.map((a) => ({ value: a.id, label: a.name }))]} value={accountId} onChange={setAccountId} placeholder="Not set" />
        </Field>
        <div className="md:col-span-2">
          <Field id="statementMatch" label="Statement text" help="Optional. Text in the bank statement line that marks this income, like NETAPP. The statement sync then records it for you." error={errors.statementMatch}>
            <TextInput {...describedBy("statementMatch", errors.statementMatch, true)} name="statementMatch" value={statementMatch} onChange={(e) => setStatementMatch(e.target.value)} onBlur={() => reveal("statementMatch")} invalid={Boolean(errors.statementMatch)} placeholder="e.g. NETAPP" />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2 md:col-span-2">
          <legend className="mb-2 text-xs font-bold text-fg">Icon</legend>
          <div className="flex flex-wrap gap-2">
            {INCOME_ICONS.map((i) => (
              <button key={i} type="button" aria-pressed={icon === i} aria-label={i} onClick={() => setIcon(icon === i ? "" : i)} className="rounded-[10px] p-0.5 ring-offset-2 ring-offset-surface focus-visible:outline-2 focus-visible:outline-accent aria-pressed:ring-2 aria-pressed:ring-accent">
                <SourceIcon icon={i} name={i} colorKey={cardColorKey(color as CardColor)} size={34} />
              </button>
            ))}
          </div>
          {errors.icon && <p className="text-xs font-semibold text-negative">{errors.icon}</p>}
        </fieldset>
        {editing && (
          <div className="md:col-span-2">
            <Segmented name="status" legend="Status" options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }]} value={status as "Active" | "Inactive"} onChange={setStatus} help="Inactive keeps it and its payments, but nothing is expected from it." error={errors.status} />
          </div>
        )}
      </div>
    </FormDialog>
  );
}
