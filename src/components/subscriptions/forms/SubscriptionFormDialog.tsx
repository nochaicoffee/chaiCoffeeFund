"use client";

import { useActionState, useState, type FormEvent } from "react";
import { saveSubscription } from "@/app/subscriptions/actions";
import type { FormsData } from "@/app/subscriptions/formsView";
import { CYCLE_STEP_MONTHS, addMonthsUTC } from "@/lib/aggregate/recurring";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import { categoryColor, categoryLabel, colorGradient, cycleWord } from "@/lib/format/subscriptionLabels";
import { IDLE } from "@/lib/forms/formState";
import { chargedToValue, readSubscriptionForm } from "@/lib/forms/subscriptionForms";
import { SUBSCRIPTION_CATEGORIES, type RecurrenceCycle, type Subscription, type SubscriptionCategory } from "@/lib/sheets/types";
import { RingTexture } from "../../RingTexture";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, TextInput, describedBy } from "../../cards/forms/fields";
import { FormDialog } from "../../cards/forms/FormDialog";
import { useFieldErrors } from "../../cards/forms/useFieldErrors";
import { EditIcon, RenewIcon } from "../icons";
import { ChargedToField } from "./ChargedToField";

const CYCLES: { value: RecurrenceCycle; label: string }[] = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Yearly", label: "Yearly" },
];
const STATUSES = [
  { value: "Active", label: "Active" },
  { value: "Paused", label: "Paused" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium text-muted">{label}</span>
      <b className="font-extrabold whitespace-nowrap tabular-nums">{value}</b>
    </div>
  );
}

/**
 * Add subscription, and Edit subscription (the same dialog, prefilled, with Status and
 * Delete), as designed in design/subscriptions/SubsForms.dc.html. The cover on the left
 * builds itself as you type, with what it adds to your month. A new price counts from
 * the next renewal; past payments keep what they cost.
 */
export function SubscriptionFormDialog({
  subscription,
  forms,
  onDelete,
  onClose,
}: {
  /** The subscription to edit; without one this is Add subscription. */
  subscription?: Subscription;
  forms: FormsData;
  /** Edit only: asks to delete it (and its payments). */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const editing = Boolean(subscription);
  const context = subscription ? forms.context[subscription.id] : undefined;
  const [state, formAction, pending] = useActionState(saveSubscription, IDLE);
  const [name, setName] = useState(subscription?.name ?? "");
  const [alias, setAlias] = useState(subscription && subscription.alias !== subscription.name ? subscription.alias : "");
  const [category, setCategory] = useState<string>(subscription?.category ?? "");
  const [amount, setAmount] = useState(subscription ? subscription.amount.toLocaleString("en-IN") : "");
  const [billingCycle, setBillingCycle] = useState<RecurrenceCycle | "">(subscription?.billingCycle ?? "Monthly");
  const [nextRenewal, setNextRenewal] = useState(context?.nextRenewal ?? subscription?.billingAnchorDate ?? forms.today);
  const [startDate, setStartDate] = useState(subscription?.startDate ?? forms.today);
  const [status, setStatus] = useState<string>(subscription?.status ?? "Active");
  // One already cancelled without a date can stay that way; switching to Cancelled starts at today.
  const endDateOptional = subscription?.status === "Cancelled" && !subscription.endDate;
  const [endDate, setEndDate] = useState(subscription?.endDate ?? (endDateOptional ? "" : forms.today));
  const [chargedTo, setChargedTo] = useState(subscription ? chargedToValue(subscription) : "");

  const values = { name, alias, category, amount, billingCycle, nextRenewal, startDate, status, endDate, chargedTo };
  const known = { cardIds: forms.cards.map((c) => c.id), accountIds: forms.accounts.map((a) => a.id) };
  const check = readSubscriptionForm(values, known, editing, { endDateOptional });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) {
      markSubmitted();
      return;
    }
    event.preventDefault();
    revealAll();
  }

  // The preview, from whatever's typed so far.
  const price = parseAmountText(amount);
  const cycle = billingCycle || "Monthly";
  const monthly = price !== null ? price / CYCLE_STEP_MONTHS[cycle] : null;
  const color = category ? categoryColor(category as SubscriptionCategory) : "onyx";
  const shortName = (alias || name).trim() || "Name";
  const card = forms.cards.find((c) => chargedTo === `card:${c.id}`);
  const account = forms.accounts.find((a) => chargedTo === `account:${a.id}`);
  const renewals = /^\d{4}-\d{2}-\d{2}$/.test(nextRenewal) ? [0, 1, 2].map((i) => addMonthsUTC(nextRenewal, i * CYCLE_STEP_MONTHS[cycle])) : [];
  const counted = status === "Active";
  const before = forms.monthlyTotal - (subscription?.status === "Active" ? (context?.monthly ?? 0) : 0);
  const after = before + (counted && monthly !== null ? monthly : 0);
  const was = subscription && price !== null && price !== subscription.amount ? subscription.amount : null;

  const preview = (
    <PreviewPanel caption={editing ? undefined : "A yearly or quarterly price is spread over its months for these totals."}>
      <div className="relative isolate flex h-[156px] flex-col justify-between overflow-hidden rounded-[18px] border border-on-card-line border-t-on-card-line-top px-4 py-3.5 text-on-card shadow-[var(--tile-shadow)] max-md:h-[120px]" style={{ background: colorGradient(color), filter: counted ? undefined : "grayscale(0.8)" }}>
        <RingTexture width={280} height={156} dx={10} dy={20} first={40} step={26} count={8} stroke="var(--rings-light)" opacity={0.07} />
        <span className="flex items-center justify-between">
          <span className="flex size-[30px] items-center justify-center rounded-[9px] bg-on-card-fill text-[13px] font-extrabold">{shortName.trim()[0]?.toUpperCase() ?? <RenewIcon />}</span>
          <span className="text-[10px] font-bold text-on-card-faint">{counted ? cycle : status}</span>
        </span>
        <span className="min-w-0">
          <b className="block truncate text-lg">{shortName}</b>
          <span className="text-xs font-semibold text-on-card-muted">
            {price !== null ? formatInr(price) : "₹–"} / {cycleWord(cycle)}
          </span>
          <span className="mt-2 flex items-center justify-between gap-2">
            {renewals[0] && <span className="rounded-full bg-on-card-fill px-2.5 py-0.5 text-[10px] font-bold">Renews {formatShortDate(renewals[0])}</span>}
            <span className="truncate text-[10px] font-semibold text-on-card-faint">{card?.name ?? account?.name ?? ""}</span>
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface/80 px-3.5 py-3">
        <Row label="A month" value={monthly !== null ? (was !== null ? `${formatInr(was / CYCLE_STEP_MONTHS[cycle])} → ${formatInr(monthly)}` : formatInr(monthly)) : "–"} />
        <Row label="A year" value={monthly !== null ? formatInr(monthly * 12) : "–"} />
        {editing && context ? (
          <Row label="Paid so far" value={`${formatInr(context.paid)} · ${context.payments}`} />
        ) : (
          <Row label="Next renewals" value={renewals.length ? renewals.map(formatShortDate).join(" · ") : "–"} />
        )}
      </div>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface/80 px-3.5 py-3">
        <Row label="You pay a month" value={`${formatInr(before)} → ${formatInr(after)}`} />
      </div>
    </PreviewPanel>
  );

  const deleteNote =
    editing && onDelete ? (
      <span className="flex items-center gap-2">
        <button type="button" onClick={onDelete} className="font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Delete subscription
        </button>
        <span>
          Removes it and its {context?.rows ?? 0} {context?.rows === 1 ? "payment" : "payments"}. To keep the history, cancel it instead.
        </span>
      </span>
    ) : (
      "Saves to the Subscriptions tab"
    );

  return (
    <FormDialog
      icon={editing ? <EditIcon size={16} /> : <RenewIcon size={16} />}
      title={subscription ? `Edit ${subscription.alias}` : "Add subscription"}
      subtitle={subscription ? `${subscription.name} · since ${formatDate(subscription.startDate)}` : "Fill it in and see what it adds to your month"}
      preview={preview}
      footerNote={deleteNote}
      primaryLabel={editing ? "Save changes" : "Add subscription"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {subscription && <input type="hidden" name="id" value={subscription.id} />}
      {state.status === "invalid" && state.errors.form && (
        <p role="alert" className="rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
          {state.errors.form}
        </p>
      )}
      <Field id="name" label="Name" required error={errors.name}>
        <TextInput {...describedBy("name", errors.name, false)} name="name" data-autofocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => reveal("name")} placeholder="e.g. Netflix Premium" invalid={Boolean(errors.name)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="alias" label="Short name" help="Shown on tiles and lists. Blank uses the name." error={errors.alias}>
          <TextInput {...describedBy("alias", errors.alias, true)} name="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={name || "e.g. Netflix"} invalid={Boolean(errors.alias)} />
        </Field>
        <Field id="category" label="Category" required help="Picks the colour it's shown in." error={errors.category}>
          <SelectInput
            {...describedBy("category", errors.category, true)}
            name="category"
            value={category}
            onChange={(v) => {
              setCategory(v);
              reveal("category");
            }}
            onBlur={() => reveal("category")}
            placeholder="Choose category"
            options={SUBSCRIPTION_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c), swatch: { background: `var(--card-${categoryColor(c)})` } }))}
            invalid={Boolean(errors.category)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="amount"
          label="Price"
          required
          help={was !== null ? `Was ${formatInr(was)}. The new price counts from the next renewal; past payments keep what they cost.` : "What it costs each time it renews."}
          error={errors.amount}
        >
          <MoneyInput {...describedBy("amount", errors.amount, true)} name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amount")} placeholder="649" invalid={Boolean(errors.amount)} />
        </Field>
        <Segmented name="billingCycle" legend="Billed" required options={CYCLES} value={billingCycle} onChange={setBillingCycle} error={errors.billingCycle} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="nextRenewal" label="Next renewal" required help="Any renewal date works. The app counts forward from it." error={errors.nextRenewal}>
          <DateInput {...describedBy("nextRenewal", errors.nextRenewal, true)} label="Next renewal" name="nextRenewal" value={nextRenewal} onChange={setNextRenewal} onBlur={() => reveal("nextRenewal")} today={forms.today} invalid={Boolean(errors.nextRenewal)} />
        </Field>
        <Field id="startDate" label="Started on" required help="No renewals are expected before this." error={errors.startDate}>
          <DateInput {...describedBy("startDate", errors.startDate, true)} label="Started on" name="startDate" value={startDate} onChange={setStartDate} onBlur={() => reveal("startDate")} today={forms.today} max={forms.today} invalid={Boolean(errors.startDate)} />
        </Field>
      </div>
      <ChargedToField
        label="Usually charged to"
        value={chargedTo}
        onChange={setChargedTo}
        forms={forms}
        help="Mark paid uses this. A charge on a card is part of that card's statement, so it isn't counted again."
        error={errors.chargedTo}
      />
      {editing && (
        <>
          <Segmented name="status" legend="Status" required options={STATUSES} value={status as "Active"} onChange={setStatus} help="Paused and cancelled ones are left out of your totals." error={errors.status} />
          {onDelete && (
            <p className="text-xs font-semibold text-muted md:hidden">
              <button type="button" onClick={onDelete} className="min-h-11 font-bold text-negative">
                Delete subscription
              </button>{" "}
              Removes it and its {context?.rows ?? 0} {context?.rows === 1 ? "payment" : "payments"}.
            </p>
          )}
          {status === "Cancelled" && (
            <Field id="endDate" label="Cancelled on" required={!endDateOptional} help={endDateOptional ? "Saved without a date: renewals stop after its last payment." : "It won't renew after this."} error={errors.endDate}>
              <DateInput {...describedBy("endDate", errors.endDate, true)} label="Cancelled on" name="endDate" value={endDate} onChange={setEndDate} onBlur={() => reveal("endDate")} today={forms.today} invalid={Boolean(errors.endDate)} />
            </Field>
          )}
        </>
      )}
    </FormDialog>
  );
}
