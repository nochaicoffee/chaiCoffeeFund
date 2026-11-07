"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { markLentLoanRepaid } from "@/app/lent/loanActions";
import type { LentFormsData, LentLoanForm } from "@/app/lent/formsData";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readRepaidForm } from "@/lib/forms/lentForms";
import type { LentRepayment } from "@/lib/sheets/types";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, PreviewPanel, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";

/** Mark a loan repaid (docs/design/lent-out.md, LeForms): the day the last of it came back. From that day it owes nothing and earns nothing. */
export function RepaidDialog({ forms, loan, onClose, onSaved }: { forms: LentFormsData; loan: LentLoanForm; onClose: () => void; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(markLentLoanRepaid, IDLE);
  const [closedDate, setClosedDate] = useState(forms.today);
  const own: LentRepayment[] = forms.repayments.filter((r) => r.loanId === loan.id).map((r) => ({ id: r.id, lentLoanId: r.loanId, date: r.date, amount: r.amount, kind: r.kind }));
  // Principal not recorded as back: marking the loan repaid counts it as back, so the dialog says so.
  const notRecorded = Math.max(0, loan.principalAmount - own.filter((r) => r.kind === "Principal").reduce((t, r) => t + r.amount, 0));
  const values = { closedDate };
  const check = readRepaidForm(values, loan, own, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved();
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <FormDialog
      icon={<CheckIcon />}
      title="Mark this loan repaid?"
      subtitle={`${loan.borrowerName} · lent ${formatDate(loan.startDate)}`}
      preview={
        <PreviewPanel caption={`A repaid loan owes nothing and stops earning from the day it was paid back in full. You can reopen it later.${notRecorded > 0 ? ` ${formatInr(notRecorded)} of the principal isn't recorded as back yet. Marking the loan repaid counts it as back as of that day, without a repayment row.` : ""}`}>
          <SummaryBox
            rows={[
              { label: "Lent", value: formatInr(loan.principalAmount) },
              ...(notRecorded > 0 ? [{ label: "Not recorded as back", value: formatInr(notRecorded) }] : []),
              { label: "Owes after", value: "₹0" },
              { label: "Stops earning", value: closedDate ? formatDate(closedDate) : "—" },
            ]}
          />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">Reopen it from the loan&apos;s menu.</span>}
      primaryLabel="Mark repaid"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="id" value={loan.id} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <Field id="closedDate" label="Paid back in full on" required error={errors.closedDate}>
        <DateInput {...describedBy("closedDate", errors.closedDate, false)} data-autofocus label="Paid back in full on" name="closedDate" value={closedDate} onChange={setClosedDate} onBlur={() => reveal("closedDate")} today={forms.today} invalid={Boolean(errors.closedDate)} />
      </Field>
    </FormDialog>
  );
}
