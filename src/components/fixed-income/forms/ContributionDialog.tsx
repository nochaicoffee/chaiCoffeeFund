"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveEpfContribution } from "@/app/fixed-income/epfFormActions";
import type { EpfFormsData } from "@/app/fixed-income/epfFormsData";
import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { readContributionForm } from "@/lib/forms/epfForms";
import { IDLE } from "@/lib/forms/formState";
import { wageMonthLabel } from "@/lib/epfStatement/reviewView";
import type { EpfEntry } from "@/lib/sheets/types";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";

/** The wage months to choose from: the last three years, newest first. */
export function wageMonthOptions(today: string): { value: string; label: string }[] {
  return Array.from({ length: 36 }, (_, i) => {
    const month = addMonthsUTC(`${today.slice(0, 7)}-01`, -i).slice(0, 7);
    return { value: month, label: wageMonthLabel(month) };
  });
}

const withCurrent = (options: { value: string; label: string }[], value: string) => (value && !options.some((o) => o.value === value) ? [...options, { value, label: wageMonthLabel(value) }] : options);

/**
 * Add a contribution (FiForms): a credit he is typing in because the passbook isn't to hand. It is saved as typed, counted in the
 * balance and marked less certain, and the passbook's row replaces it on import. Also Edit, for a typed one.
 */
export function ContributionDialog({ forms, entry, onClose, onSaved, onDelete }: { forms: EpfFormsData; entry?: EpfEntry; onClose: () => void; onSaved: (undo?: { id: string; message: string }) => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveEpfContribution, IDLE);
  const [accountId, setAccountId] = useState(entry?.epfAccountId ?? forms.accounts[0]?.id ?? "");
  const account = forms.accounts.find((a) => a.id === accountId);
  const next = account?.next;
  const [wageMonth, setWageMonth] = useState(entry?.wageMonth ?? next?.wageMonth ?? "");
  const [date, setDate] = useState(entry?.date ?? next?.date ?? forms.today);
  const [employee, setEmployee] = useState(entry ? String(entry.employee) : next ? String(next.employee) : "");
  const [employer, setEmployer] = useState(entry ? String(entry.employer) : next ? String(next.employer) : "");
  const [pension, setPension] = useState(entry ? String(entry.pension || "") : next?.pension ? String(next.pension) : "");
  const showPension = forms.entries.some((e) => e.pension !== 0) || Boolean(entry?.pension);

  const values = { epfAccountId: accountId, wageMonth, date, employee, employer, pension };
  const check = readContributionForm(values, { accountIds: forms.accounts.map((a) => a.id), entries: forms.entries, editingId: entry?.id }, forms.today);
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

  const total = (parseAmountText(employee) ?? 0) + (parseAmountText(employer) ?? 0) + (parseAmountText(pension) ?? 0);
  const before = (account?.balance ?? 0) - (entry && entry.epfAccountId === accountId && entry.date <= forms.today ? entry.employee + entry.employer : 0);

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={entry ? "Edit contribution" : "Add a contribution"}
      subtitle={entry ? `${wageMonthLabel(entry.wageMonth ?? "")} · typed` : "For when you don't have the passbook yet. It's marked as typed, not from EPFO."}
      preview={
        <PreviewPanel caption="A typed credit is marked as less certain. The passbook's row replaces it when you import the passbook that has it, so nothing is counted twice.">
          <SummaryBox
            rows={[
              { label: "Wage month", value: wageMonth ? wageMonthLabel(wageMonth) : "—" },
              { label: "Credited", value: formatInr(total) },
              { label: "Balance after", value: formatInr(before + total) },
              ...(date ? [{ label: "Credited on", value: formatDate(date) }] : []),
            ]}
          />
        </PreviewPanel>
      }
      footerNote={
        entry && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete this credit
          </button>
        ) : (
          <span className="max-md:hidden">You can undo it for a few seconds after saving.</span>
        )
      }
      primaryLabel={entry ? "Save changes" : "Add contribution"}
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
        <Field id="wageMonth" label="Wage month" required error={errors.wageMonth}>
          <SelectInput id="wageMonth" name="wageMonth" invalid={Boolean(errors.wageMonth)} options={withCurrent(wageMonthOptions(forms.today), wageMonth)} value={wageMonth} onChange={setWageMonth} placeholder="Choose the month" />
        </Field>
        <Field id="date" label="Credited on" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} label="Credited on" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
        </Field>
        <Field id="employee" label="Employee share" required error={errors.employee}>
          <MoneyInput {...describedBy("employee", errors.employee, false)} data-autofocus name="employee" value={employee} onChange={(e) => setEmployee(e.target.value)} onBlur={() => reveal("employee")} invalid={Boolean(errors.employee)} />
        </Field>
        <Field id="employer" label="Employer share" required help="The employer's is the same unless the passbook says otherwise." error={errors.employer}>
          <MoneyInput {...describedBy("employer", errors.employer, true)} name="employer" value={employer} onChange={(e) => setEmployer(e.target.value)} onBlur={() => reveal("employer")} invalid={Boolean(errors.employer)} />
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
