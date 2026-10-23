import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { accountColor } from "@/lib/aggregate/accounts";
import { formatDate } from "@/lib/format/date";
import { formatInrExact } from "@/lib/format/money";
import { cardColorKey, type ColorKey } from "@/lib/format/subscriptionLabels";

/**
 * The balances a bank statement disagreed with, left as recorded until answered: one item per Open
 * review (BalanceReviews), as plain, already-formatted data for the Accounts page. The greeting's
 * "need a look" figure, the card listing them and the chip on a balance in Balance history all read
 * this, so they always agree.
 */
export interface AttentionItem {
  /** The review's id, which answering it sends back. */
  id: string;
  accountId: string;
  accountName: string;
  colorKey: ColorKey;
  /** The day the two balances are for. */
  date: string;
  dateText: string;
  /** The balance on the Sheet, which stays unless the statement's is accepted. */
  recordedText: string;
  statementText: string;
  /** Statement minus recorded: "+₹13" / "−₹13". */
  differenceText: string;
  differenceTone: "up" | "down";
  /** The recorded balance this is about, so its row in Balance history can carry the mark. */
  snapshotId: string;
}

// To the paisa: a gap of ₹13 is the whole point, and a rounded ₹13,692 would hide it.
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatInrExact(Math.abs(n))}`;

/** Every open review of an account that still exists, newest day first. */
export function attentionItems(data: Pick<AccountsData, "accounts" | "reviews">): AttentionItem[] {
  const accounts = new Map(data.accounts.map((a) => [a.id, a]));
  return (data.reviews ?? [])
    .filter((r) => r.status === "Open" && accounts.has(r.accountId))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .map((r): AttentionItem => {
      const account = accounts.get(r.accountId)!;
      const difference = Math.round((r.statementBalance - r.recordedBalance) * 100) / 100;
      return {
        id: r.id,
        accountId: account.id,
        accountName: account.name,
        colorKey: cardColorKey(accountColor(account)),
        date: r.date,
        dateText: formatDate(r.date),
        recordedText: formatInrExact(r.recordedBalance),
        statementText: formatInrExact(r.statementBalance),
        differenceText: signed(difference),
        differenceTone: difference >= 0 ? "up" : "down",
        snapshotId: r.snapshotId,
      };
    });
}

/** The open review about a balance: by the balance it named, or, if that was re-entered, by its account and day. */
export const attentionForSnapshot = (items: AttentionItem[], snapshot: { id: string; accountId: string; date: string }): AttentionItem | undefined =>
  items.find((i) => i.snapshotId === snapshot.id) ?? items.find((i) => i.accountId === snapshot.accountId && i.date === snapshot.date);
