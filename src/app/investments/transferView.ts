import { formatShortDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import type { Account, Transfer } from "@/lib/sheets/types";

/** One transfer between a bank account and a broker, as the Transfers card lists it. Plain, already-formatted data. */
export interface TransferRow {
  id: string;
  date: string;
  title: string;
  /** "Sent to a broker" or "Back from a broker", with the reference when there is one. */
  detail: string;
  amountText: string;
}

/** How many the card lists: the newest ones; an older one is changed in the Sheet. */
export const TRANSFER_ROWS = 8;

const isBroker = (a: Account | undefined) => a?.accountType === "Brokerage";

/**
 * The newest transfers between one of his bank accounts and a Brokerage account, either way, newest first. A transfer between two banks, or
 * with an account that isn't in Accounts any more, isn't this card's business. The amount is in the money that left.
 */
export function transferRows(transfers: Transfer[], accounts: Account[]): TransferRow[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const rows: TransferRow[] = [];
  for (const t of [...transfers].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    const from = byId.get(t.fromAccountId);
    const to = byId.get(t.toAccountId);
    if (!from || !to || isBroker(from) === isBroker(to)) continue;
    rows.push({
      id: t.id,
      date: formatShortDate(t.date),
      title: `${from.name} → ${to.name}`,
      detail: `${isBroker(to) ? "Sent to a broker" : "Back from a broker"}${t.reference ? ` · ${t.reference}` : ""}`,
      amountText: formatMoney(from.currency ?? "INR", t.amount),
    });
    if (rows.length === TRANSFER_ROWS) break;
  }
  return rows;
}
