import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { accountColor, sameDayBalance } from "@/lib/aggregate/accounts";
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

/**
 * Every open review of an account that still exists, newest day first. The Sheet's balance shown is the one
 * recorded now, not the one when the review opened: it may have been edited since. If it has come to agree with
 * the statement the question is moot and isn't listed.
 */
export function attentionItems(data: Pick<AccountsData, "accounts" | "reviews" | "snapshots">): AttentionItem[] {
  const accounts = new Map(data.accounts.map((a) => [a.id, a]));
  return (data.reviews ?? [])
    .filter((r) => r.status === "Open" && accounts.has(r.accountId))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .flatMap((r): AttentionItem[] => {
      const account = accounts.get(r.accountId)!;
      const recorded = sameDayBalance(data.snapshots, r.accountId, r.date)?.balance ?? r.recordedBalance;
      if (Math.round(recorded * 100) === Math.round(r.statementBalance * 100)) return [];
      const difference = Math.round((r.statementBalance - recorded) * 100) / 100;
      return [{
        id: r.id,
        accountId: account.id,
        accountName: account.name,
        colorKey: cardColorKey(accountColor(account)),
        date: r.date,
        dateText: formatDate(r.date),
        recordedText: formatInrExact(recorded),
        statementText: formatInrExact(r.statementBalance),
        differenceText: signed(difference),
        differenceTone: difference >= 0 ? "up" : "down",
        snapshotId: r.snapshotId,
      }];
    });
}

/**
 * The open review about a balance: the one for its account and day. Not by the balance's id: a balance moved to
 * another day by Edit balance is no longer what the statement spoke of, and shouldn't carry the mark.
 */
export const attentionForSnapshot = (items: AttentionItem[], snapshot: { id: string; accountId: string; date: string }): AttentionItem | undefined =>
  items.find((i) => i.accountId === snapshot.accountId && i.date === snapshot.date);
