"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { closeDeposit } from "@/app/fixed-income/depositActions";
import type { DepositFormsData, DepositRow } from "@/app/fixed-income/depositFormsData";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { readCloseForm } from "@/lib/forms/depositForms";
import { IDLE } from "@/lib/forms/formState";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";

/**
 * Close a deposit (FiForms): what reached his account and the day. Whether it matured or was closed early follows from the day, so it
 * can't disagree with the dates. It doesn't change any account's balance: balances are updated on the Accounts page.
 */
export function CloseDepositDialog({ forms, deposit, onClose, onSaved }: { forms: DepositFormsData; deposit: DepositRow; onClose: () => void; onSaved: (undo?: { id: string; message: string }) => void }) {
  const [state, formAction, pending] = useActionState(closeDeposit, IDLE);
  // Matured: what the bank pays (its figure, else the estimate). Early: what it is worth today, which he corrects to what the bank paid.
  const suggested = Math.round(deposit.due ? deposit.expectedAtMaturity : deposit.worth);
  const [received, setReceived] = useState(String(suggested));
  const [closedDate, setClosedDate] = useState(deposit.due ? (deposit.maturityDate <= forms.today ? deposit.maturityDate : forms.today) : forms.today);

  const values = { receivedAmount: received, closedDate };
  const check = readCloseForm(values, deposit, forms.today);
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

  const got = parseAmountText(received);
  const kind = closedDate && closedDate >= deposit.maturityDate ? "At maturity" : "Early (pre-closed)";

  return (
    <FormDialog
      icon={<CheckIcon />}
      title="Close this deposit?"
      subtitle={`${deposit.name} · ${deposit.due ? `matured ${formatDate(deposit.maturityDate)}` : `matures ${formatDate(deposit.maturityDate)}`}`}
      preview={
        <PreviewPanel caption="A closed deposit moves to Matured and pre-closed. Closing one before it matures is recorded as pre-closed.">
          <SummaryBox
            rows={[
              { label: "Held by you", value: `${formatInr(Math.round(deposit.worth))} → ₹0` },
              deposit.compoundingType === "Cumulative"
                ? { label: "Interest earned, in all", value: got !== null ? formatInr(got - deposit.principalAmount) : "—" }
                : { label: "Interest", value: "paid out along the way" },
              { label: "Closes as", value: kind },
            ]}
          />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">You can undo for a few seconds.</span>}
      primaryLabel="Close deposit"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="id" value={deposit.id} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="receivedAmount" label="Money received" required help="What reached your account." error={errors.receivedAmount}>
          <MoneyInput {...describedBy("receivedAmount", errors.receivedAmount, true)} data-autofocus name="receivedAmount" value={received} onChange={(e) => setReceived(e.target.value)} onBlur={() => reveal("receivedAmount")} invalid={Boolean(errors.receivedAmount)} />
        </Field>
        <Field id="closedDate" label="Received on" required error={errors.closedDate}>
          <DateInput {...describedBy("closedDate", errors.closedDate, false)} label="Received on" name="closedDate" value={closedDate} onChange={setClosedDate} onBlur={() => reveal("closedDate")} today={forms.today} invalid={Boolean(errors.closedDate)} />
        </Field>
      </div>
    </FormDialog>
  );
}
