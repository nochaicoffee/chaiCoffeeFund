"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveLentLoan } from "@/app/lent/loanActions";
import type { LentFormsData, LentLoanForm } from "@/app/lent/formsData";
import { annualRatePercent, interestAccrued } from "@/lib/aggregate/lentOut";
import { firstPayoutDate } from "@/lib/aggregate/lentPromises";
import { freeColor } from "@/lib/format/colors";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { LENT_PAYOUT_FREQUENCIES, readLentLoanForm } from "@/lib/forms/lentForms";
import { CARD_COLORS, type LentLoan } from "@/lib/sheets/types";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ColorSwatches } from "../../shell/ColorSwatches";

const MODES = [
  { value: "Accruing", label: "Interest builds up" },
  { value: "Paid-out", label: "Paid out" },
] as const;

/**
 * Add a loan, or Edit one (docs/design/lent-out.md, LeForms). A loan whose interest builds up says its yearly rate; a paid-out loan says how
 * often it pays and how much, and its rate is worked out from that. Adding a paid-out loan can also set up its income source (ticked by
 * default), so its payouts are matched to the bank credit and the page can say which are late.
 */
export function LoanDialog({ forms, loan, onClose, onSaved, onDelete }: { forms: LentFormsData; loan?: LentLoanForm; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveLentLoan, IDLE);
  const [name, setName] = useState(loan?.borrowerName ?? "");
  const [principal, setPrincipal] = useState(loan ? String(loan.principalAmount) : "");
  const [startDate, setStartDate] = useState(loan?.startDate ?? forms.today);
  const [mode, setMode] = useState<"Accruing" | "Paid-out">(loan?.interestMode ?? "Accruing");
  const [rate, setRate] = useState(loan?.interestRate !== undefined ? String(loan.interestRate) : "");
  const [frequency, setFrequency] = useState<string>(loan?.payoutFrequency ?? "Monthly");
  const [payout, setPayout] = useState(loan?.payoutAmount !== undefined ? String(loan.payoutAmount) : "");
  // A new loan starts on a colour no other has; an edit keeps the one it was given, or none (worked out from its id).
  const [color, setColor] = useState<string>(loan ? (loan.colorChosen ? loan.color : "") : freeColor(forms.loans.map((l) => l.color)));
  // On a new loan the source is set up unless he unticks it; on an existing unlinked one it is only if he ticks it.
  const [withSource, setWithSource] = useState(!loan);
  const [statementMatch, setStatementMatch] = useState("");
  const [accountId, setAccountId] = useState("");

  const own = loan ? forms.repayments.filter((r) => r.loanId === loan.id) : [];
  const earliestRepayment = own.map((r) => r.date).sort()[0];
  const principalReturned = own.filter((r) => r.kind === "Principal").reduce((t, r) => t + r.amount, 0);
  const showSource = (!loan || !loan.linked) && mode === "Paid-out";
  const values: Record<string, string> = {
    borrowerName: name, principalAmount: principal, startDate, interestMode: mode, color,
    ...(mode === "Accruing" ? { interestRate: rate } : { payoutFrequency: frequency, payoutAmount: payout }),
    ...(showSource && withSource && { createIncomeSource: "1", statementMatch, accountId }),
  };
  const check = readLentLoanForm(values, { earliestRepayment, principalReturned: loan ? principalReturned : undefined }, forms.today);
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

  // What the preview says: the rate the terms work out to, what a loan whose interest builds up has earned so far, or when a paid-out loan pays first.
  const lent = parseAmountText(principal);
  const preview: LentLoan | null = check.ok ? { id: "preview", ...check.input, status: "Active" } : null;
  const ratePercent = preview ? annualRatePercent(preview) : null;
  const sofar = preview && preview.interestMode === "Accruing" ? interestAccrued(preview, [], forms.today) : null;
  const first = preview && preview.interestMode === "Paid-out" ? firstPayoutDate(preview) : undefined;

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={loan ? "Edit loan" : "Add a loan"}
      subtitle={loan ? loan.borrowerName : "Money you lent to someone, outside any bank."}
      preview={
        <PreviewPanel caption={mode === "Accruing" ? "Simple interest, never compounded: the principal still out × the rate × the days ÷ 365. Nothing is added to the principal." : "A payout loan's rate is worked out from what it pays. Its interest arrives as income, so only the principal counts as owed."}>
          <SummaryBox
            rows={[
              { label: "Lent", value: lent ? formatInr(lent) : "—" },
              { label: "Works out to", value: ratePercent !== null ? `${Number(ratePercent.toFixed(1))}% a year` : "—" },
              ...(sofar !== null ? [{ label: "Interest so far", value: formatInr(Math.round(sofar)) }] : []),
              ...(first ? [{ label: "First payout", value: formatDate(first) }] : []),
            ]}
          />
          <ColorSwatches colors={CARD_COLORS} value={color} onChange={setColor} error={errors.color} optional={Boolean(loan)} />
        </PreviewPanel>
      }
      footerNote={
        loan && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete loan
          </button>
        ) : (
          <span className="max-md:hidden">You can edit or delete it afterwards.</span>
        )
      }
      primaryLabel={loan ? "Save changes" : "Add loan"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {loan && <input type="hidden" name="id" value={loan.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="borrowerName" label="Borrower" required error={errors.borrowerName}>
          <TextInput {...describedBy("borrowerName", errors.borrowerName, false)} data-autofocus name="borrowerName" placeholder="Who has it" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("borrowerName")} invalid={Boolean(errors.borrowerName)} />
        </Field>
        <Field id="principalAmount" label="Amount lent" required error={errors.principalAmount}>
          <MoneyInput {...describedBy("principalAmount", errors.principalAmount, false)} name="principalAmount" value={principal} onChange={(e) => setPrincipal(e.target.value)} onBlur={() => reveal("principalAmount")} invalid={Boolean(errors.principalAmount)} />
        </Field>
        <Field id="startDate" label="Lent on" required error={errors.startDate}>
          <DateInput {...describedBy("startDate", errors.startDate, false)} label="Lent on" name="startDate" value={startDate} onChange={setStartDate} onBlur={() => reveal("startDate")} today={forms.today} invalid={Boolean(errors.startDate)} />
        </Field>
        <div className="md:col-span-2">
          <Segmented name="interestMode" legend="How the interest works" required options={MODES} value={mode} onChange={setMode} help={mode === "Accruing" ? "It builds up, and is paid with the principal whenever they pay." : "A fixed amount arrives every period, and the principal stays out until it is returned."} error={errors.interestMode} />
        </div>
        {mode === "Accruing" ? (
          <Field id="interestRate" label="Rate a year (%)" required help="Simple interest, like 12." error={errors.interestRate}>
            <TextInput {...describedBy("interestRate", errors.interestRate, true)} inputMode="decimal" name="interestRate" placeholder="12" value={rate} onChange={(e) => setRate(e.target.value)} onBlur={() => reveal("interestRate")} invalid={Boolean(errors.interestRate)} />
          </Field>
        ) : (
          <>
            <Field id="payoutAmount" label="Payout each time" required error={errors.payoutAmount}>
              <MoneyInput {...describedBy("payoutAmount", errors.payoutAmount, false)} name="payoutAmount" value={payout} onChange={(e) => setPayout(e.target.value)} onBlur={() => reveal("payoutAmount")} invalid={Boolean(errors.payoutAmount)} />
            </Field>
            <Field id="payoutFrequency" label="Paid every" required error={errors.payoutFrequency} help={loan?.linked ? "Its income source sets the schedule: change how often in Income." : undefined}>
              <SelectInput id="payoutFrequency" name="payoutFrequency" invalid={Boolean(errors.payoutFrequency)} options={LENT_PAYOUT_FREQUENCIES.map((f) => ({ value: f, label: f }))} value={frequency} onChange={setFrequency} />
            </Field>
          </>
        )}
        {showSource && (
          <div className="flex flex-col gap-3 rounded-[14px] bg-accent-tint px-4 py-3.5 md:col-span-2">
            <label className="flex items-start gap-2.5 text-[13px] font-bold text-accent-text">
              <input type="checkbox" checked={withSource} onChange={(e) => setWithSource(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
              <span>
                {loan ? "Set up an income source for this loan's payouts" : "Also set up an income source for this loan's payouts"}
                <small className="mt-0.5 block text-[11px] font-medium">So each payout is matched to the bank credit, shows in Income, and the page can tell when one is late. {loan ? "Until then nothing tracks them." : "Untick to add the loan on its own."}</small>
              </span>
            </label>
            {withSource && (
              <div className="grid gap-x-3.5 gap-y-3 md:grid-cols-2">
                <Field id="statementMatch" label="Bank statement text" help="The name on the credit, like RAVI KUMAR. At least 3 letters. Add it later if you don't have it." error={errors.statementMatch}>
                  <TextInput {...describedBy("statementMatch", errors.statementMatch, true)} name="statementMatch" value={statementMatch} onChange={(e) => setStatementMatch(e.target.value)} onBlur={() => reveal("statementMatch")} invalid={Boolean(errors.statementMatch)} />
                </Field>
                <Field id="accountId" label="Lands in" error={errors.accountId}>
                  <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={[{ value: "", label: "Not set", quiet: true }, ...forms.accounts.map((a) => ({ value: a.id, label: a.name }))]} value={accountId} onChange={setAccountId} placeholder="Not set" />
                </Field>
                <input type="hidden" name="createIncomeSource" value="1" />
              </div>
            )}
          </div>
        )}
      </div>
    </FormDialog>
  );
}

