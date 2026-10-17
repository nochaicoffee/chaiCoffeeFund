"use client";

import { useActionState, useState, type FormEvent } from "react";
import { markPaid } from "@/app/cards/actions";
import type { PaymentPreview } from "@/lib/aggregate/cardEntry";
import { dueLabel, paymentVariance } from "@/lib/aggregate/cardStatements";
import { readMarkPaidForm } from "@/lib/forms/cardForms";
import type { ClientCard } from "@/lib/forms/clientCard";
import { IDLE } from "@/lib/forms/formState";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { cardName, formatPercent } from "@/lib/format/labels";
import { formatInr, formatInrExact, parseAmountText } from "@/lib/format/money";
import type { Statement } from "@/lib/sheets/types";
import { StatusPill } from "../StatusPill";
import { Field, MoneyInput, PreviewPanel, SelectInput, describedBy, inputClass } from "./fields";
import { FormDialog } from "./FormDialog";
import { CheckIcon, DocumentIcon, InfoIcon } from "./icons";
import { MiniCardTile, SummaryRow } from "./MiniCardTile";
import { useFieldErrors } from "./useFieldErrors";

/**
 * Mark paid (docs/design/cards-forms.md, artboard 6), opened from a pending
 * statement. The amount starts at the total due, the date at today, and Paid
 * from at the card's usual account. Paid from is a bank account or another card,
 * never both: switching clears the other. The preview shows the variance as you
 * type, and outstanding and utilization before and after (`afterPayment`).
 */
export function MarkPaidDialog({
  statement,
  card,
  cards,
  accounts,
  after,
  today,
  onClose,
}: {
  statement: Statement;
  card: ClientCard;
  cards: ClientCard[];
  accounts: { id: string; name: string }[];
  after: PaymentPreview;
  today: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(markPaid, IDLE);
  // Shown as a statement prints it ("1,234.50"); the form reads it back with parseAmountText.
  // A credit balance (a negative total) starts at ₹0: nothing is owed.
  const owed = Math.max(0, statement.totalAmountDue);
  const [amount, setAmount] = useState(owed.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(owed) ? 0 : 2, maximumFractionDigits: 2 }));
  const [paidDate, setPaidDate] = useState(today);
  const [source, setSource] = useState<"account" | "card">("account");
  const [accountId, setAccountId] = useState(card.defaultPaidFromAccountId && accounts.some((a) => a.id === card.defaultPaidFromAccountId) ? card.defaultPaidFromAccountId : "");
  const [otherCardId, setOtherCardId] = useState("");
  const otherCards = cards.filter((c) => c.id !== card.id);

  const paidFrom = source === "account" ? (accountId ? `account:${accountId}` : "") : otherCardId ? `card:${otherCardId}` : "";
  const values = { amountPaid: amount, paidDate, paidFrom };
  const check = readMarkPaidForm(values, statement, { accountIds: accounts.map((a) => a.id), cardIds: cards.map((c) => c.id) }, today);
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) {
      markSubmitted();
      return;
    }
    event.preventDefault();
    revealAll();
  }

  const paid = parseAmountText(amount);
  const variance = paid === null ? null : paymentVariance({ ...statement, status: "Paid", amountPaid: paid });

  const preview = (
    <PreviewPanel caption="Shows the variance and what your outstanding and utilization become once this is paid.">
      <div className="max-md:hidden">
        <MiniCardTile card={{ ...card, name: cardName(card) }} dates={`${formatShortDate(statement.statementDate)} → ${formatShortDate(statement.dueDate)}`} />
      </div>
      <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4 shadow-soft max-md:p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-extrabold">Statement</span>
          <StatusPill status="Pending" />
        </div>
        <SummaryRow label="Statement date">{formatShortDate(statement.statementDate)}</SummaryRow>
        <SummaryRow label="Due" strong>
          {formatShortDate(statement.dueDate)} · {dueLabel(statement, today)}
        </SummaryRow>
        <SummaryRow label="Total due" strong>
          {formatInrExact(statement.totalAmountDue)}
        </SummaryRow>
        <SummaryRow label="Minimum due">{formatInrExact(statement.minimumAmountDue)}</SummaryRow>
        <div className="mt-1 border-t border-divider pt-2">
          <SummaryRow label="Variance">
            {!variance || variance.kind === "none" ? (
              "–"
            ) : variance.kind === "full" ? (
              <span className="inline-flex items-center gap-1 text-accent-text">
                <CheckIcon /> Paid in full
              </span>
            ) : (
              <span className={variance.kind === "under" ? "text-negative" : ""}>
                {formatInrExact(variance.amount)} {variance.kind === "under" ? "short" : "over"}
              </span>
            )}
          </SummaryRow>
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4 shadow-soft max-md:p-3">
        <span className="mb-1 text-sm font-extrabold">After this payment</span>
        <SummaryRow label="Outstanding">
          <s className="font-semibold text-muted">{formatInr(after.outstandingBefore)}</s> → {formatInr(after.outstandingAfter)}
        </SummaryRow>
        <SummaryRow label="Utilization">
          <s className="font-semibold text-muted">{formatPercent(after.utilizationBefore)}</s> → {formatPercent(after.utilizationAfter)}
        </SummaryRow>
        <SummaryRow label="Next due">{after.pendingAfter.count === 0 ? "Nothing pending" : `${after.pendingAfter.count} pending · ${formatInr(after.pendingAfter.total)}`}</SummaryRow>
      </div>
    </PreviewPanel>
  );

  return (
    <FormDialog
      icon={<DocumentIcon />}
      title="Mark paid"
      subtitle={`${cardName(card)} · statement of ${formatDate(statement.statementDate)}`}
      preview={preview}
      footerNote="Saves to the Statements tab"
      primaryLabel="Mark paid"
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      <input type="hidden" name="id" value={statement.id} />
      <input type="hidden" name="paidFrom" value={paidFrom} />
      {errors.form && (
        <p role="alert" className="text-xs font-semibold text-negative">
          {errors.form}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
        <Field id="paid-amount" label="Amount paid" required help="Defaults to the total due." error={errors.amountPaid}>
          <MoneyInput {...describedBy("paid-amount", errors.amountPaid, true)} name="amountPaid" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amountPaid")} invalid={Boolean(errors.amountPaid)} data-autofocus />
        </Field>
        <Field id="paid-date" label="Paid on" required help="Defaults to today." error={errors.paidDate}>
          <input {...describedBy("paid-date", errors.paidDate, true)} type="date" name="paidDate" value={paidDate} min={statement.statementDate} max={today} onChange={(e) => setPaidDate(e.target.value)} onBlur={() => reveal("paidDate")} className={inputClass(Boolean(errors.paidDate))} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-1.5" aria-describedby={errors.paidFrom ? "paid-from-error" : "paid-from-help"}>
        <legend className="mb-1.5 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
          Paid from <span className="ml-1 text-[10px] font-semibold tracking-[0.02em] text-muted/80">Optional</span>
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex rounded-full bg-fill p-[3px]">
            {(["account", "card"] as const).map((s) => (
              <label key={s} className="relative flex-1">
                <input
                  type="radio"
                  name="paidFromKind"
                  value={s}
                  checked={source === s}
                  // Only one source is ever kept: switching clears the other one's choice.
                  onChange={() => {
                    setSource(s);
                    if (s === "account") setOtherCardId("");
                    else setAccountId("");
                  }}
                  className="peer absolute inset-0 cursor-pointer opacity-0"
                />
                <span className="flex h-[34px] items-center justify-center rounded-full text-xs font-bold text-muted peer-checked:bg-surface peer-checked:text-accent-text peer-checked:shadow-soft peer-focus-visible:outline-2 peer-focus-visible:outline-accent max-md:h-10">
                  {s === "account" ? "Bank account" : "Credit card"}
                </span>
              </label>
            ))}
          </div>
          {source === "account" ? (
            <SelectInput aria-label="Bank account" value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={accounts.length === 0} invalid={Boolean(errors.paidFrom)}>
              <option value="">{accounts.length === 0 ? "No accounts yet" : "Choose account"}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </SelectInput>
          ) : (
            <SelectInput aria-label="Credit card" value={otherCardId} onChange={(e) => setOtherCardId(e.target.value)} disabled={otherCards.length === 0} invalid={Boolean(errors.paidFrom)}>
              <option value="">{otherCards.length === 0 ? "No other cards" : "Choose card"}</option>
              {otherCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {cardName(c)}
                </option>
              ))}
            </SelectInput>
          )}
        </div>
        {errors.paidFrom ? (
          <p id="paid-from-error" className="text-[11px] font-semibold text-negative">
            {errors.paidFrom}
          </p>
        ) : (
          <p id="paid-from-help" className="flex items-start gap-1.5 text-[11px] font-medium text-muted">
            <InfoIcon />
            Starts with the card&rsquo;s usual account. A bank account or another card, never both.
          </p>
        )}
      </fieldset>

      <p className="rounded-[14px] bg-fill px-4 py-3 text-xs font-semibold text-muted">
        Paying less than the total? Enter what you paid: the variance shows <span className="text-negative">₹X short</span>. Paying more shows <span className="text-fg">₹X over</span>.
      </p>
    </FormDialog>
  );
}
