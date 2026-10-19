"use client";

import { useState, type ReactNode } from "react";
import type { PaymentContext } from "@/lib/aggregate/cardEntry";
import type { ClientCard } from "@/lib/forms/clientCard";
import { cardName } from "@/lib/format/labels";
import { formatDate } from "@/lib/format/date";
import type { CardColor, Statement } from "@/lib/sheets/types";
import { ADD_CARD_TILE_CLASS, AddCardTileContent } from "../CardTile";
import { CardFormDialog } from "./CardFormDialog";
import { PlusIcon } from "./icons";
import { MarkPaidDialog } from "./MarkPaidDialog";
import { StatementFormDialog } from "./StatementFormDialog";

/**
 * The buttons that open the Cards forms (#51). Each one mounts its dialog only
 * while it's open, so a long statement list carries no dialogs. With sample
 * data (`disabledReason`), they show disabled, with the reason as a tooltip:
 * sample data never reaches the Sheet.
 */

const PRIMARY = "flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0";
const GHOST = "flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0";
const SMALL = "inline-flex min-h-11 items-center justify-center rounded-full bg-fill px-3 py-1.5 text-[11px] font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-0";

/**
 * A button that opens a form. When it can't be used it stays focusable
 * (aria-disabled rather than disabled), so its reason is announced and shown
 * on hover.
 */
function Trigger({ className, disabledReason, label, onOpen, children }: { className: string; disabledReason?: string; label?: string; onOpen: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={disabledReason ? undefined : onOpen}
      aria-disabled={disabledReason ? true : undefined}
      title={disabledReason}
      aria-label={label}
      className={`${className} ${disabledReason ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
      {disabledReason && <span className="sr-only">{` (${disabledReason})`}</span>}
    </button>
  );
}

interface AccountOption {
  id: string;
  name: string;
}

export function AddCardButton({ accounts, usedColors, disabledReason, variant }: { accounts: AccountOption[]; usedColors: CardColor[]; disabledReason?: string; variant: "header" | "tile" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "tile" ? (
        <Trigger className={ADD_CARD_TILE_CLASS} disabledReason={disabledReason} onOpen={() => setOpen(true)}>
          <AddCardTileContent />
        </Trigger>
      ) : (
        <Trigger className={PRIMARY} disabledReason={disabledReason} onOpen={() => setOpen(true)}>
          <PlusIcon />
          Add card
        </Trigger>
      )}
      {open && <CardFormDialog accounts={accounts} usedColors={usedColors} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Edit card: the Add card dialog, prefilled. Sits on the coloured header of the details card. */
export function EditCardButton({
  card,
  accounts,
  usedColors,
  disabledReason,
  tone = "card",
}: {
  card: ClientCard;
  accounts: AccountOption[];
  usedColors: CardColor[];
  disabledReason?: string;
  /** "card" sits on a coloured card header; "surface" on the page, as a ghost button. */
  tone?: "card" | "surface";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger
        className={
          tone === "card"
            ? "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-on-card-fill px-3 py-1 text-[11px] font-bold text-on-card hover:bg-on-card-line focus-visible:outline-2 focus-visible:outline-on-card md:min-h-0"
            : GHOST
        }
        disabledReason={disabledReason}
        label={`Edit ${cardName(card)}`}
        onOpen={() => setOpen(true)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        {tone === "card" ? "Edit card" : `Edit ${cardName(card)}`}
      </Trigger>
      {open && <CardFormDialog card={card} accounts={accounts} usedColors={usedColors.filter((c) => c !== card.color)} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AddStatementButton({
  cards,
  statements,
  today,
  initialCardId,
  disabledReason,
  variant,
}: {
  cards: ClientCard[];
  statements: Statement[];
  today: string;
  initialCardId?: string;
  disabledReason?: string;
  variant: "primary" | "ghost" | "link";
}) {
  const [open, setOpen] = useState(false);
  const className = variant === "primary" ? PRIMARY : variant === "ghost" ? GHOST : "inline-flex min-h-11 items-center text-xs font-bold text-accent-text hover:underline md:min-h-0";
  return (
    <>
      <Trigger className={className} disabledReason={disabledReason} onOpen={() => setOpen(true)}>
        {variant !== "link" && <PlusIcon />}
        {variant === "link" ? "Add a statement" : "Add statement"}
      </Trigger>
      {open && <StatementFormDialog cards={cards} statements={statements} today={today} initialCardId={initialCardId} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Mark paid on a pending statement, Edit payment on a paid one (#84). Both open the Mark paid dialog. */
export function MarkPaidButton({
  statement,
  card,
  cards,
  accounts,
  context,
  today,
  disabledReason,
}: {
  statement: Statement;
  card: ClientCard;
  cards: ClientCard[];
  accounts: AccountOption[];
  context: PaymentContext;
  today: string;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const editing = statement.status === "Paid";
  const statementName = `${cardName(card)}'s ${formatDate(statement.statementDate)} statement`;
  return (
    <>
      <Trigger className={SMALL} disabledReason={disabledReason} label={editing ? `Edit the payment on ${statementName}` : `Mark ${statementName} paid`} onOpen={() => setOpen(true)}>
        {editing ? "Edit payment" : "Mark paid"}
      </Trigger>
      {open && <MarkPaidDialog statement={statement} card={card} cards={cards} accounts={accounts} context={context} today={today} onClose={() => setOpen(false)} />}
    </>
  );
}
