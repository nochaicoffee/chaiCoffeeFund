"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveCheckIn } from "@/app/accounts/actions";
import type { AccountsFormsData } from "@/app/accounts/views";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { readCheckInForm } from "@/lib/forms/accountForms";
import { IDLE } from "@/lib/forms/formState";
import { DateInput, Field, MoneyInput, PreviewPanel, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { MiniAccountCard } from "./MiniAccountCard";

/**
 * Update balances, the monthly check-in: every open account at once for one day, the stale
 * ones first. Blank ones are left alone. The preview shows what everything adds up to.
 */
export function CheckInDialog({ forms, onClose }: { forms: AccountsFormsData; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveCheckIn, IDLE);
  const accounts = forms.accounts.filter((a) => !a.closed).sort((a, b) => Number(b.stale) - Number(a.stale));
  const [date, setDate] = useState(forms.today);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const values: Record<string, string> = { date, ...Object.fromEntries(Object.entries(typed).map(([id, v]) => [`balance:${id}`, v])) };
  const check = readCheckInForm(values, { accountIds: accounts.map((a) => a.id) }, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  // What everything adds up to: each account's typed balance, else what it holds now.
  const total = accounts.reduce((sum, a) => sum + (parseAmountText(typed[a.id] ?? "") ?? a.balance ?? 0), 0);

  return (
    <FormDialog
      icon={<span className="text-sm font-extrabold">₹</span>}
      title="Update balances"
      subtitle="The monthly check-in: type what each account holds"
      preview={
        <PreviewPanel>
          <MiniAccountCard colorKey="emerald" initial="∑" name="All accounts" balance={total} note={`${accounts.length} accounts`} />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">Leave an account blank to leave it as it is.</span>}
      primaryLabel="Save balances"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {(errors.form || (state.status === "invalid" && state.errors.form)) && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {errors.form ?? (state.status === "invalid" ? state.errors.form : "")}
        </p>
      )}
      <Field id="date" label="Read on" required error={errors.date}>
        <DateInput {...describedBy("date", errors.date, false)} label="Read on" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
      </Field>
      <div className="flex flex-col gap-3">
        {accounts.map((a, i) => (
          <Field key={a.id} id={`balance-${a.id}`} label={`${a.name}${a.stale ? " · not read lately" : ""}`} help={a.balance === null ? "No balance yet" : `Now ${formatInr(a.balance)}`} error={errors[`balance:${a.id}`]}>
            <MoneyInput {...describedBy(`balance-${a.id}`, errors[`balance:${a.id}`], true)} data-autofocus={i === 0 ? true : undefined} name={`balance:${a.id}`} value={typed[a.id] ?? ""} onChange={(e) => setTyped({ ...typed, [a.id]: e.target.value })} onBlur={() => reveal(`balance:${a.id}`)} invalid={Boolean(errors[`balance:${a.id}`])} />
          </Field>
        ))}
      </div>
    </FormDialog>
  );
}
