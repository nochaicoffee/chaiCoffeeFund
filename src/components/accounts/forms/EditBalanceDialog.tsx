"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveBalanceEdit } from "@/app/accounts/actions";
import type { AccountsFormsData, HistoryRow } from "@/app/accounts/views";
import { parseAmountText } from "@/lib/format/money";
import { readEditBalanceForm } from "@/lib/forms/accountForms";
import { IDLE } from "@/lib/forms/formState";
import { DateInput, Field, MoneyInput, PreviewPanel, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { MiniAccountCard } from "./MiniAccountCard";

/** Editing one balance from Balance history: its day and amount, or delete it. */
export function EditBalanceDialog({ row, amount, forms, onDelete, onClose }: { row: HistoryRow; amount: number; forms: AccountsFormsData; onDelete: () => void; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(saveBalanceEdit, IDLE);
  const account = forms.accounts.find((a) => a.id === row.accountId);
  const [date, setDate] = useState(row.date);
  const [balance, setBalance] = useState(amount.toLocaleString("en-IN"));
  const values = { id: row.id, date, balance };
  const check = readEditBalanceForm(values, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  return (
    <FormDialog
      icon={<span className="text-sm font-extrabold">✎</span>}
      title="Edit balance"
      subtitle={`${row.accountName} · ${row.dateText}`}
      preview={<PreviewPanel>{account && <MiniAccountCard colorKey={account.colorKey} initial={account.initial} name={account.name} last4={account.last4 || undefined} balance={parseAmountText(balance)} closed={account.closed} />}</PreviewPanel>}
      footerNote={
        <span className="flex items-center gap-2">
          <button type="button" onClick={onDelete} className="min-h-11 font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
            Delete balance
          </button>
        </span>
      }
      primaryLabel="Save changes"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="id" value={row.id} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="date" label="Read on" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} label="Read on" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
        </Field>
        <Field id="balance" label="Balance" required error={errors.balance}>
          <MoneyInput {...describedBy("balance", errors.balance, false)} data-autofocus name="balance" value={balance} onChange={(e) => setBalance(e.target.value)} onBlur={() => reveal("balance")} invalid={Boolean(errors.balance)} />
        </Field>
      </div>
    </FormDialog>
  );
}
