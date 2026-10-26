"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveLoan } from "@/app/loans/actions";
import type { FormLoan, LoanFormsData } from "@/app/loans/views";
import { currentEmi, loanColor, netDisbursedAmount, usualEffect } from "@/lib/aggregate/loans";
import { cardColorKey } from "@/lib/format/colors";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { LOAN_CATEGORIES, readLoanForm } from "@/lib/forms/loanForms";
import { generateInstallments } from "@/lib/schedule/generateInstallments";
import { CARD_COLORS, type LoanCategory } from "@/lib/sheets/types";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ColorSwatches } from "../../shell/ColorSwatches";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import { LoanIcon } from "../parts";

const CATEGORY_LABELS: Record<LoanCategory, string> = { Home: "Home", Auto: "Car", Personal: "Personal", Other: "Other" };
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const text = (n: number | undefined) => (n === undefined ? "" : String(n));

/**
 * Add loan (LoansForms 1): the numbers from the sanction letter, with a preview of the EMI, the interest over the loan
 * and what actually reaches the account (the loan less its processing fee, stamp duty and pre-EMI interest). Its whole
 * schedule is created with it. Edit loan is the same form without the terms that drive the schedule (amount, rate,
 * number of EMIs and the two dates), which can't change once the schedule exists; with Delete.
 */
export function LoanFormDialog({ forms, editing, onClose, onSaved, onDelete }: { forms: LoanFormsData; editing?: FormLoan; onClose: () => void; onSaved: (undo: { id: string; message: string }) => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveLoan, IDLE);
  const loan = editing?.loan;
  const [name, setName] = useState(loan?.name ?? "");
  const [lenderName, setLenderName] = useState(loan?.lenderName ?? "");
  const [category, setCategory] = useState<string>(loan?.category ?? "Personal");
  const [principalAmount, setPrincipal] = useState(text(loan?.principalAmount));
  const [annualInterestRate, setRate] = useState(text(loan?.annualInterestRate));
  const [tenureMonths, setTenure] = useState(text(loan?.tenureMonths));
  const [firstEmiDate, setFirstEmi] = useState(loan?.firstEmiDate ?? "");
  const [disbursementDate, setDisbursed] = useState(loan?.disbursementDate ?? forms.today);
  const [processingFee, setFee] = useState(text(loan?.processingFee));
  const [stampDuty, setStamp] = useState(text(loan?.stampDuty));
  const [preEmiInterest, setPreEmi] = useState(text(loan?.preEmiInterest));
  const [accountId, setAccountId] = useState(loan?.accountId ?? "");
  const [chargedTo, setChargedTo] = useState(loan?.emiPaidFromCardId ? `card:${loan.emiPaidFromCardId}` : loan?.emiPaidFromAccountId ? `account:${loan.emiPaidFromAccountId}` : "");
  const [prepaymentEffect, setEffect] = useState<string>(loan ? usualEffect(loan) : "Reduce-Tenure");
  const [color, setColor] = useState<string>(loan ? loanColor(loan) : loanColor({ category: "Personal" }));
  const [colorChosen, setColorChosen] = useState(Boolean(loan?.color));
  const [prepaymentChargePercent, setChargePct] = useState(text(loan?.prepaymentChargePercent));
  const [prepaymentMaxPercent, setMaxPct] = useState(text(loan?.prepaymentMaxPercent));
  const [prepaymentsPerYear, setPerYear] = useState(text(loan?.prepaymentsPerYear));
  const [prepaymentsInLoan, setInLoan] = useState(text(loan?.prepaymentsInLoan));
  const [prepaymentAfterEmis, setAfterEmis] = useState(text(loan?.prepaymentAfterEmis));

  const values = { name, lenderName, category, principalAmount, annualInterestRate, tenureMonths, firstEmiDate, disbursementDate, processingFee, stampDuty, preEmiInterest, accountId, chargedTo, prepaymentEffect, color, prepaymentChargePercent, prepaymentMaxPercent, prepaymentsPerYear, prepaymentsInLoan, prepaymentAfterEmis };
  const check = readLoanForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id) }, Boolean(editing));
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

  // A category's colour until one is chosen.
  function chooseCategory(next: string) {
    setCategory(next);
    if (!colorChosen && (LOAN_CATEGORIES as readonly string[]).includes(next)) setColor(loanColor({ category: next as LoanCategory }));
  }

  // The preview works the schedule out as the app will, from the terms as typed.
  const amount = parseAmountText(principalAmount) ?? 0;
  const rate = Number(annualInterestRate);
  const months = Number(tenureMonths);
  const termsReady = amount > 0 && Number.isFinite(rate) && rate >= 0 && Number.isInteger(months) && months > 0 && months <= 480 && /^\d{4}-\d{2}-\d{2}$/.test(firstEmiDate);
  // Editing, it's the loan's schedule as it stands (prepayments included); adding, the one the app will create.
  const schedule = editing ? editing.installments : termsReady ? generateInstallments({ repaymentStructure: "Standard-Emi", principalAmount: amount, annualInterestRate: rate, tenureMonths: months, firstEmiDate } as Parameters<typeof generateInstallments>[0]) : [];
  const emiNow = editing ? currentEmi(editing.installments) : schedule[0]?.totalDue;
  const fee = parseAmountText(processingFee) ?? 0;
  const stamp = parseAmountText(stampDuty) ?? 0;
  const preEmi = parseAmountText(preEmiInterest) ?? 0;
  const interest = schedule.reduce((t, i) => t + i.interestDue, 0);
  const intoAccount = forms.accounts.find((a) => a.id === accountId)?.name ?? "your account";

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={editing ? "Edit loan" : "Add loan"}
      subtitle={editing ? `${loan!.name} · ${loan!.lenderName}` : "Money you borrowed from a bank"}
      preview={
        <PreviewPanel caption={editing ? "The amount, rate, number of EMIs and dates can't change: the schedule is worked out from them." : `The EMI stays on the full ${amount ? formatInr(amount) : "loan"}. The fee, stamp duty and pre-EMI interest come out of what's paid in, and the pre-EMI interest counts as interest.`}>
          <div className="flex flex-col gap-3 rounded-[16px] bg-surface p-4">
            <span className="flex items-center gap-3">
              <LoanIcon category={(category as LoanCategory) || "Other"} colorKey={cardColorKey(color as never)} size={40} />
              <span className="min-w-0">
                <b className="block truncate text-[15px] font-extrabold">{name || "Name it"}</b>
                <span className="block truncate text-xs font-semibold text-muted">{[lenderName || "The bank", rate ? `${rate}%` : "", schedule.length ? `${schedule.length} EMIs` : months ? `${months} EMIs` : ""].filter(Boolean).join(" · ")}</span>
              </span>
            </span>
            <b className="text-[28px] leading-none font-extrabold tabular-nums">
              {schedule.length ? formatInr(emiNow ?? 0) : "₹—"}
              <small className="ml-1 text-xs font-semibold text-muted">a month</small>
            </b>
            <span className="text-xs font-semibold text-muted">{schedule.length ? `due on the ${ordinal(Number(firstEmiDate.slice(8, 10)))}, from ${formatDate(schedule[0].dueDate)} to ${formatDate(schedule.at(-1)!.dueDate)}${editing ? ", as it stands" : ""}` : "The EMI shows once the amount, rate, number of EMIs and first EMI date are in."}</span>
          </div>
          {schedule.length > 0 && (
            <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
              <Line label="Interest over the loan" value={formatInr(interest)} />
              <Line label="Last EMI" value={formatInr(schedule.at(-1)!.totalDue)} />
              <Line label={editing ? "Total, paid and to come" : "Total you'll repay"} value={formatInr(amount + interest)} strong />
            </dl>
          )}
          {amount > 0 && (
            <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
              <Line label="Loan amount" value={formatInr(amount)} />
              <Line label="Processing fee" value={`− ${formatInr(fee)}`} />
              <Line label="Stamp duty" value={`− ${formatInr(stamp)}`} />
              <Line label="Pre-EMI interest" value={`− ${formatInr(preEmi)}`} />
              <Line label={`Reaches ${intoAccount}`} value={formatInr(netDisbursedAmount({ principalAmount: amount, processingFee: fee, stampDuty: stamp, preEmiInterest: preEmi }))} strong />
            </dl>
          )}
          <ColorSwatches
            colors={CARD_COLORS}
            value={color}
            onChange={(c) => {
              setColor(c);
              setColorChosen(true);
            }}
            error={errors.color}
          />
        </PreviewPanel>
      }
      footerNote={
        editing && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete loan
          </button>
        ) : (
          <span className="max-md:hidden">{months > 0 ? `The full schedule of ${months} EMIs is created with the loan.` : "Its whole schedule is created with it."}</span>
        )
      }
      primaryLabel={editing ? "Save changes" : "Add loan"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {editing && <input type="hidden" name="id" value={editing.loan.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="name" label="Name" required help="Something memorable, since two loans can share a bank." error={errors.name}>
          <TextInput {...describedBy("name", errors.name, true)} data-autofocus name="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} invalid={Boolean(errors.name)} placeholder="Home loan" />
        </Field>
        <Field id="lenderName" label="Lender" required error={errors.lenderName}>
          <TextInput {...describedBy("lenderName", errors.lenderName, false)} name="lenderName" value={lenderName} onChange={(e) => setLenderName(e.target.value)} onBlur={() => reveal("lenderName")} invalid={Boolean(errors.lenderName)} placeholder="HDFC Bank" />
        </Field>
        <Field id="category" label="Category" required error={errors.category}>
          <SelectInput id="category" name="category" invalid={Boolean(errors.category)} options={LOAN_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} value={category} onChange={chooseCategory} />
        </Field>
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Terms</span>
            <p className="rounded-[12px] bg-fill px-3.5 py-2.5 text-[12.5px] font-semibold">
              {formatInr(loan!.principalAmount)} at {loan!.annualInterestRate}% · {loan!.tenureMonths} EMIs from {formatDate(loan!.firstEmiDate)}
            </p>
          </div>
        ) : (
          <Field id="principalAmount" label="Loan amount" required error={errors.principalAmount}>
            <MoneyInput {...describedBy("principalAmount", errors.principalAmount, false)} name="principalAmount" value={principalAmount} onChange={(e) => setPrincipal(e.target.value)} onBlur={() => reveal("principalAmount")} invalid={Boolean(errors.principalAmount)} />
          </Field>
        )}
        {!editing && (
          <>
            <Field id="annualInterestRate" label="Interest rate" required help="A year, as on the sanction letter." error={errors.annualInterestRate}>
              <TextInput {...describedBy("annualInterestRate", errors.annualInterestRate, true)} inputMode="decimal" name="annualInterestRate" value={annualInterestRate} onChange={(e) => setRate(e.target.value)} onBlur={() => reveal("annualInterestRate")} invalid={Boolean(errors.annualInterestRate)} placeholder="9.99" />
            </Field>
            <Field id="tenureMonths" label="Number of EMIs" required help="EMIs are monthly." error={errors.tenureMonths}>
              <TextInput {...describedBy("tenureMonths", errors.tenureMonths, true)} inputMode="numeric" name="tenureMonths" value={tenureMonths} onChange={(e) => setTenure(e.target.value)} onBlur={() => reveal("tenureMonths")} invalid={Boolean(errors.tenureMonths)} placeholder="12" />
            </Field>
            <Field id="firstEmiDate" label="First EMI date" required help="From the sanction letter. Every EMI falls on the same day of the month." error={errors.firstEmiDate}>
              <DateInput {...describedBy("firstEmiDate", errors.firstEmiDate, true)} label="First EMI date" name="firstEmiDate" value={firstEmiDate} onChange={setFirstEmi} onBlur={() => reveal("firstEmiDate")} today={forms.today} invalid={Boolean(errors.firstEmiDate)} />
            </Field>
            <Field id="disbursementDate" label="Disbursed on" required error={errors.disbursementDate}>
              <DateInput {...describedBy("disbursementDate", errors.disbursementDate, false)} label="Disbursed on" name="disbursementDate" value={disbursementDate} onChange={setDisbursed} onBlur={() => reveal("disbursementDate")} today={forms.today} invalid={Boolean(errors.disbursementDate)} />
            </Field>
          </>
        )}
        <Field id="processingFee" label="Processing fee" help="With GST, as the bank charged it." error={errors.processingFee}>
          <MoneyInput {...describedBy("processingFee", errors.processingFee, true)} name="processingFee" value={processingFee} onChange={(e) => setFee(e.target.value)} onBlur={() => reveal("processingFee")} invalid={Boolean(errors.processingFee)} />
        </Field>
        <Field id="stampDuty" label="Stamp duty" error={errors.stampDuty}>
          <MoneyInput {...describedBy("stampDuty", errors.stampDuty, false)} name="stampDuty" value={stampDuty} onChange={(e) => setStamp(e.target.value)} onBlur={() => reveal("stampDuty")} invalid={Boolean(errors.stampDuty)} />
        </Field>
        <Field id="preEmiInterest" label="Pre-EMI interest" help="The odd days before the EMI cycle starts, as the bank quotes it." error={errors.preEmiInterest}>
          <MoneyInput {...describedBy("preEmiInterest", errors.preEmiInterest, true)} name="preEmiInterest" value={preEmiInterest} onChange={(e) => setPreEmi(e.target.value)} onBlur={() => reveal("preEmiInterest")} invalid={Boolean(errors.preEmiInterest)} />
        </Field>
        <Field id="accountId" label="Paid into" required error={errors.accountId}>
          <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={forms.accounts.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} placeholder={forms.accounts.length ? "Choose account" : "No accounts yet"} />
        </Field>
        <div className="md:col-span-2">
          <ChargedToField label="EMI paid from" value={chargedTo} onChange={setChargedTo} forms={{ cards: forms.cards.map((c) => ({ ...c, color: c.color })), accounts: forms.accounts }} help="An account, or a card if the EMI is charged to one." error={errors.chargedTo} />
        </div>
        <div className="md:col-span-2">
          <Segmented name="prepaymentEffect" legend="A prepayment usually" options={[{ value: "Reduce-Tenure", label: "Reduces the tenure" }, { value: "Reduce-Emi", label: "Reduces the EMI" }]} value={prepaymentEffect as "Reduce-Tenure" | "Reduce-Emi"} onChange={setEffect} help="What an extra payment does by default. You can change it on any one." error={errors.prepaymentEffect} />
        </div>
        <Field id="prepaymentChargePercent" label="Prepayment charge" help="% of the amount, before 18% GST. Blank is none." error={errors.prepaymentChargePercent}>
          <TextInput {...describedBy("prepaymentChargePercent", errors.prepaymentChargePercent, true)} inputMode="decimal" name="prepaymentChargePercent" value={prepaymentChargePercent} onChange={(e) => setChargePct(e.target.value)} onBlur={() => reveal("prepaymentChargePercent")} invalid={Boolean(errors.prepaymentChargePercent)} placeholder="4" />
        </Field>
        <Field id="prepaymentMaxPercent" label="At most, of what's left" help="% of the outstanding principal at a time." error={errors.prepaymentMaxPercent}>
          <TextInput {...describedBy("prepaymentMaxPercent", errors.prepaymentMaxPercent, true)} inputMode="decimal" name="prepaymentMaxPercent" value={prepaymentMaxPercent} onChange={(e) => setMaxPct(e.target.value)} onBlur={() => reveal("prepaymentMaxPercent")} invalid={Boolean(errors.prepaymentMaxPercent)} placeholder="25" />
        </Field>
        <Field id="prepaymentAfterEmis" label="Only after" help="EMIs paid before the first prepayment." error={errors.prepaymentAfterEmis}>
          <TextInput {...describedBy("prepaymentAfterEmis", errors.prepaymentAfterEmis, true)} inputMode="numeric" name="prepaymentAfterEmis" value={prepaymentAfterEmis} onChange={(e) => setAfterEmis(e.target.value)} onBlur={() => reveal("prepaymentAfterEmis")} invalid={Boolean(errors.prepaymentAfterEmis)} placeholder="1" />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field id="prepaymentsPerYear" label="A year" help="April to March." error={errors.prepaymentsPerYear}>
            <TextInput {...describedBy("prepaymentsPerYear", errors.prepaymentsPerYear, true)} inputMode="numeric" name="prepaymentsPerYear" value={prepaymentsPerYear} onChange={(e) => setPerYear(e.target.value)} onBlur={() => reveal("prepaymentsPerYear")} invalid={Boolean(errors.prepaymentsPerYear)} placeholder="1" />
          </Field>
          <Field id="prepaymentsInLoan" label="In all" help="Over the loan." error={errors.prepaymentsInLoan}>
            <TextInput {...describedBy("prepaymentsInLoan", errors.prepaymentsInLoan, true)} inputMode="numeric" name="prepaymentsInLoan" value={prepaymentsInLoan} onChange={(e) => setInLoan(e.target.value)} onBlur={() => reveal("prepaymentsInLoan")} invalid={Boolean(errors.prepaymentsInLoan)} placeholder="2" />
          </Field>
        </div>
        <p className="text-[11px] font-semibold text-muted md:col-span-2">The bank&apos;s limits are warnings when you add a prepayment. They never stop a save.</p>
      </div>
    </FormDialog>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-divider pt-1.5 font-extrabold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
