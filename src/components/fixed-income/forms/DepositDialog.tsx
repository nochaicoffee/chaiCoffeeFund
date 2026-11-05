"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { saveDeposit } from "@/app/fixed-income/depositActions";
import type { DepositFormsData, DepositRow } from "@/app/fixed-income/depositFormsData";
import { compoundedValue, maturityFromTenure, tenureBetween } from "@/lib/aggregate/fixedDeposits";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { DEPOSIT_PAYOUTS, readDepositForm } from "@/lib/forms/depositForms";
import { IDLE } from "@/lib/forms/formState";
import { SummaryBox } from "../../accounts/forms/MiniAccountCard";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { PlusIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";

const INTEREST = [
  { value: "Cumulative", label: "Added to it" },
  { value: "Non-Cumulative", label: "Paid out" },
] as const;

/**
 * Add a deposit (FiForms): as his FD app shows it, the day it started and how long it runs, or the day it matures instead. The bank
 * and the maturity amount are optional: his app shows neither, so the value is estimated, and says so, until the bank's figure is added.
 * Also Edit, for a deposit that isn't closed.
 */
export function DepositDialog({ forms, deposit, onClose, onSaved, onDelete }: { forms: DepositFormsData; deposit?: DepositRow; onClose: () => void; onSaved: (undo?: { id: string; message: string }) => void; onDelete?: () => void }) {
  const [state, formAction, pending] = useActionState(saveDeposit, IDLE);
  const tenure = deposit ? tenureBetween(deposit.startDate, deposit.maturityDate) : { months: 18, days: 1 };
  const [principal, setPrincipal] = useState(deposit ? String(deposit.principalAmount) : "");
  const [rate, setRate] = useState(deposit ? String(deposit.interestRate) : "");
  const [startDate, setStartDate] = useState(deposit?.startDate ?? forms.today);
  const [months, setMonths] = useState(String(tenure.months));
  const [days, setDays] = useState(String(tenure.days));
  // An edit keeps the day the bank fixed, so correcting the start day doesn't move it; months and days are one click away.
  const [byDate, setByDate] = useState(Boolean(deposit));
  const [maturityDate, setMaturityDate] = useState(deposit?.maturityDate ?? "");
  const [compounding, setCompounding] = useState<"Cumulative" | "Non-Cumulative">(deposit?.compoundingType ?? "Cumulative");
  const [payout, setPayout] = useState<string>(deposit?.payoutFrequency ?? "Quarterly");
  const [bankName, setBankName] = useState(deposit?.bankName ?? "");
  const [maturityAmount, setMaturityAmount] = useState(deposit?.maturityAmount !== undefined ? String(deposit.maturityAmount) : "");
  const [accountId, setAccountId] = useState(deposit?.accountId ?? "");
  const [name, setName] = useState(deposit?.name ?? "");

  const values: Record<string, string> = {
    principalAmount: principal, interestRate: rate, startDate, compoundingType: compounding, bankName, maturityAmount, accountId, name,
    ...(compounding === "Non-Cumulative" && { payoutFrequency: payout }),
    ...(byDate ? { maturityDate } : { tenureMonths: months, tenureDays: days }),
  };
  const check = readDepositForm(values, { accountIds: forms.accounts.map((a) => a.id) }, forms.today);
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

  // What the preview says: when it matures (from the tenure, or the day given) and what it is expected to be worth then.
  const matures = check.ok ? check.input.maturityDate : !byDate && startDate && Number.isInteger(Number(months)) && Number.isInteger(Number(days || "0")) ? maturityFromTenure(startDate, Number(months || "0"), Number(days || "0")) : "";
  const placed = parseAmountText(principal);
  const rated = parseAmountText(rate);
  const stated = parseAmountText(maturityAmount);
  const estimate = placed && rated !== null && startDate && matures && matures > startDate ? compoundedValue(placed, rated, daysBetween(startDate, matures)) : null;

  return (
    <FormDialog
      icon={<PlusIcon />}
      title={deposit ? "Edit deposit" : "Add a deposit"}
      subtitle={deposit ? deposit.name : "As your FD app shows it: the day it started and how long it runs."}
      preview={
        <PreviewPanel caption="Your app doesn't show the maturity amount, so the page estimates it and says so. Add the bank's own figure whenever you have it: it replaces the estimate.">
          <SummaryBox
            rows={[
              { label: "Placed", value: placed ? formatInr(placed) : "—" },
              { label: "Rate", value: rated !== null ? `${rated}% · ${compounding === "Cumulative" ? "compounds quarterly" : "interest paid out"}` : "—" },
              { label: "Matures", value: matures ? formatDate(matures) : "—" },
              ...(compounding === "Cumulative" ? [{ label: stated ? "Worth then (the bank's)" : "Worth then, estimated", value: stated ? formatInr(stated) : estimate ? formatInr(Math.round(estimate)) : "—" }] : []),
            ]}
          />
        </PreviewPanel>
      }
      footerNote={
        deposit && onDelete ? (
          <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Delete deposit
          </button>
        ) : (
          <span className="max-md:hidden">You can undo it for a few seconds after saving.</span>
        )
      }
      primaryLabel={deposit ? "Save changes" : "Add deposit"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {deposit && <input type="hidden" name="id" value={deposit.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="principalAmount" label="Amount placed" required error={errors.principalAmount}>
          <MoneyInput {...describedBy("principalAmount", errors.principalAmount, false)} data-autofocus name="principalAmount" value={principal} onChange={(e) => setPrincipal(e.target.value)} onBlur={() => reveal("principalAmount")} invalid={Boolean(errors.principalAmount)} />
        </Field>
        <Field id="interestRate" label="Rate a year (%)" required error={errors.interestRate}>
          <TextInput {...describedBy("interestRate", errors.interestRate, false)} inputMode="decimal" name="interestRate" placeholder="7.75" value={rate} onChange={(e) => setRate(e.target.value)} onBlur={() => reveal("interestRate")} invalid={Boolean(errors.interestRate)} />
        </Field>
        <Field id="startDate" label="Started on" required error={errors.startDate}>
          <DateInput {...describedBy("startDate", errors.startDate, false)} label="Started on" name="startDate" value={startDate} onChange={setStartDate} onBlur={() => reveal("startDate")} today={forms.today} invalid={Boolean(errors.startDate)} />
        </Field>
        {byDate ? (
          <Field id="maturityDate" label="Matures on" required error={errors.maturityDate} help="Or give months and days instead.">
            <DateInput {...describedBy("maturityDate", errors.maturityDate, true)} label="Matures on" name="maturityDate" value={maturityDate} onChange={setMaturityDate} onBlur={() => reveal("maturityDate")} today={forms.today} invalid={Boolean(errors.maturityDate)} />
            <button type="button" onClick={() => { if (startDate && maturityDate > startDate) { const t = tenureBetween(startDate, maturityDate); setMonths(String(t.months)); setDays(String(t.days)); } setByDate(false); }} className="self-start text-xs font-bold text-accent-text underline">Use months and days</button>
          </Field>
        ) : (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
              Runs for <span className="text-negative" aria-hidden="true">*</span>
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative"><TextInput aria-label="Months" {...(errors.tenureMonths ? { "aria-invalid": true } : {})} inputMode="numeric" name="tenureMonths" placeholder="18" value={months} onChange={(e) => setMonths(e.target.value)} onBlur={() => reveal("tenureMonths")} invalid={Boolean(errors.tenureMonths)} /><span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-muted" aria-hidden="true">months</span></div>
              <div className="relative"><TextInput aria-label="Days" {...(errors.tenureDays ? { "aria-invalid": true } : {})} inputMode="numeric" name="tenureDays" placeholder="1" value={days} onChange={(e) => setDays(e.target.value)} onBlur={() => reveal("tenureDays")} invalid={Boolean(errors.tenureDays)} /><span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-muted" aria-hidden="true">days</span></div>
            </div>
            {(errors.tenureMonths || errors.tenureDays) && <p className="text-[11px] font-semibold text-negative">{errors.tenureMonths ?? errors.tenureDays}</p>}
            <button type="button" onClick={() => { setByDate(true); if (matures) setMaturityDate(matures); }} className="self-start text-xs font-bold text-accent-text underline">Or pick the maturity date</button>
          </div>
        )}
        <div className="md:col-span-2">
          <Segmented name="compoundingType" legend="Interest" required options={INTEREST} value={compounding} onChange={setCompounding} help={compounding === "Non-Cumulative" ? "Paid out: say how often." : "Added to it, so it grows and is paid at the end."} error={errors.compoundingType} />
        </div>
        {compounding === "Non-Cumulative" && (
          <Field id="payoutFrequency" label="Paid out" required error={errors.payoutFrequency}>
            <SelectInput id="payoutFrequency" name="payoutFrequency" invalid={Boolean(errors.payoutFrequency)} options={DEPOSIT_PAYOUTS.map((p) => ({ value: p, label: p }))} value={payout} onChange={setPayout} />
          </Field>
        )}
        <Field id="bankName" label="Bank" help="Add it to see how much sits with each bank." error={errors.bankName}>
          <TextInput {...describedBy("bankName", errors.bankName, true)} name="bankName" placeholder="Not set" value={bankName} onChange={(e) => setBankName(e.target.value)} invalid={Boolean(errors.bankName)} />
        </Field>
        <Field id="maturityAmount" label="Maturity amount" help="What the bank says it pays at the end." error={errors.maturityAmount}>
          <MoneyInput {...describedBy("maturityAmount", errors.maturityAmount, true)} name="maturityAmount" placeholder="Estimated" value={maturityAmount} onChange={(e) => setMaturityAmount(e.target.value)} onBlur={() => reveal("maturityAmount")} invalid={Boolean(errors.maturityAmount)} />
        </Field>
        <Field id="accountId" label="Paid from" error={errors.accountId}>
          <SelectInput id="accountId" name="accountId" invalid={Boolean(errors.accountId)} options={[{ value: "", label: "Not set", quiet: true }, ...forms.accounts.map((a) => ({ value: a.id, label: a.name }))]} value={accountId} onChange={setAccountId} placeholder="Not set" />
        </Field>
        <Field id="name" label="Name" help="Blank: named by the bank and the day it started." error={errors.name}>
          <TextInput {...describedBy("name", errors.name, true)} name="name" value={name} onChange={(e) => setName(e.target.value)} invalid={Boolean(errors.name)} />
        </Field>
      </div>
    </FormDialog>
  );
}
