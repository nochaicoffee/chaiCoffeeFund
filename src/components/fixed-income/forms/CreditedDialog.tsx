"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveEpfCredited } from "@/app/fixed-income/epfFormActions";
import type { EpfFormsData } from "@/app/fixed-income/epfFormsData";
import { entriesOfAccount, epfInterestForYear, financialYearEnd, financialYearOf } from "@/lib/aggregate/epf";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { readCreditedForm } from "@/lib/forms/epfForms";
import { IDLE } from "@/lib/forms/formState";
import type { EpfEntry } from "@/lib/sheets/types";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";

const KINDS = [
  { value: "Interest", label: "Interest" },
  { value: "Opening", label: "Opening balance" },
] as const;

/**
 * Add what EPFO credited (FiForms): a year's interest, or the balance a first statement starts from, typed when the passbook
 * isn't to hand. The difference from the rule is shown and never overwrites what was credited. Also Edit, for a typed one.
 */
export function CreditedDialog({ forms, entry, onClose, onSaved, onDelete }: { forms: EpfFormsData; entry?: EpfEntry; onClose: () => void; onSaved: (undo?: { id: string; message: string }) => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveEpfCredited, IDLE);
  const [accountId, setAccountId] = useState(entry?.epfAccountId ?? forms.accounts[0]?.id ?? "");
  const account = forms.accounts.find((a) => a.id === accountId);
  const [kind, setKind] = useState<"Interest" | "Opening">(entry?.kind === "Opening" ? "Opening" : "Interest");
  // The years that have ended and have no interest yet (or the one being edited).
  const years = (account?.years ?? []).filter((y) => financialYearEnd(y.financialYear) <= forms.today && (y.editable || (entry && financialYearOf(entry.date) === y.financialYear)));
  const [year, setYear] = useState(entry?.kind === "Interest" ? financialYearOf(entry.date) : (years.at(-1)?.financialYear ?? ""));
  const [date, setDate] = useState(entry?.kind === "Opening" ? entry.date : "");
  const [employee, setEmployee] = useState(entry ? String(entry.employee) : "");
  const [employer, setEmployer] = useState(entry ? String(entry.employer) : "");
  const [pension, setPension] = useState(entry ? String(entry.pension || "") : "");
  const showPension = forms.entries.some((e) => e.pension !== 0) || Boolean(entry?.pension);

  const values = { epfAccountId: accountId, kind, financialYear: year, date, employee, employer, pension };
  const check = readCreditedForm(values, { accountIds: forms.accounts.map((a) => a.id), entries: forms.entries, editingId: entry?.id }, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const typed = (parseAmountText(employee) ?? 0) + (parseAmountText(employer) ?? 0) + (parseAmountText(pension) ?? 0);
  // The rule at the year's rate, from the account's other entries (not this year's own interest).
  const row = years.find((y) => y.financialYear === year);
  const others = entriesOfAccount(forms.entries, accountId).filter((e) => !(e.kind === "Interest" && financialYearOf(e.date) === year));
  const rule = kind === "Interest" && row?.ratePercent ? epfInterestForYear(others, year, row.ratePercent).total : null;

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={entry ? "Edit what EPFO credited" : "Add what EPFO credited"}
      subtitle="For a year's interest, or an opening balance, when you don't have the passbook to import."
      preview={
        <PreviewPanel caption="A difference is shown, never hidden, and what was credited always wins.">
          <SummaryBox
            rows={
              kind === "Interest"
                ? [
                    { label: "Year", value: year ? `FY ${year}` : "—" },
                    { label: "Total credited", value: formatInr(typed) },
                    ...(rule !== null ? [{ label: "The rule gave", value: `≈ ${formatInr(rule)}` }, { label: "Difference", value: formatInr(typed - rule) }] : [{ label: "The rule", value: "no rate known" }]),
                  ]
                : [
                    { label: "As at", value: date ? formatDate(date) : "—" },
                    { label: "Balance", value: formatInr(typed) },
                  ]
            }
          />
        </PreviewPanel>
      }
      footerNote={
        entry && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete this
          </button>
        ) : (
          <span className="max-md:hidden">Typed, so marked less certain until the passbook is imported.</span>
        )
      }
      primaryLabel={entry ? "Save changes" : "Add"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        {forms.accounts.length > 1 ? (
          <div className="md:col-span-2">
            <Field id="epfAccountId" label="Account" required error={errors.epfAccountId}>
              <SelectInput id="epfAccountId" name="epfAccountId" invalid={Boolean(errors.epfAccountId)} options={forms.accounts.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} placeholder="Choose the account" />
            </Field>
          </div>
        ) : (
          <input type="hidden" name="epfAccountId" value={accountId} />
        )}
        <div className="md:col-span-2">
          {entry ? (
            <input type="hidden" name="kind" value={kind} />
          ) : (
            <Segmented name="kind" legend="What" required options={KINDS} value={kind} onChange={setKind} help="An opening balance is for a first statement that starts above zero." error={errors.kind} />
          )}
        </div>
        {kind === "Interest" ? (
          <Field id="financialYear" label="Financial year" required error={errors.financialYear} help={years.length === 0 ? "Every year that has ended already has its interest." : "Credited on 31 March of the year's end."}>
            <SelectInput id="financialYear" name="financialYear" invalid={Boolean(errors.financialYear)} options={years.map((y) => ({ value: y.financialYear, label: `FY ${y.financialYear}` }))} value={year} onChange={setYear} placeholder="Choose the year" />
          </Field>
        ) : (
          <Field id="date" label="As at" required error={errors.date}>
            <DateInput {...describedBy("date", errors.date, false)} label="As at" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
          </Field>
        )}
        <span className="max-md:hidden" />
        <Field id="employee" label="Employee share" required error={errors.employee}>
          <MoneyInput {...describedBy("employee", errors.employee, false)} data-autofocus name="employee" value={employee} onChange={(e) => setEmployee(e.target.value)} onBlur={() => reveal("employee")} invalid={Boolean(errors.employee)} />
        </Field>
        <Field id="employer" label="Employer share" required error={errors.employer}>
          <MoneyInput {...describedBy("employer", errors.employer, false)} name="employer" value={employer} onChange={(e) => setEmployer(e.target.value)} onBlur={() => reveal("employer")} invalid={Boolean(errors.employer)} />
        </Field>
        {showPension && (
          <Field id="pension" label="Pension share" error={errors.pension}>
            <MoneyInput {...describedBy("pension", errors.pension, false)} name="pension" value={pension} onChange={(e) => setPension(e.target.value)} onBlur={() => reveal("pension")} invalid={Boolean(errors.pension)} />
          </Field>
        )}
      </div>
    </FormDialog>
  );
}
