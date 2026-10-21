"use client";

import { useActionState, useState, type FormEvent } from "react";
import { markPaid } from "@/app/cards/actions";
import { afterPayment, billAfterPayment, type PaymentContext } from "@/lib/aggregate/cardEntry";
import { dueLabel, isShort } from "@/lib/aggregate/cardStatements";
import { paymentStatus, readMarkPaidForm, type RestOfBill } from "@/lib/forms/cardForms";
import type { ClientCard } from "@/lib/forms/clientCard";
import { addDays } from "@/lib/forms/dates";
import { IDLE } from "@/lib/forms/formState";
import { ISO_DATE_PATTERN, formatDate, formatShortDate } from "@/lib/format/date";
import { cardName, formatPercent } from "@/lib/format/labels";
import { formatInr, formatInrExact, parseAmountText } from "@/lib/format/money";
import type { Statement } from "@/lib/sheets/types";
import { StatusPill } from "../StatusPill";
import { DateInput, Field, MoneyInput, PreviewPanel, Segmented, SelectInput, describedBy } from "./fields";
import { FormDialog } from "./FormDialog";
import { CheckIcon, DocumentIcon, InfoIcon } from "./icons";
import { MiniCardTile, SummaryRow } from "./MiniCardTile";
import { useFieldErrors } from "./useFieldErrors";

/** An amount as a statement prints it ("1,234.50"); the form reads it back with parseAmountText. */
function amountText(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
}

const REST_OPTIONS = [
  { value: "later", label: "I’ll pay the rest" },
  { value: "final", label: "That’s all I’m paying" },
] as const satisfies readonly { value: RestOfBill; label: string }[];

/**
 * Mark paid (docs/design/cards-forms.md, artboard 6), opened from a pending
 * statement, and Edit payment, opened from a paid one (#84). The amount is the
 * total paid on the bill: Mark paid starts it at the total due (so paying the
 * rest of a part-paid bill is just Save) and the date at today, while Edit
 * payment starts from what's saved, so a second payment is recorded by raising
 * the amount. Short of the total, it asks whether the rest is still to pay: the
 * bill then stays Pending. Paid from is a bank account or another card, never
 * both: switching clears the other. The preview shows what's left on the bill,
 * and outstanding and utilization before and after (`afterPayment`).
 */
export function MarkPaidDialog({
  statement,
  card,
  cards,
  accounts,
  context,
  today,
  onClose,
}: {
  statement: Statement;
  card: ClientCard;
  cards: ClientCard[];
  accounts: { id: string; name: string }[];
  context: PaymentContext;
  today: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(markPaid, IDLE);
  const editing = statement.status === "Paid";
  const recorded = statement.amountPaid ?? 0;
  // A credit balance (a negative total) starts at ₹0: nothing is owed.
  const owed = Math.max(0, statement.totalAmountDue);
  const [amount, setAmount] = useState(amountText(editing ? recorded : owed));
  // Edit payment keeps the saved date; one that isn't a readable date has to be chosen again.
  const [paidDate, setPaidDate] = useState(editing ? (statement.paidDate && ISO_DATE_PATTERN.test(statement.paidDate) ? statement.paidDate : "") : today);
  const saved = savedPaidFrom(statement, card, cards, accounts, editing);
  const [source, setSource] = useState<"account" | "card">(saved.source);
  const [accountId, setAccountId] = useState(saved.accountId);
  const [otherCardId, setOtherCardId] = useState(saved.cardId);
  // A saved underpayment was "That's all I'm paying", so saving an edit unchanged never reopens the bill.
  const [rest, setRest] = useState<RestOfBill>(editing ? "final" : "later");
  const otherCards = cards.filter((c) => c.id !== card.id);

  const paidFrom = source === "account" ? (accountId ? `account:${accountId}` : "") : otherCardId ? `card:${otherCardId}` : "";
  const values = { amountPaid: amount, paidDate, paidFrom, rest };
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

  const typed = parseAmountText(amount);
  const paid = typed !== null && typed >= 0 ? typed : null;
  const short = paid !== null && isShort(statement.totalAmountDue, paid);
  const payment = paid === null ? null : { amountPaid: paid, status: paymentStatus(statement.totalAmountDue, paid, rest) };
  const bill = payment && billAfterPayment(statement, payment);
  const after = payment && afterPayment(context, payment);
  const primaryLabel = editing ? "Save payment" : payment?.status === "Pending" ? "Save part payment" : "Mark paid";

  const preview = (
    <PreviewPanel caption="Shows what's left on this bill, and what your outstanding and utilization become once this is saved.">
      <div className="max-md:hidden">
        <MiniCardTile card={{ ...card, name: cardName(card) }} dates={`${formatShortDate(statement.statementDate)} → ${formatShortDate(statement.dueDate)}`} />
      </div>
      <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4 shadow-soft max-md:p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-extrabold">Statement</span>
          <StatusPill status={bill?.status ?? statement.status} />
        </div>
        <SummaryRow label="Statement date">{formatShortDate(statement.statementDate)}</SummaryRow>
        <SummaryRow label="Due" strong>
          {formatShortDate(statement.dueDate)} · {dueLabel({ status: bill?.status ?? statement.status, dueDate: statement.dueDate }, today)}
        </SummaryRow>
        <SummaryRow label="Total due" strong>
          {formatInrExact(statement.totalAmountDue)}
        </SummaryRow>
        <SummaryRow label="Minimum due">{formatInrExact(statement.minimumAmountDue)}</SummaryRow>
        <div className="mt-1 flex flex-col gap-2 border-t border-divider pt-2">
          {bill?.status === "Pending" ? (
            <>
              <SummaryRow label="Left to pay" strong>
                {formatInrExact(bill.left)}
              </SummaryRow>
              <SummaryRow label="Minimum left">
                {bill.minimumLeft === 0 ? (
                  <span className="inline-flex items-center gap-1 text-accent-text">
                    <CheckIcon /> Covered
                  </span>
                ) : (
                  <span className="text-negative">{formatInrExact(bill.minimumLeft)}</span>
                )}
              </SummaryRow>
            </>
          ) : (
            <SummaryRow label="Variance">
              {!bill || bill.variance.kind === "none" ? (
                "–"
              ) : bill.variance.kind === "full" ? (
                <span className="inline-flex items-center gap-1 text-accent-text">
                  <CheckIcon /> Paid in full
                </span>
              ) : (
                <span className={bill.variance.kind === "under" ? "text-negative" : ""}>
                  {formatInrExact(bill.variance.amount)} {bill.variance.kind === "under" ? "short" : "over"}
                </span>
              )}
            </SummaryRow>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4 shadow-soft max-md:p-3">
        <span className="mb-1 text-sm font-extrabold">After this payment</span>
        <SummaryRow label="Outstanding">
          <s className="font-semibold text-muted">{formatInr(context.before.outstanding)}</s> → {after ? formatInr(after.outstandingAfter) : "–"}
        </SummaryRow>
        <SummaryRow label="Utilization">
          <s className="font-semibold text-muted">{formatPercent(context.before.utilization)}</s> → {after ? formatPercent(after.utilizationAfter) : "–"}
        </SummaryRow>
        <SummaryRow label="Next due">{!after ? "–" : after.pendingAfter.count === 0 ? "Nothing pending" : `${after.pendingAfter.count} pending · ${formatInr(after.pendingAfter.total)}`}</SummaryRow>
      </div>
    </PreviewPanel>
  );

  return (
    <FormDialog
      icon={<DocumentIcon />}
      title={editing ? "Edit payment" : "Mark paid"}
      subtitle={`${cardName(card)} · statement of ${formatDate(statement.statementDate)}`}
      preview={preview}
      footerNote="Saves to the Statements tab"
      primaryLabel={primaryLabel}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      failMessage={state.status === "failed" ? state.message : undefined}
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
        <Field
          id="paid-amount"
          label="Amount paid"
          required
          help={editing ? "The total paid on this bill." : recorded > 0 ? `${formatInrExact(recorded)} recorded so far. Enter the total paid on this bill.` : "Defaults to the total due."}
          error={errors.amountPaid}
        >
          <MoneyInput {...describedBy("paid-amount", errors.amountPaid, true)} name="amountPaid" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => reveal("amountPaid")} invalid={Boolean(errors.amountPaid)} data-autofocus />
        </Field>
        <Field id="paid-date" label="Paid on" required help={editing || recorded > 0 ? "The latest payment's date." : "Defaults to today."} error={errors.paidDate}>
          <DateInput
            {...describedBy("paid-date", errors.paidDate, true)}
            label="Paid on"
            name="paidDate"
            value={paidDate}
            today={today}
            min={statement.statementDate}
            max={today}
            // The calendar offers only those from the statement date to today: a due date still to come isn't one.
            shortcuts={[
              { label: "Today", date: today },
              { label: "Yesterday", date: addDays(today, -1) },
              { label: "Due date", date: statement.dueDate },
            ]}
            onChange={setPaidDate}
            onBlur={() => reveal("paidDate")}
            invalid={Boolean(errors.paidDate)}
          />
        </Field>
      </div>

      {short && (
        <Segmented
          name="rest"
          legend="The rest of the bill"
          required
          options={REST_OPTIONS}
          value={rest}
          onChange={setRest}
          help={
            rest === "later"
              ? `Stays Pending with ${formatInrExact(owed - paid)} left to pay.`
              : `Closes the bill as Paid, ${formatInrExact(owed - paid)} underpaid.`
          }
          error={errors.rest}
        />
      )}

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
            <SelectInput
              aria-label="Bank account"
              value={accountId}
              onChange={setAccountId}
              disabled={accounts.length === 0}
              placeholder={accounts.length === 0 ? "No accounts yet" : "Choose account"}
              options={accounts.length === 0 ? [] : [{ value: "", label: "Not set", display: "Choose account", quiet: true }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
              invalid={Boolean(errors.paidFrom)}
            />
          ) : (
            <SelectInput
              aria-label="Credit card"
              value={otherCardId}
              onChange={setOtherCardId}
              disabled={otherCards.length === 0}
              placeholder={otherCards.length === 0 ? "No other cards" : "Choose card"}
              options={otherCards.length === 0 ? [] : [{ value: "", label: "Not set", display: "Choose card", quiet: true }, ...otherCards.map((c) => ({ value: c.id, label: cardName(c) }))]}
              invalid={Boolean(errors.paidFrom)}
            />
          )}
        </div>
        {errors.paidFrom ? (
          <p id="paid-from-error" className="text-[11px] font-semibold text-negative">
            {errors.paidFrom}
          </p>
        ) : (
          <p id="paid-from-help" className="flex items-start gap-1.5 text-[11px] font-medium text-muted">
            <InfoIcon />
            {editing || saved.fromStatement ? "As saved." : "Starts with the card’s usual account."} A bank account or another card, never both.
          </p>
        )}
      </fieldset>

      <p className="rounded-[14px] bg-fill px-4 py-3 text-xs font-semibold text-muted">
        {editing ? (
          <>
            Paid this bill again? Raise the amount to the total you&rsquo;ve paid on it, and set the date of the latest payment.
          </>
        ) : (
          <>
            Paying less than the total? Choose <span className="text-fg">I&rsquo;ll pay the rest</span> and the bill stays Pending, or <span className="text-fg">That&rsquo;s all I&rsquo;m paying</span> to close it as <span className="text-negative">₹X short</span>. Paying more shows <span className="text-fg">₹X over</span>.
          </>
        )}
      </p>
    </FormDialog>
  );
}

/**
 * Where Paid from starts: what's saved on the statement (Edit payment, or a
 * part-paid bill), else, on Mark paid, the card's usual account. Edit payment
 * leaves a blank Paid from blank, as it was saved.
 */
function savedPaidFrom(statement: Statement, card: ClientCard, cards: ClientCard[], accounts: { id: string }[], editing: boolean) {
  if (statement.paidFromCardId && cards.some((c) => c.id === statement.paidFromCardId && c.id !== card.id)) return { source: "card" as const, accountId: "", cardId: statement.paidFromCardId, fromStatement: true };
  if (statement.paidFromAccountId && accounts.some((a) => a.id === statement.paidFromAccountId)) return { source: "account" as const, accountId: statement.paidFromAccountId, cardId: "", fromStatement: true };
  const usual = !editing && card.defaultPaidFromAccountId && accounts.some((a) => a.id === card.defaultPaidFromAccountId) ? card.defaultPaidFromAccountId : "";
  return { source: "account" as const, accountId: usual, cardId: "", fromStatement: false };
}
