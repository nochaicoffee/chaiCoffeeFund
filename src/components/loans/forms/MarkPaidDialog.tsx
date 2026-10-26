"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { editEmiPayment, markEmiPaid } from "@/app/loans/actions";
import type { LoanFormsData } from "@/app/loans/views";
import { editPaymentProblem, excessOverEmi, markPaidProblem, usualEffect } from "@/lib/aggregate/loans";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readMarkPaidForm } from "@/lib/forms/loanForms";
import { prepaymentCharge, rebuildSchedule } from "@/lib/schedule/prepayments";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import { LoanIcon } from "../parts";

/**
 * Mark paid (LoansForms 2): an EMI as it was paid. Paying more than the EMI and its overdue charge records the EMI at
 * its own amount and creates a prepayment for the extra in the same save; the form says so, asks what the extra
 * should do (the loan's usual effect to start with) and fills in the bank's charge on it. The preview's figures after
 * the prepayment are estimates (see rebuildSchedule).
 *
 * With `editing` it is Edit payment instead: the same form on an EMI already paid, to correct its date, amount, overdue
 * charge or where it was paid from. The EMI can't be changed, and extra can't be added here (that's Add prepayment).
 */
export function MarkPaidDialog({ forms, installmentId, editing = false, onClose, onSaved }: { forms: LoanFormsData; installmentId?: string; editing?: boolean; onClose: () => void; onSaved: (undo: { id: string; message: string }) => void }) {
  const [state, formAction, pending] = useActionState(editing ? editEmiPayment : markEmiPaid, IDLE);
  const due = editing
    ? forms.loans.flatMap((l) => l.installments.filter((i) => i.id === installmentId && i.status === "Paid").map((i) => ({ i, l })))
    : forms.loans
        .filter((l) => l.loan.status === "Active")
        .flatMap((l) => l.installments.filter((i) => i.status === "Pending").slice(0, 3).map((i) => ({ i, l })))
        .sort((a, b) => (a.i.dueDate < b.i.dueDate ? -1 : 1));
  const first = due.find((d) => d.i.id === installmentId) ?? due[0];
  // Where the loan's EMIs usually come from; an EMI being edited starts at where it was paid from.
  const placeOf = (d?: (typeof due)[number]) => {
    const card = editing ? d?.i.paidFromCardId : d?.l.loan.emiPaidFromCardId;
    const account = editing ? d?.i.paidFromAccountId : d?.l.loan.emiPaidFromAccountId;
    return card ? `card:${card}` : account ? `account:${account}` : "";
  };
  const [chosen, setChosen] = useState(first?.i.id ?? "");
  const [paidDate, setPaidDate] = useState((editing && first?.i.paidDate) || forms.today);
  const [amountPaid, setAmount] = useState(first ? String(editing ? (first.i.amountPaid ?? Math.round(first.i.totalDue)) : Math.round(first.i.totalDue)) : "");
  const [overdueCharge, setOverdue] = useState(editing && first?.i.overdueCharge ? String(first.i.overdueCharge) : "");
  const [chargedTo, setChargedTo] = useState(placeOf(first));
  const [effect, setEffect] = useState<string>(first ? usualEffect(first.l.loan) : "Reduce-Tenure");
  const [charge, setCharge] = useState("");
  const [chargeTouched, setChargeTouched] = useState(false);

  const picked = due.find((d) => d.i.id === chosen);
  const paid = parseAmountText(amountPaid) ?? 0;
  const extra = picked ? excessOverEmi(picked.i, paid, parseAmountText(overdueCharge) ?? 0) : 0;
  const autoCharge = picked && extra && !editing ? prepaymentCharge(picked.l.loan, extra) : 0;
  const values = { installmentId: chosen, paidDate, amountPaid, overdueCharge, chargedTo, effect, charge: chargeTouched ? charge : String(autoCharge) };
  const read = readMarkPaidForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id), installmentIds: due.map((d) => d.i.id) }, forms.today);
  // The same rules the action checks: no part-payments, and no extra that can't go into the EMIs.
  const problem = read.ok && picked ? (editing ? editPaymentProblem(picked.i, read.input.amountPaid, read.input.overdueCharge) : markPaidProblem(picked.i, picked.l.installments, read.input.amountPaid, read.input.overdueCharge)) : null;
  const check: typeof read = problem ? { ok: false, errors: { amountPaid: problem } } : read;
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
    const next = due.find((d) => d.i.id === id);
    const before = picked;
    setChosen(id);
    if (!next) return;
    if (!before || paid === Math.round(before.i.totalDue)) setAmount(String(Math.round(next.i.totalDue)));
    if (chargedTo === placeOf(before)) setChargedTo(placeOf(next));
    setEffect(usualEffect(next.l.loan));
  }

  // What the extra would do, on this loan's schedule with this EMI paid.
  let after: ReturnType<typeof rebuildSchedule> | null = null;
  if (picked && extra && !problem) {
    try {
      after = rebuildSchedule(picked.l.loan, picked.l.installments, { date: paidDate || forms.today, amount: extra, effect: effect as "Reduce-Tenure" | "Reduce-Emi", afterInstallment: picked.i.installmentNumber });
    } catch {
      after = null;
    }
  }

  return (
    <FormDialog
      icon={<CheckIcon />}
      title={editing ? "Edit payment" : "Mark paid"}
      subtitle={editing ? "Correct how an EMI was paid" : "An EMI, with anything extra"}
      preview={
        <PreviewPanel caption={after ? "The interest in the month of a prepayment follows a proposed rule, so the figures after it are estimates until a bank letter confirms them." : editing ? "Only this payment changes. The EMI and the rest of the schedule stay as they are." : "Mark it paid once the debit has gone through."}>
          {picked ? (
            <>
              <div className="flex flex-col gap-3 rounded-[16px] bg-surface p-4">
                <span className="flex items-center gap-3">
                  <LoanIcon category={picked.l.loan.category} colorKey={picked.l.colorKey} size={40} />
                  <span className="min-w-0">
                    <b className="block truncate text-[15px] font-extrabold">
                      {picked.l.loan.name} · EMI {picked.i.installmentNumber} of {picked.l.installments.length}
                    </b>
                    <span className="text-xs font-semibold text-muted">due {formatShortDate(picked.i.dueDate)}</span>
                  </span>
                </span>
                <b className="text-[28px] leading-none font-extrabold tabular-nums">{paid ? formatInr(paid) : "₹—"}</b>
              </div>
              {extra > 0 && !editing && (
                <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                  <Line label="This EMI, recorded as" value={formatInr(picked.i.totalDue + (parseAmountText(overdueCharge) ?? 0))} />
                  <Line label="Prepayment (paid over the EMI)" value={formatInr(extra)} strong />
                  <Line label="Charge on the prepayment" value={formatInr(parseAmountText(values.charge) ?? 0)} />
                </dl>
              )}
              {after && (
                <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
                  <span className="mb-1 w-fit rounded-full bg-accent-tint px-2.5 py-0.5 text-[11px] font-extrabold text-accent-text">Estimate</span>
                  <Line label="Still owed" value={`${formatInr(after.balanceBefore)} → ${formatInr(after.balanceAfter)}`} />
                  {after.closes ? (
                    <Line label="The loan" value="Closes" strong />
                  ) : (
                    <>
                      <Line label="EMI from the next one" value={`${formatInr(after.emiBefore)} → ${formatInr(after.emiAfter)}`} />
                      <Line label="Ends" value={formatDate(after.added.at(-1)!.dueDate)} />
                    </>
                  )}
                  <Line label="Interest saved" value={formatInr(after.interestSaved)} strong />
                </dl>
              )}
            </>
          ) : (
            <p className="rounded-[16px] bg-surface p-4 text-sm font-semibold text-muted">{editing ? "This EMI isn't paid." : "No EMIs are due."}</p>
          )}
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">{editing ? "" : extra ? "Both rows are saved together, so the extra is never lost inside the EMI's amount." : "You can undo it for a few seconds after saving."}</span>}
      primaryLabel={editing ? "Save changes" : "Mark paid"}
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
          <Field id="installmentId" label="EMI" required error={errors.installmentId}>
            {editing ? (
              <>
                <input type="hidden" name="installmentId" value={chosen} />
                <p className="flex h-10 items-center rounded-[12px] bg-fill px-3.5 text-sm font-semibold">{picked ? `${picked.l.loan.name} · EMI ${picked.i.installmentNumber}` : "—"}</p>
              </>
            ) : (
            <SelectInput id="installmentId" name="installmentId" invalid={Boolean(errors.installmentId)} options={due.map((d) => ({ value: d.i.id, label: `${d.l.loan.name} · EMI ${d.i.installmentNumber}`, meta: `${formatInr(d.i.totalDue)} · ${formatShortDate(d.i.dueDate)}`, swatch: { background: `var(--card-${d.l.colorKey})` } }))} value={chosen} onChange={choose} placeholder="Choose the EMI" />
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Due on</span>
          <p className="flex h-10 items-center rounded-[12px] bg-fill px-3.5 text-sm font-semibold">{picked ? formatDate(picked.i.dueDate) : "—"}</p>
        </div>
        <Field id="paidDate" label="Paid on" required error={errors.paidDate}>
          <DateInput {...describedBy("paidDate", errors.paidDate, false)} label="Paid on" name="paidDate" value={paidDate} onChange={setPaidDate} onBlur={() => reveal("paidDate")} today={forms.today} invalid={Boolean(errors.paidDate)} />
        </Field>
        <Field id="amountPaid" label="Amount paid" required help={picked ? (editing ? `The EMI is ${formatInr(picked.i.totalDue)}. Extra goes in with Add prepayment.` : `The EMI is ${formatInr(picked.i.totalDue)}. The form starts there.`) : undefined} error={errors.amountPaid}>
          <MoneyInput {...describedBy("amountPaid", errors.amountPaid, Boolean(picked))} data-autofocus name="amountPaid" value={amountPaid} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amountPaid")} invalid={Boolean(errors.amountPaid)} />
        </Field>
        <Field id="overdueCharge" label="Overdue charge" help={editing ? undefined : "Anything above the EMI and this is a prepayment."} error={errors.overdueCharge}>
          <MoneyInput {...describedBy("overdueCharge", errors.overdueCharge, !editing)} name="overdueCharge" value={overdueCharge} onChange={(e) => setOverdue(e.target.value)} onBlur={() => reveal("overdueCharge")} invalid={Boolean(errors.overdueCharge)} />
        </Field>
        <div className="md:col-span-2">
          <ChargedToField label="Paid from" value={chargedTo} onChange={setChargedTo} forms={{ cards: forms.cards, accounts: forms.accounts }} help="Where the debit came from." error={errors.chargedTo} />
        </div>
        {extra > 0 && picked && !editing && (
          <>
            <p role="status" className="rounded-[12px] bg-warning-tint px-3.5 py-2.5 text-xs font-semibold text-warning-text md:col-span-2">
              <b className="font-extrabold">{formatInr(extra)} above the EMI goes to principal as a prepayment.</b> The EMI is recorded at its own {formatInr(picked.i.totalDue)}, and the extra becomes a prepayment dated the same day.
            </p>
            <Segmented name="effect" legend="The extra should" options={[{ value: "Reduce-Tenure", label: "Reduce tenure" }, { value: "Reduce-Emi", label: "Reduce EMI" }]} value={effect as "Reduce-Tenure" | "Reduce-Emi"} onChange={setEffect} help={`This loan usually ${usualEffect(picked.l.loan) === "Reduce-Emi" ? "reduces its EMI" : "reduces its tenure"}. Changing it here only affects this prepayment.`} />
            <Field id="charge" label="Prepayment charge" help={picked.l.loan.prepaymentChargePercent ? `${picked.l.loan.prepaymentChargePercent}% + GST of ${formatInr(extra)}. Change it to what the bank took.` : "What the bank took, if anything."} error={errors.charge}>
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
          </>
        )}
      </div>
    </FormDialog>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-extrabold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
