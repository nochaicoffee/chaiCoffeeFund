"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { savePrepayment } from "@/app/loans/actions";
import type { LoanFormsData } from "@/app/loans/views";
import { prepaymentLimits, usualEffect, whatIfPrepayment } from "@/lib/aggregate/loans";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readPrepaymentForm } from "@/lib/forms/loanForms";
import { prepaymentCharge } from "@/lib/schedule/prepayments";
import type { PrepaymentEffect } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { AlertIcon, CheckIcon, PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";

const EFFECTS: { value: PrepaymentEffect; label: string }[] = [
  { value: "Reduce-Tenure", label: "Reduce tenure" },
  { value: "Reduce-Emi", label: "Reduce EMI" },
  { value: "Close", label: "Close" },
];

/**
 * Add prepayment (LoansForms 3): principal paid off beyond the EMIs. The effect starts as the loan's usual one, the
 * charge is filled in from the loan's rule (and can be changed to what the bank took), and the loan's limits show as
 * warnings: it still saves. The bank's revised EMI and number of EMIs, from its letter, replace the app's own figures.
 * Saving rebuilds the EMIs after it; the ones already paid stay as they are.
 */
export function PrepaymentDialog({ forms, loanId, onClose, onSaved }: { forms: LoanFormsData; loanId?: string; onClose: () => void; onSaved: (undo: { id: string; message: string }) => void }) {
  const [state, formAction, pending] = useActionState(savePrepayment, IDLE);
  const active = forms.loans.filter((l) => l.loan.status === "Active");
  const first = active.find((l) => l.loan.id === loanId) ?? active[0];
  const [chosen, setChosen] = useState(first?.loan.id ?? "");
  const [date, setDate] = useState(forms.today);
  const [amount, setAmount] = useState("");
  const [effect, setEffect] = useState<PrepaymentEffect>(first ? usualEffect(first.loan) : "Reduce-Tenure");
  const [charge, setCharge] = useState("");
  const [chargeTouched, setChargeTouched] = useState(false);
  const [chargedTo, setChargedTo] = useState(first?.loan.emiPaidFromAccountId ? `account:${first.loan.emiPaidFromAccountId}` : "");
  const [bankEmi, setBankEmi] = useState("");
  const [bankInstallments, setBankInstallments] = useState("");

  const picked = active.find((l) => l.loan.id === chosen);
  const pendingRows = picked?.installments.filter((i) => i.status === "Pending") ?? [];
  const outstanding = pendingRows.reduce((t, i) => t + i.principalDue, 0);
  const typed = parseAmountText(amount) ?? 0;

  let what: ReturnType<typeof whatIfPrepayment> | null = null;
  if (picked && (typed > 0 || effect === "Close") && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    try {
      what = whatIfPrepayment(picked.loan, picked.installments, typed, effect, date);
    } catch {
      what = null;
    }
  }
  const autoCharge = picked && what ? prepaymentCharge(picked.loan, what.amount) : 0;
  const values = { loanId: chosen, date, amount, effect, charge: chargeTouched ? charge : String(autoCharge), chargedTo, bankEmi, bankInstallments };
  const check = readPrepaymentForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id), loanIds: active.map((l) => l.loan.id) }, forms.today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved" && state.undo) onSaved(state.undo);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function choose(id: string) {
    const next = active.find((l) => l.loan.id === id);
    setChosen(id);
    if (next) setEffect(usualEffect(next.loan));
  }

  const limits = picked && effect !== "Close" && typed > 0 ? prepaymentLimits({ loan: picked.loan, paidCount: picked.installments.filter((i) => i.status === "Paid").length, outstanding, prepayments: picked.prepayments }, date, typed) : [];
  const paidCharge = parseAmountText(values.charge) ?? 0;
  const from = chargedTo.startsWith("card:") ? forms.cards.find((c) => `card:${c.id}` === chargedTo)?.name : forms.accounts.find((a) => `account:${a.id}` === chargedTo)?.name;
  const interestBefore = pendingRows.reduce((t, i) => t + i.interestDue, 0);

  return (
    <FormDialog
      icon={<PlusIcon />}
      title="Add prepayment"
      subtitle={picked ? `${picked.loan.name} · ${picked.loan.lenderName}` : "Principal paid off beyond the EMIs"}
      preview={
        <PreviewPanel caption="The interest in the month of a prepayment follows a proposed rule, so these are estimates until a bank letter confirms them. Paid EMIs never change.">
          <span className="w-fit rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-extrabold text-accent-text">Estimate</span>
          {what ? (
            <>
              <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                <Line label="Still owed" value={`${formatInr(what.balanceBefore)} → ${formatInr(what.balanceAfter)}`} />
                {what.closes ? (
                  <Line label="The loan" value="Closes" strong />
                ) : (
                  <>
                    <Line label="EMI" value={`${formatInr(what.emiBefore)} → ${formatInr(what.emiAfter)}`} />
                    <Line label="Ends" value={what.end === what.endBefore ? `${formatDate(what.end)}, the same` : `${formatDate(what.endBefore)} → ${formatDate(what.end)}`} />
                  </>
                )}
                <Line label="Interest still to pay" value={`${formatInr(interestBefore)} → ${formatInr(Math.max(0, interestBefore - what.interestSaved))}`} />
              </dl>
              <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                <Line label="Interest saved" value={formatInr(what.interestSaved)} big />
                <Line label="Charge" value={formatInr(paidCharge)} big />
                <p className="text-[11px] font-semibold text-muted">Shown side by side, never netted, so a prepayment that isn&apos;t worth its fee is easy to see.</p>
              </dl>
              <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                <Line label="You pay" value={formatInr(what.amount + (what.closes ? what.dayInterest : 0) + paidCharge)} strong />
                {what.closes && what.dayInterest > 0 && <Line label={`With ${what.days} days' interest`} value={formatInr(what.dayInterest)} />}
                {from && <Line label="From" value={from} />}
              </dl>
            </>
          ) : (
            <p className="rounded-[16px] bg-surface p-4 text-sm font-semibold text-muted">{picked ? `Enter an amount to see what it changes. ${formatInr(outstanding)} is still owed.` : "No active loans."}</p>
          )}
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">The remaining EMIs are rebuilt. The ones already paid stay as they are.</span>}
      primaryLabel="Save prepayment"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field id="loanId" label="Loan" required error={errors.loanId}>
            <SelectInput id="loanId" name="loanId" invalid={Boolean(errors.loanId)} options={active.map((l) => ({ value: l.loan.id, label: l.loan.name, meta: `${formatInr(l.installments.filter((i) => i.status === "Pending").reduce((t, i) => t + i.principalDue, 0))} still owed`, swatch: { background: `var(--card-${l.colorKey})` } }))} value={chosen} onChange={choose} placeholder="Choose the loan" />
          </Field>
        </div>
        <Field id="date" label="Date" required error={errors.date}>
          <DateInput {...describedBy("date", errors.date, false)} label="Date" name="date" value={date} onChange={setDate} onBlur={() => reveal("date")} today={forms.today} invalid={Boolean(errors.date)} />
        </Field>
        <Field id="amount" label="Amount" required={effect !== "Close"} help={effect === "Close" ? `Closing pays off what's left: ${formatInr(what?.amount ?? outstanding)}.` : "The principal it pays off."} error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, true)} data-autofocus name="amount" value={effect === "Close" ? "" : amount} disabled={effect === "Close"} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        <div className="md:col-span-2">
          <Segmented name="effect" legend="Effect" required options={EFFECTS} value={effect} onChange={setEffect} help={picked ? `This loan usually ${usualEffect(picked.loan) === "Reduce-Emi" ? "reduces its EMI" : "reduces its tenure"}${effect === usualEffect(picked.loan) ? ", so that's chosen" : ""}. Close pays off everything that's left and closes the loan.` : undefined} error={errors.effect} />
        </div>
        <Field id="charge" label="Charge" help={picked?.loan.prepaymentChargePercent ? `${picked.loan.prepaymentChargePercent}% + GST, filled in from the loan's rule. A separate debit that doesn't reduce principal.` : "What the bank charged, if anything. A separate debit."} error={errors.charge}>
          <MoneyInput
            {...describedBy("charge", errors.charge, true)}
            name="charge"
            value={values.charge}
            onChange={(e) => {
              setChargeTouched(true);
              setCharge(e.target.value);
            }}
            invalid={Boolean(errors.charge)}
          />
        </Field>
        <div className="md:col-span-2">
          <ChargedToField label="Paid from" value={chargedTo} onChange={setChargedTo} forms={{ cards: forms.cards, accounts: forms.accounts }} help="Where the money came from." error={errors.chargedTo} />
        </div>
        {limits.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-[14px] bg-fill px-4 py-3 md:col-span-2">
            <span className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">{picked!.loan.lenderName}&apos;s limits · warnings, not blocks</span>
            {limits.map((l) => (
              <span key={l.rule} className={`flex items-start gap-2 text-[12.5px] font-bold ${l.ok ? "text-accent-text" : "text-warning-text"}`}>
                {l.ok ? <CheckIcon /> : <AlertIcon />}
                <span>
                  {l.rule} <span className="font-semibold opacity-80">({l.note})</span>
                  {!l.ok && <span className="block text-[11px] font-semibold">You can still save it.</span>}
                </span>
              </span>
            ))}
          </div>
        )}
        {effect !== "Close" && (
          <>
            <Field id="bankEmi" label="Bank's new EMI" help="If you enter it, the app uses it instead of its own figure." error={errors.bankEmi}>
              <MoneyInput {...describedBy("bankEmi", errors.bankEmi, true)} name="bankEmi" value={bankEmi} onChange={(e) => setBankEmi(e.target.value)} onBlur={() => reveal("bankEmi")} invalid={Boolean(errors.bankEmi)} placeholder="From the revised schedule letter" />
            </Field>
            <Field id="bankInstallments" label="Bank's new number of EMIs" help="Same: the bank's figure wins." error={errors.bankInstallments}>
              <TextInput {...describedBy("bankInstallments", errors.bankInstallments, true)} inputMode="numeric" name="bankInstallments" value={bankInstallments} onChange={(e) => setBankInstallments(e.target.value)} onBlur={() => reveal("bankInstallments")} invalid={Boolean(errors.bankInstallments)} placeholder="From the revised schedule letter" />
            </Field>
          </>
        )}
      </div>
    </FormDialog>
  );
}

function Line({ label, value, strong = false, big = false }: { label: string; value: string; strong?: boolean; big?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-extrabold" : ""}`}>
      <dt className={strong || big ? "" : "text-muted"}>{label}</dt>
      <dd className={`text-right tabular-nums ${big ? "text-lg font-extrabold" : ""}`}>{value}</dd>
    </div>
  );
}
