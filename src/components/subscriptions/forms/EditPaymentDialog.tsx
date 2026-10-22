"use client";

import { useActionState, useState, type FormEvent } from "react";
import { updatePayment } from "@/app/subscriptions/actions";
import type { FormsData, PaymentRef } from "@/app/subscriptions/formsView";
import { formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { IDLE } from "@/lib/forms/formState";
import { readEditPaymentForm } from "@/lib/forms/subscriptionForms";
import { DateInput, Field, MoneyInput, PreviewPanel, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { EditIcon } from "../icons";
import { ChargedToField } from "./ChargedToField";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium text-muted">{label}</span>
      <b className="font-extrabold whitespace-nowrap tabular-nums">{value}</b>
    </div>
  );
}

/**
 * Edit payment (#130), from a paid renewal's ⋯ menu on the Renewals page, in the shell of
 * Record a payment: when it was paid, what was charged and where. "It didn't charge"
 * makes it a ₹0 Skipped payment charged nowhere (#125), so its renewal isn't flagged.
 * Delete payment is in the footer, as Delete subscription is in Edit subscription.
 */
export function EditPaymentDialog({ payment, forms, onDelete, onClose }: { payment: PaymentRef; forms: FormsData; onDelete: () => void; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updatePayment, IDLE);
  const [skipped, setSkipped] = useState(payment.status === "Skipped");
  const [paymentDate, setPaymentDate] = useState(payment.paymentDate);
  const [amount, setAmount] = useState(payment.status === "Skipped" ? "" : payment.amount.toLocaleString("en-IN"));
  const [chargedTo, setChargedTo] = useState(payment.chargedTo);

  // A payment charged to a card or account the forms no longer list (a closed card) keeps it as a choice.
  const savedId = payment.chargedTo.slice(payment.chargedTo.indexOf(":") + 1);
  const unlisted = payment.place && !(payment.place.kind === "card" ? forms.cards : forms.accounts).some((x) => x.id === savedId);
  const places: Pick<FormsData, "cards" | "accounts"> = {
    cards: unlisted && payment.place?.kind === "card" ? [...forms.cards, { id: savedId, name: payment.place.name, color: payment.place.color, inactive: true }] : forms.cards,
    accounts: unlisted && payment.place?.kind === "account" ? [...forms.accounts, { id: savedId, name: payment.place.name, inactive: true }] : forms.accounts,
  };

  const values = { paymentDate, amount, chargedTo, skipped: skipped ? "1" : "" };
  const check = readEditPaymentForm(values, { cardIds: places.cards.map((c) => c.id), accountIds: places.accounts.map((a) => a.id) });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) {
      markSubmitted();
      return;
    }
    event.preventDefault();
    revealAll();
  }

  const placeName = (value: string) => {
    const id = value.slice(value.indexOf(":") + 1);
    return value.startsWith("card:") ? places.cards.find((c) => c.id === id)?.name : value.startsWith("account:") ? places.accounts.find((a) => a.id === id)?.name : undefined;
  };
  const describe = (status: string, date: string, paid: number | null, place: string) =>
    status === "Skipped" ? `Didn't charge · ${formatShortDate(date)}` : [paid !== null ? formatInr(paid) : "–", date ? formatShortDate(date) : "–", placeName(place)].filter(Boolean).join(" · ");
  const paid = parseAmountText(amount);

  const preview = (
    <PreviewPanel>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface/80 px-3.5 py-3">
        <Row label="Saved now" value={describe(payment.status, payment.paymentDate, payment.amount, payment.chargedTo)} />
        <Row label="After this" value={describe(skipped ? "Skipped" : "Paid", paymentDate, paid, chargedTo)} />
      </div>
      <p className="text-[11px] font-semibold text-muted max-md:hidden">
        {skipped ? "It stays recorded, at ₹0, so its renewal isn't flagged as not recorded." : "Totals and the price history follow what's saved here."}
      </p>
    </PreviewPanel>
  );

  const deleteNote = (
    <span className="flex items-center gap-2">
      <button type="button" onClick={onDelete} className="min-h-11 font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
        Delete payment
      </button>
      <span className="max-md:hidden">Its renewal shows as not paid again.</span>
    </span>
  );

  return (
    <FormDialog
      icon={<EditIcon size={16} />}
      title="Edit payment"
      subtitle={`${payment.alias} · the renewal on ${formatShortDate(payment.renewalDate)}`}
      preview={preview}
      footerNote={deleteNote}
      primaryLabel="Save changes"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="id" value={payment.id} />
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      {payment.status === "Pending" && (
        <p className="rounded-[12px] bg-warning-tint px-3.5 py-2.5 text-xs font-semibold text-warning-text">
          It&rsquo;s saved as Pending in the Sheet, which the app doesn&rsquo;t use. Saving marks it Paid, or didn&rsquo;t charge if you tick that.
        </p>
      )}
      <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-fill px-4 py-3 text-xs font-semibold text-muted">
        <input type="checkbox" name="skipped" value="1" checked={skipped} onChange={(e) => setSkipped(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--ink)]" />
        <span>
          <b className="block font-extrabold text-fg">It didn&rsquo;t charge</b>A free month or a failed charge: it&rsquo;s kept at ₹0, charged nowhere, so the renewal isn&rsquo;t flagged.
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="paymentDate" label={skipped ? "For the renewal on" : "Paid on"} required error={errors.paymentDate}>
          <DateInput {...describedBy("paymentDate", errors.paymentDate, false)} label={skipped ? "For the renewal on" : "Paid on"} name="paymentDate" value={paymentDate} onChange={setPaymentDate} onBlur={() => reveal("paymentDate")} today={forms.today} invalid={Boolean(errors.paymentDate)} />
        </Field>
        {!skipped && (
          <Field id="amount" label="Amount" required error={errors.amount}>
            <MoneyInput {...describedBy("amount", errors.amount, false)} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} invalid={Boolean(errors.amount)} />
          </Field>
        )}
      </div>
      {!skipped && <ChargedToField label="Charged to" value={chargedTo} onChange={setChargedTo} forms={places} help="A card or a bank account." error={errors.chargedTo} />}
    </FormDialog>
  );
}
