"use client";

import { useActionState, useState, type FormEvent } from "react";
import { recordPayment } from "@/app/subscriptions/actions";
import type { FormsData } from "@/app/subscriptions/formsView";
import { CYCLE_STEP_MONTHS } from "@/lib/aggregate/recurring";
import { formatDayDate, formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { categoryColor, cycleWord } from "@/lib/format/subscriptionLabels";
import { IDLE } from "@/lib/forms/formState";
import { chargedToValue, offPlan, readPaymentForm } from "@/lib/forms/subscriptionForms";
import { DateInput, Field, MoneyInput, PreviewPanel, SelectInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { CheckIcon } from "../icons";
import { ChargedToField } from "./ChargedToField";

function Row({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium text-muted">{label}</span>
      <b className={`font-extrabold whitespace-nowrap tabular-nums ${tone === "up" ? "text-negative" : tone === "down" ? "text-positive" : ""}`}>{value}</b>
    </div>
  );
}

/**
 * Record a payment, as designed in design/subscriptions/SubsForms.dc.html: it starts at
 * the renewal it's for (the oldest not recorded, or the next to come), the plan's price
 * and where it's usually charged. When the amount is off the plan by the price-change
 * rule, it offers to update the plan's price from now on, ticked.
 */
export function PaymentFormDialog({ subscriptionId, forms, onClose }: { subscriptionId?: string; forms: FormsData; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(recordPayment, IDLE);
  const recordable = forms.subscriptions.filter((s) => s.status === "Active" || s.id === subscriptionId);
  const startFor = (id: string) => {
    const s = forms.subscriptions.find((x) => x.id === id);
    const c = forms.context[id];
    return { date: c?.renewalDate ?? forms.today, amount: s ? s.amount.toLocaleString("en-IN") : "", chargedTo: s ? chargedToValue(s) : "" };
  };
  const [subscription, setSubscription] = useState(subscriptionId ?? "");
  const initial = startFor(subscriptionId ?? "");
  const [paymentDate, setPaymentDate] = useState(subscriptionId ? initial.date : forms.today);
  const [amount, setAmount] = useState(initial.amount);
  const [chargedTo, setChargedTo] = useState(initial.chargedTo);
  const [updatePlan, setUpdatePlan] = useState(true);

  const values = { subscriptionId: subscription, paymentDate, amount, chargedTo, updatePlan: updatePlan ? "1" : "" };
  const known = { subscriptionIds: forms.subscriptions.map((s) => s.id), cardIds: forms.cards.map((c) => c.id), accountIds: forms.accounts.map((a) => a.id) };
  const check = readPaymentForm(values, known);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) {
      markSubmitted();
      return;
    }
    event.preventDefault();
    revealAll();
  }

  function choose(id: string) {
    setSubscription(id);
    // A new pick starts again from its own renewal, price and card.
    const start = startFor(id);
    setPaymentDate(start.date);
    setAmount(start.amount);
    setChargedTo(start.chargedTo);
    reveal("subscriptionId");
  }

  const s = forms.subscriptions.find((x) => x.id === subscription);
  const c = s ? forms.context[s.id] : undefined;
  const paid = parseAmountText(amount);
  const diff = s && paid !== null ? paid - s.amount : 0;
  const offersUpdate = Boolean(s && paid !== null && paid > 0 && offPlan(paid, s.amount));
  // Your monthly total once the plan's price is updated: this one's share at the new price instead of the old.
  const after = s && s.status === "Active" && paid !== null ? forms.monthlyTotal - (c?.monthly ?? 0) + paid / CYCLE_STEP_MONTHS[s.billingCycle] : forms.monthlyTotal;
  const card = forms.cards.find((x) => s?.defaultPaidFromCardId === x.id);
  const account = forms.accounts.find((x) => s?.defaultPaidFromAccountId === x.id);

  const preview = (
    <PreviewPanel>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface/80 px-3.5 py-3">
        <Row label="Renewal" value={c?.renewalDate ? formatDayDate(c.renewalDate) : "–"} />
        <Row label="Plan's price" value={s ? formatInr(s.amount) : "–"} />
        <Row label="This payment" value={paid !== null ? formatInr(paid) : "–"} tone={diff > 0 ? "up" : diff < 0 ? "down" : undefined} />
        {s && paid !== null && (
          <span className={`self-end text-[11px] font-bold ${diff === 0 ? "text-accent-text" : diff > 0 ? "text-negative" : "text-positive"}`}>
            {diff === 0 ? "✓ Matches the plan" : `${diff > 0 ? "↑" : "↓"} ${formatInr(Math.abs(diff))} ${diff > 0 ? "over" : "under"} the plan`}
          </span>
        )}
      </div>
      <span className="text-[11px] font-extrabold tracking-[0.06em] text-accent-text uppercase max-md:hidden">After this payment</span>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface/80 px-3.5 py-3">
        <Row label="Next renewal" value={c?.after ? formatShortDate(c.after) : "–"} />
        <Row label="Paid so far" value={c && paid !== null ? `${formatInr(c.paid)} → ${formatInr(c.paid + paid)}` : "–"} />
        <Row label="Payments" value={c ? `${c.payments} → ${c.payments + 1}` : "–"} />
      </div>
    </PreviewPanel>
  );

  return (
    <FormDialog
      icon={<CheckIcon size={16} />}
      title="Record a payment"
      subtitle={s ? `${s.alias}${c?.renewalDate ? ` · the renewal on ${formatShortDate(c.renewalDate)}` : ""}` : "For any subscription"}
      preview={preview}
      footerNote="Saves to the SubscriptionPayments tab"
      primaryLabel="Save payment"
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
      <Field
        id="subscriptionId"
        label="Subscription"
        required
        help={s ? `Billed ${s.billingCycle.toLowerCase()} at ${formatInr(s.amount)}.${card || account ? ` Charged to ${(card ?? account)!.name}.` : ""}` : "Paused and cancelled ones aren't listed."}
        error={errors.subscriptionId}
      >
        <SelectInput
          {...describedBy("subscriptionId", errors.subscriptionId, true)}
          name="subscriptionId"
          value={subscription}
          onChange={choose}
          onBlur={() => reveal("subscriptionId")}
          placeholder="Choose subscription"
          options={recordable.map((x) => ({ value: x.id, label: x.alias, meta: `${formatInr(x.amount)} / ${cycleWord(x.billingCycle)}`, swatch: { background: `var(--card-${categoryColor(x.category)})` } }))}
          invalid={Boolean(errors.subscriptionId)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="paymentDate" label="Paid on" required help={s ? "Starts on the renewal date." : undefined} error={errors.paymentDate}>
          <DateInput {...describedBy("paymentDate", errors.paymentDate, Boolean(s))} label="Paid on" name="paymentDate" value={paymentDate} onChange={setPaymentDate} onBlur={() => reveal("paymentDate")} today={forms.today} invalid={Boolean(errors.paymentDate)} />
        </Field>
        <Field
          id="amount"
          label="Amount"
          required
          help={s && paid !== null && diff !== 0 ? `${formatInr(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than the plan's ${formatInr(s.amount)}.` : s ? "Starts at the plan's price." : undefined}
          error={errors.amount}
        >
          <MoneyInput {...describedBy("amount", errors.amount, Boolean(s))} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
        </Field>
      </div>
      <ChargedToField label="Charged to" value={chargedTo} onChange={setChargedTo} forms={forms} help={s ? "Starts with where it's usually charged." : "A card or a bank account."} error={errors.chargedTo} />
      {offersUpdate && s && paid !== null && (
        <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-warning-tint px-4 py-3 text-xs font-semibold text-warning-text">
          <input type="checkbox" name="updatePlan" value="1" checked={updatePlan} onChange={(e) => setUpdatePlan(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--ink)]" />
          <span>
            <b className="block font-extrabold">
              Update {s.alias}&rsquo;s price to {formatInr(paid)} from now on.
            </b>
            Its next renewals are expected at {formatInr(paid)}, and your monthly total goes from {formatInr(forms.monthlyTotal)} to {formatInr(after)}. Leave it unticked for a one-off charge.
          </span>
        </label>
      )}
    </FormDialog>
  );
}
