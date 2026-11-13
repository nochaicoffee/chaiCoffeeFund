import type { Flows } from "@/lib/aggregate/accountFlows";
import { formatInrCompact } from "@/lib/format/money";

/**
 * What each of the money section's four tiles is made of, as the rows under its figure and the parts of its bar. Plain, already-formatted
 * data (the view builds them from `Flows` and the income split); the component only draws them.
 */
export type ShareKind = "income" | "borrowed" | "cardBills" | "emis" | "bigSpends" | "subscriptions" | "cashUpi" | "sentLoan" | "sentOwn" | "takenBack" | "lent";

export interface MoneyShare {
  kind: ShareKind;
  name: string;
  value: number;
  text: string;
}

const share = (kind: ShareKind, name: string, value: number, text = formatInrCompact(value)): MoneyShare => ({ kind, name, value, text });

/** Income sources shown by name; the rest are one "Other income", so a tile never grows past five rows. */
export const INCOME_ROWS = 3;

/** What came in: each income source, biggest first, then money borrowed on its own row (it isn't income). */
export function incomeShares(sources: { source: string; amount: number }[], borrowed: number): MoneyShare[] {
  const named = sources.filter((s) => s.amount > 0).slice(0, INCOME_ROWS).map((s) => share("income", s.source, s.amount));
  const other = sources.filter((s) => s.amount > 0).slice(INCOME_ROWS).reduce((total, s) => total + s.amount, 0);
  return [...named, ...(other > 0 ? [share("income", "Other income", other)] : []), ...(borrowed > 0 ? [share("borrowed", "Borrowed", borrowed)] : [])];
}

/** What was spent: the recorded parts, then the cash and UPI that left with no record. Parts with nothing in them are left out. */
export function spentShares(f: Pick<Flows, "out">, cashUpiOut: number): MoneyShare[] {
  return [
    share("cardBills", "Card bills", f.out["Card bills"]),
    share("emis", "EMIs", f.out.EMIs),
    share("bigSpends", "Big spends", f.out["Big spends"]),
    share("subscriptions", "Subscriptions", f.out.Subscriptions),
    share("cashUpi", "Cash and UPI", cashUpiOut),
  ].filter((s) => s.value > 0);
}

/**
 * What was invested: what was sent to brokers, split into the part the loan could have paid for and the rest, and what they sent back.
 * Money is money, so the split is a rule and not a record: what was sent is taken to be the borrowed money first, up to what was
 * borrowed. (In his case the whole loan went to his INDmoney accounts, so the rule is exact there.)
 */
export function investedShares(f: Pick<Flows, "sent" | "takenBack" | "borrowed">): MoneyShare[] {
  const fromLoan = Math.min(f.borrowed, f.sent);
  return [
    share("sentLoan", "Sent from the loan", fromLoan),
    share("sentOwn", "Sent from your money", f.sent - fromLoan),
    share("takenBack", "Back from brokers", f.takenBack, `−${formatInrCompact(f.takenBack)}`),
  ].filter((s) => s.value > 0);
}

/** What the Left in the bank tile names beside the balances: money out with people, which isn't spending. */
export function leftShares(f: Pick<Flows, "lent">): MoneyShare[] {
  return f.lent > 0 ? [share("lent", "Lent to people", f.lent)] : [];
}
