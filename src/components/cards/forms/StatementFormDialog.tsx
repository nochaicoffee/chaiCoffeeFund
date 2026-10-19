"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { saveStatement } from "@/app/cards/actions";
import { nextDueAfterAdding } from "@/lib/aggregate/cardEntry";
import { dueDateFor, latestStatementDate } from "@/lib/aggregate/cardSchedule";
import { dueLabel } from "@/lib/aggregate/cardStatements";
import { findDuplicateStatement, readStatementForm } from "@/lib/forms/cardForms";
import type { ClientCard } from "@/lib/forms/clientCard";
import { IDLE } from "@/lib/forms/formState";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { cardName, optionLabel, ordinal } from "@/lib/format/labels";
import { formatInr, formatInrCompact, formatInrExact, parseAmountText } from "@/lib/format/money";
import type { Statement } from "@/lib/sheets/types";
import { cardGradient, cardSwatch } from "../CardTile";
import { StatusPill } from "../StatusPill";
import { Field, MoneyInput, PreviewPanel, describedBy, inputClass } from "./fields";
import { FormDialog } from "./FormDialog";
import { AlertIcon, CheckIcon, DocumentIcon, InfoIcon } from "./icons";
import { MiniCardTile, SummaryRow } from "./MiniCardTile";
import { useFieldErrors } from "./useFieldErrors";

/**
 * Add statement (docs/design/cards-forms.md, artboards 3–5), always saved as
 * Pending. Picking a card fills in its latest statement date and that date plus
 * its days to pay; both stay editable. A statement already on record for the
 * same card and date is flagged and the button becomes Save anyway: it warns,
 * it doesn't block.
 */
export function StatementFormDialog({
  cards,
  statements,
  today,
  initialCardId,
  onClose,
}: {
  cards: ClientCard[];
  statements: Statement[];
  today: string;
  initialCardId?: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveStatement, IDLE);
  const initial = cards.find((c) => c.id === initialCardId);
  const initialDate = initial ? latestStatementDate(initial, today) : "";
  const [cardId, setCardId] = useState(initial?.id ?? "");
  const [statementDate, setStatementDate] = useState(initialDate);
  const [dueDate, setDueDate] = useState(initial ? dueDateFor(initial, initialDate) : "");
  const [dueEdited, setDueEdited] = useState(false);
  const [total, setTotal] = useState("");
  const [minimum, setMinimum] = useState("");

  const card = cards.find((c) => c.id === cardId);
  const values = { cardId, statementDate, dueDate, totalAmountDue: total, minimumAmountDue: minimum };
  const check = readStatementForm(values, { cardIds: cards.map((c) => c.id) });
  const { errors, reveal, revealAll, count, markSubmitted } = useFieldErrors(check, state, values);
  // The server's duplicate check backs this one up when the page's list was out of date,
  // but only for the card and date it was about.
  const serverDuplicate = state.status === "invalid" && state.duplicate?.cardId === cardId && state.duplicate.statementDate === statementDate ? state.duplicate : undefined;
  const duplicate = (cardId && statementDate && findDuplicateStatement(statements, cardId, statementDate)) || serverDuplicate;
  const dateError = errors.statementDate ?? (duplicate ? "Matches an existing statement" : undefined);

  function pickCard(id: string) {
    const picked = cards.find((c) => c.id === id);
    setCardId(id);
    if (!picked) return;
    const date = latestStatementDate(picked, today);
    setStatementDate(date);
    setDueDate(dueDateFor(picked, date));
    setDueEdited(false);
  }

  function changeStatementDate(date: string) {
    setStatementDate(date);
    if (card && !dueEdited && /^\d{4}-\d{2}-\d{2}$/.test(date)) setDueDate(dueDateFor(card, date));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (check.ok) {
      markSubmitted();
      return;
    }
    event.preventDefault();
    revealAll();
  }

  const amount = parseAmountText(total);
  const minimumAmount = parseAmountText(minimum);
  const dated = check.ok || (statementDate && dueDate);
  const bar = nextDueAfterAdding({ cards, statements }, today, card && dated && amount !== null ? { cardId: card.id, dueDate, totalAmountDue: amount } : null);
  const cardsById = new Map(cards.map((c) => [c.id, c]));

  const preview = (
    <PreviewPanel caption="Updates as you type: the card, the statement, and the Next due bar on your dashboard.">
      <div className="max-md:hidden">
        <MiniCardTile card={card && { ...card, name: cardName(card) }} dates={statementDate && dueDate ? `${formatShortDate(statementDate)} → ${formatShortDate(dueDate)}` : undefined} />
      </div>
      <div className="flex flex-col gap-2 rounded-[16px] bg-surface p-4 shadow-soft max-md:p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-extrabold">Statement</span>
          <StatusPill status="Pending" />
        </div>
        <SummaryRow label="Statement date">{statementDate ? formatShortDate(statementDate) : "–"}</SummaryRow>
        <SummaryRow label="Due" strong>
          {dueDate ? `${formatShortDate(dueDate)} · ${dueLabel({ status: "Pending", dueDate }, today)}` : "–"}
        </SummaryRow>
        <SummaryRow label="Total due" strong>
          {amount !== null ? formatInrExact(amount) : "–"}
        </SummaryRow>
        <SummaryRow label="Minimum due">{minimumAmount !== null ? formatInrExact(minimumAmount) : "–"}</SummaryRow>
      </div>

      {duplicate ? (
        <div className="flex items-start gap-2 rounded-[14px] border border-warning/40 bg-surface px-3.5 py-3 text-xs font-semibold" role="status">
          <span className="text-warning">
            <AlertIcon />
          </span>
          <span>
            <b>Already on record.</b> You have a {card ? cardName(card) : "card"} statement for {formatDate(duplicate.statementDate)} ({formatInr(duplicate.totalAmountDue)},{" "}
            {duplicate.status.toLowerCase()}).{" "}
            <Link href={`/cards/statements?card=${cardId}&period=${duplicate.statementDate.slice(0, 4)}`} className="font-bold text-accent-text hover:underline">
              View it →
            </Link>
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted">
              Next due after saving · {bar.count} pending
            </span>
            <span className="text-[15px] font-extrabold tabular-nums">{formatInr(bar.total)}</span>
          </div>
          {bar.count > 0 && (
            <div className="flex h-[26px] gap-[3px] overflow-hidden rounded-[9px]" role="img" aria-label={`Pending after saving: ${bar.segments.map((s) => `${s.isNew ? "new " : ""}${cardName(cardsById.get(s.cardId) ?? { name: "Card" })} ${formatInr(s.amount)}`).join(", ")}`}>
              {bar.segments.map((s, i) => {
                const share = bar.total > 0 ? s.amount / bar.total : 1 / bar.count;
                return (
                  <div
                    key={i}
                    className={`flex min-w-[6px] items-center overflow-hidden pl-2 text-[10px] font-extrabold whitespace-nowrap text-on-accent ${s.isNew ? "outline-2 -outline-offset-2 outline-dashed outline-on-card" : ""}`}
                    style={{ width: `${share * 100}%`, background: s.isNew ? cardGradient(cardsById.get(s.cardId)?.color) : cardSwatch(cardsById.get(s.cardId)?.color) }}
                  >
                    {share >= 0.18 && `${s.isNew ? "New · " : ""}${formatInrCompact(s.amount)}`}
                  </div>
                );
              })}
            </div>
          )}
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-muted">
            <InfoIcon />
            The new statement joins your other pending bills.
          </p>
        </div>
      )}
    </PreviewPanel>
  );

  return (
    <FormDialog
      icon={<DocumentIcon />}
      title="Add statement"
      subtitle="Fill it in and watch it land on your dashboard"
      preview={preview}
      footerNote={
        <Link href="/cards/statements" className="hover:text-fg">
          Or use Sync statements to import from email
        </Link>
      }
      primaryLabel={duplicate ? "Save anyway" : "Save statement"}
      pending={pending}
      errorCount={count}
      saveFailed={state.status === "failed"}
      close={state.status === "saved"}
      onClose={onClose}
      formProps={{ action: formAction, onSubmit }}
    >
      {duplicate && <input type="hidden" name="saveAnyway" value="1" />}
      {errors.form && (
        <p role="alert" className="text-xs font-semibold text-negative">
          {errors.form}
        </p>
      )}

      <fieldset aria-describedby={errors.cardId ? "statement-card-error" : undefined}>
        <legend className="mb-2 text-[11px] font-bold tracking-[0.04em] text-muted uppercase">
          Card<span className="text-negative" aria-hidden="true"> *</span>
        </legend>
        {cards.length === 0 ? (
          <p className="text-sm font-semibold text-muted">Add a card first, then its statements.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {cards.map((c, i) => (
              <label key={c.id} className="relative">
                <input type="radio" name="cardId" value={c.id} checked={cardId === c.id} onChange={() => pickCard(c.id)} onBlur={() => reveal("cardId")} className="peer sr-only" data-autofocus={i === 0 && !initial ? true : undefined} />
                <span className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[14px] border border-surface-line bg-surface px-3 py-2 peer-checked:border-accent peer-checked:bg-accent-tint/40 peer-checked:ring-[3px] peer-checked:ring-accent/20 peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  <span className="h-[18px] w-7 shrink-0 rounded-[5px] shadow-[0_2px_5px_oklch(0_0_0/0.18)]" style={{ background: cardGradient(c.color) }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-xs font-bold">{cardName(c)}</span>
                    <span className="block truncate text-[10px] font-semibold text-muted">{optionLabel(c.issuer)}</span>
                  </span>
                  {cardId === c.id && (
                    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                      <CheckIcon />
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.cardId && (
          <p id="statement-card-error" className="mt-1.5 text-[11px] font-semibold text-negative">
            {errors.cardId}
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
        <Field
          id="statement-date"
          label="Statement date"
          required
          error={dateError}
          help={card ? <span className="text-accent-text">{cardName(card)}&rsquo;s latest statement (billed on the {ordinal(card.statementDay)}).</span> : undefined}
        >
          <input {...describedBy("statement-date", dateError, Boolean(card))} type="date" name="statementDate" value={statementDate} max={today} onChange={(e) => changeStatementDate(e.target.value)} onBlur={() => reveal("statementDate")} className={inputClass(Boolean(dateError))} data-autofocus={initial ? true : undefined} />
        </Field>
        <Field id="statement-due" label="Due date" required error={errors.dueDate} help={card ? <span className="text-accent-text">{card.dueDayBuffer} days later: the card&rsquo;s days to pay.</span> : undefined}>
          <input
            {...describedBy("statement-due", errors.dueDate, Boolean(card))}
            type="date"
            name="dueDate"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setDueEdited(true);
            }}
            onBlur={() => reveal("dueDate")}
            className={inputClass(Boolean(errors.dueDate))}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
        <Field id="statement-total" label="Total amount due" required error={errors.totalAmountDue} help="Negative for a credit balance.">
          <MoneyInput {...describedBy("statement-total", errors.totalAmountDue, true)} name="totalAmountDue" value={total} onChange={(e) => setTotal(e.target.value)} onBlur={() => reveal("totalAmountDue")} placeholder="38,500" invalid={Boolean(errors.totalAmountDue)} />
        </Field>
        <Field id="statement-minimum" label="Minimum amount due" required error={errors.minimumAmountDue}>
          <MoneyInput {...describedBy("statement-minimum", errors.minimumAmountDue, false)} name="minimumAmountDue" value={minimum} onChange={(e) => setMinimum(e.target.value)} onBlur={() => reveal("minimumAmountDue")} placeholder="3,850" invalid={Boolean(errors.minimumAmountDue)} />
        </Field>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-muted">
        <InfoIcon />
        Saved as Pending. Mark it paid from the Statements list when you pay it.
      </p>
    </FormDialog>
  );
}
