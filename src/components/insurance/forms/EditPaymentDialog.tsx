"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { savePaymentAction } from "@/app/insurance/actions";
import type { FormPayment, FormPolicy, InsuranceFormsData } from "@/app/insurance/formsView";
import { quoteChange, termPreview } from "@/lib/aggregate/insurance";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readPaymentForm } from "@/lib/forms/insuranceForms";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { CheckIcon } from "../../cards/forms/icons";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { ChargedToField } from "../../subscriptions/forms/ChargedToField";
import { TileMark } from "../parts";
import { NcbField } from "./PolicyFormDialog";
import { FormProblem, Line, PreviewCard, YEAR_OPTIONS } from "./shared";

const ICON = { Health: "heart", Life: "user", Motor: "car", Home: "home", Accident: "shield" } as const;

/**
 * Edit payment: a recorded term corrected after the fact. The usual reason is to enter what the PDF didn't say: the day it was paid, and
 * where it was paid from, which the page marks "assumed" and "not recorded" until then. It can't move a term to another policy, and the
 * dates still can't overlap the policy's other terms. A saved correction offers Undo for six seconds.
 */
export function EditPaymentDialog({ forms, payment, policy, onClose, onSaved }: { forms: InsuranceFormsData; payment: FormPayment; policy: FormPolicy; onClose: () => void; onSaved: (undo: { id: string; message: string } | undefined, message: string) => void }) {
  const [state, formAction, pending] = useActionState(savePaymentAction, IDLE);
  const [periodStart, setPeriodStart] = useState(payment.periodStart);
  const [years, setYears] = useState(String(payment.years));
  const [amount, setAmount] = useState(String(payment.amount));
  const [paidOn, setPaidOn] = useState(payment.paidOn);
  const [ncb, setNcb] = useState(payment.ncb);
  const [paidFrom, setPaidFrom] = useState(payment.paidFrom);
  const motor = policy.kind === "Motor";

  const values = { paymentId: payment.id, periodStart, years, amount, paidOn, ncb: motor ? ncb : "", paidFrom };
  const read = readPaymentForm(values, { accountIds: forms.accounts.map((a) => a.id), cardIds: forms.cards.map((c) => c.id) }, motor);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(read, state, values);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (read.ok) return markSubmitted();
    event.preventDefault();
    revealAll();
  }
  useEffect(() => {
    if (state.status === "saved") onSaved(state.undo, `${policy.name} payment saved`);
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const n = Number(years) || 1;
  const paid = parseAmountText(amount) ?? 0;
  const preview = periodStart ? termPreview({ start: periodStart, years: n, amount: paid, cover: policy.sumInsured }) : null;
  const change = paid ? quoteChange({ amount: paid, years: n }, payment.before) : null;

  return (
    <FormDialog
      icon={<CheckIcon />}
      title="Edit payment"
      subtitle={`${policy.name} · ${formatDate(payment.periodStart)}`}
      preview={
        <PreviewPanel caption="Only this payment changes. The policy and its other terms stay as they are.">
          <PreviewCard mark={<TileMark icon={ICON[policy.kind]} colorKey={policy.colorKey} size={40} />} title={policy.name} sub={`${policy.insurer} · ${policy.covers}`} big={paid ? formatInr(paid) : "₹—"} small={n > 1 ? `for ${n} years` : "for the year"} />
          <dl className="flex flex-col gap-1.5 rounded-[16px] bg-surface p-4 text-[12.5px] font-semibold">
            <Line label="Cover" value={periodStart && preview ? `${formatDate(periodStart)} to ${formatDate(preview.end)}` : "—"} strong />
            <Line label="Paid on" value={paidOn ? formatDate(paidOn) : "not recorded (the start is used)"} />
            {paid > 0 && <Line label="A year of it" value={formatInr(paid / n)} />}
            {change !== null && <Line label="Against the term before" value={`${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change * 100).toFixed(1)}%`} />}
          </dl>
        </PreviewPanel>
      }
      footerNote={<span className="max-md:hidden">You can Undo a correction for six seconds after it&apos;s saved.</span>}
      primaryLabel="Save payment"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="paymentId" value={payment.id} />
      <FormProblem message={state.status === "invalid" ? state.errors.form : undefined} />
      <div className="grid gap-x-3.5 gap-y-4 md:grid-cols-2">
        <Field id="paidOn" label="Paid on" help="The day it left your account. Leave it blank if you don't know: the day cover starts is used, and marked assumed." error={errors.paidOn}>
          <DateInput {...describedBy("paidOn", errors.paidOn, true)} data-autofocus label="Paid on" name="paidOn" value={paidOn} onChange={setPaidOn} onBlur={() => reveal("paidOn")} today={forms.today} invalid={Boolean(errors.paidOn)} />
        </Field>
        <Field id="amount" label="Premium" required help={n > 1 ? `What you paid for all ${n} years, with GST.` : "What you paid, with GST."} error={errors.amount}>
          <MoneyInput {...describedBy("amount", errors.amount, true)} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
        <div className="md:col-span-2">
          <ChargedToField name="paidFrom" label="Paid from" value={paidFrom} onChange={setPaidFrom} forms={{ cards: forms.cards, accounts: forms.accounts }} help="An account, or a card. A card's premium is counted once, as a premium." error={errors.paidFrom} />
        </div>
        <Field id="periodStart" label="Cover starts" required help="Change it only if it was recorded wrongly. It can't overlap another term of this policy." error={errors.periodStart}>
          <DateInput {...describedBy("periodStart", errors.periodStart, true)} label="Cover starts" name="periodStart" value={periodStart} onChange={setPeriodStart} onBlur={() => reveal("periodStart")} today={forms.today} invalid={Boolean(errors.periodStart)} />
        </Field>
        <div className="md:col-span-2">
          <Segmented name="years" legend="Cover lasts" required options={YEAR_OPTIONS} value={years} onChange={setYears} error={errors.years} />
        </div>
        {motor && (
          <div className="md:col-span-2">
            <NcbField value={ncb} onChange={setNcb} error={errors.ncb} />
          </div>
        )}
      </div>
    </FormDialog>
  );
}
