"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { recordRepayment } from "@/app/lent/loanActions";
import type { LentFormsData, LentLoanForm } from "@/app/lent/formsData";
import { summariseLentLoan } from "@/lib/aggregate/lentOut";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readRepaymentForm } from "@/lib/forms/lentForms";
import type { LentLoan, LentRepayment } from "@/lib/sheets/types";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";

const KINDS = [
  { value: "Principal", label: "Principal" },
  { value: "Interest", label: "Interest" },
] as const;

const toLoan = (l: LentLoanForm): LentLoan => ({
  id: l.id, borrowerName: l.borrowerName, principalAmount: l.principalAmount, startDate: l.startDate, interestMode: l.interestMode,
  ...(l.interestRate !== undefined && { interestRate: l.interestRate }), ...(l.payoutFrequency && { payoutFrequency: l.payoutFrequency }),
  ...(l.payoutAmount !== undefined && { payoutAmount: l.payoutAmount }), status: l.status, ...(l.closedDate && { closedDate: l.closedDate }),
});

/**
 * Record money that came back on a loan (docs/design/lent-out.md, LeForms): principal, or an Accruing loan's interest. Principal above what
 * is out, or interest above what is owed, is a warning, not a block: the form says so, and "Record it anyway" sends it again. Interest on a
 * paid-out loan is refused, since it arrives through Income.
 */
export function RepaymentDialog({ forms, loanId, onClose, onSaved }: { forms: LentFormsData; loanId?: string; onClose: () => void; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(recordRepayment, IDLE);
  const open = forms.loans.filter((l) => l.status === "Active");
  const [chosen, setChosen] = useState(loanId ?? open[0]?.id ?? "");
  const loan = forms.loans.find((l) => l.id === chosen);
  const [kind, setKind] = useState<"Principal" | "Interest">("Principal");
  const [date, setDate] = useState(forms.today);
  const [amount, setAmount] = useState("");
  const payout = loan?.interestMode === "Paid-out";
  const effectiveKind = payout ? "Principal" : kind;

  const values: Record<string, string> = { lentLoanId: chosen, kind: effectiveKind, date, amount, confirmed: "1" };
  // A warning doesn't block the send (the server asks, and "Record it anyway" answers), so the check runs as if confirmed.
  const own: LentRepayment[] = forms.repayments.filter((r) => r.loanId === chosen).map((r) => ({ id: r.id, lentLoanId: r.loanId, date: r.date, amount: r.amount, kind: r.kind }));
  const check = loan ? readRepaymentForm(values, toLoan(loan), own, forms.today) : ({ ok: false, errors: { lentLoanId: "Choose a loan" } } as const);
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

  // The server's warning is shown apart from the errors, in amber, with the way through.
  const warning = state.status === "invalid" && state.overridable ? state.errors.amount : undefined;
  const shownErrors = warning ? { ...errors, amount: undefined as unknown as string } : errors;

  const entered = parseAmountText(amount);
  const loanForMath = loan ? toLoan(loan) : null;
  const before = loanForMath ? summariseLentLoan(loanForMath, own, forms.today) : null;
  const after = loanForMath && entered && date ? summariseLentLoan(loanForMath, [...own, { id: "new", lentLoanId: loanForMath.id, date, amount: entered, kind: effectiveKind }], forms.today) : null;

  return (
    <FormDialog
      icon={<CheckIcon />}
      title="Record a repayment"
      subtitle={loan ? `${loan.borrowerName} · money that came back` : "Money that came back."}
      preview={
        <PreviewPanel caption="Principal that comes back stops earning from the day it is paid. Interest paid is taken off what is owed. Nothing changes any bank balance: update balances on the Accounts page.">
          <SummaryBox
            rows={[
              { label: "Owed today", value: before ? formatInr(Math.round(before.owedToday)) : "—" },
              { label: "After this", value: after ? formatInr(Math.round(after.owedToday)) : "—" },
              ...(after && loan?.interestMode === "Accruing" ? [{ label: "Interest still owed", value: formatInr(Math.round(after.interestOwed)) }] : []),
            ]}
          />
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">You can take a repayment back from Money back.</span>}
      primaryLabel="Record repayment"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="lentLoanId" value={chosen} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        {!loanId && (
          <Field id="loan" label="Loan" required error={shownErrors.lentLoanId}>
            <SelectInput id="loan" invalid={Boolean(shownErrors.lentLoanId)} options={open.map((l) => ({ value: l.id, label: l.borrowerName }))} value={chosen} onChange={setChosen} />
          </Field>
        )}
        <div className={loanId ? "md:col-span-2" : ""}>
          <Segmented name="kind" legend="What came back" required options={KINDS} value={effectiveKind} onChange={setKind} help={payout ? "A paid-out loan's interest arrives through Income, so only principal is recorded here." : undefined} error={shownErrors.kind} />
        </div>
        <Field id="date" label="Came back on" required error={shownErrors.date}>
          <DateInput {...describedBy("date", shownErrors.date, false)} data-autofocus label="Came back on" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(shownErrors.date)} />
        </Field>
        <Field id="amount" label="Amount" required error={shownErrors.amount}>
          <MoneyInput {...describedBy("amount", shownErrors.amount, false)} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(shownErrors.amount)} />
        </Field>
      </div>
      {warning && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[12px] bg-warning-tint px-3.5 py-2.5 text-xs font-semibold text-warning-text">
          <span className="min-w-0 flex-1">{warning}. Record it anyway?</span>
          <button type="submit" name="confirmed" value="1" className="min-h-9 rounded-full bg-surface px-4 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
            Record it anyway
          </button>
        </div>
      )}
    </FormDialog>
  );
}
