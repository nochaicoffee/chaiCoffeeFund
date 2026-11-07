import type { GreetingCard } from "@/app/investments/views";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { accountColor, isClosed, STALE_DAYS } from "@/lib/aggregate/accounts";
import { idleShare, totalCash, type BrokerCash } from "@/lib/aggregate/brokerCash";
import type { Account } from "@/lib/sheets/types";
import { formatLakh } from "@/lib/format/lakh";
import { formatDate } from "@/lib/format/date";
import { formatInr, formatInrExact, formatMoney } from "@/lib/format/money";

/**
 * Cash at your brokers (docs/design/investments.md, PRD F-IV-18): the uninvested money in each Brokerage account, shown beside the holdings
 * and outside their worth, the split and the yearly return, as plain already-formatted data. The sums are lib/aggregate/brokerCash.ts.
 */

export interface CashTip {
  head: string;
  total: string;
  detail: string;
  rows: { name: string; amount: string }[];
  foot: string;
}

export interface CashTile {
  key: string;
  name: string;
  /** The broker's name, whose first letter is the small mark. */
  broker: string;
  currency: "INR" | "USD";
  /** In its own money: "$3,000.00" or "₹1,00,000". */
  balance: string;
  /** For a dollar account what it is in rupees: "₹2,70,450". */
  inr?: string;
  /** "at ₹90.15 a dollar", or "already in rupees". */
  rateNote: string;
  /** "From a statement" or "Typed in". */
  source: string;
  /** "read Oct 19, 2026" with how long ago it was. */
  readOn: string;
  age: string;
  /** Set when the balance is over 30 days old: "49 days old". */
  stale?: string;
  colorKey: string;
  tip: CashTip;
}

export interface CashView {
  /** The cash in all, as lakhs. */
  total: string;
  /** "2 accounts · $3,000.00 and ₹1,00,000". */
  accountsLine: string;
  brokers: number;
  holdings: string;
  /** What share of everything at the brokers is idle, 0 to 1. */
  idle: number;
  idleText: string;
  /** The holdings' share of what he has at the brokers, as text. */
  investedText: string;
  everything: string;
  tiles: CashTile[];
  /** Dollar accounts left out because today's rate couldn't be had, their dollars still shown. */
  unpriced: { name: string; dollars: string }[];
  reason: string | null;
  /** The card the greeting's "waits as cash" figure points at. */
  greeting: GreetingCard;
}

export interface UnpricedCash {
  name: string;
  dollars: number | null;
}

/** The dollar accounts left out for want of a rate that are broker cash and still open: a closed account or a bank account isn't this card's to name. */
export function unpricedCash(accounts: { account: Account; name: string; dollars: number | null }[]): UnpricedCash[] {
  return accounts.filter((a) => a.account.accountType === "Brokerage" && !isClosed(a.account)).map((a) => ({ name: a.name, dollars: a.dollars }));
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const agoText = (days: number) => (days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);
const PERCENT = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
const SAID = "Counted once in net worth, on Accounts. Here it sits beside the holdings, not inside their worth or your yearly return.";

/** The card from the cash found, what the holdings are worth, and today: null when there is no cash to show at all. */
export function cashView({ cash, holdingsInr, today, usdInr, unpriced = [], reason = null }: { cash: BrokerCash[]; holdingsInr: number; today: string; usdInr: number | null; unpriced?: UnpricedCash[]; reason?: string | null }): CashView | null {
  if (cash.length === 0 && unpriced.length === 0) return null;
  const totalInr = totalCash(cash);
  const idle = idleShare(totalInr, holdingsInr);
  const tiles: CashTile[] = cash.map((c) => {
    const currency = c.account.currency ?? "INR";
    const days = daysBetween(c.date, today);
    const balance = formatMoney(currency, c.balance);
    const rateNote = currency === "USD" && usdInr !== null ? `at ${formatInrExact(usdInr)} a dollar` : "already in rupees";
    return {
      key: c.account.id,
      name: c.account.name,
      broker: c.account.bank,
      currency,
      balance,
      inr: currency === "USD" ? formatInr(c.rupees) : undefined,
      rateNote,
      source: c.source === "Statement" ? "From a statement" : "Typed in",
      readOn: `read ${formatDate(c.date)}`,
      age: agoText(days),
      stale: days > STALE_DAYS ? `${days} days old` : undefined,
      colorKey: accountColor(c.account).toLowerCase(),
      tip: {
        head: c.account.name,
        total: balance,
        detail: currency === "USD" ? `${formatInr(c.rupees)} at today's rate of ${formatInrExact(usdInr ?? 0)}` : "in rupees",
        rows: [
          { name: "Read on", amount: `${formatDate(c.date)} · ${agoText(days)}` },
          { name: "From", amount: c.source === "Statement" ? "a statement" : "typed in by hand" },
          { name: "At the broker", amount: c.account.bank },
        ],
        foot: currency === "USD" ? "A dollar balance has no cost, so the rupee's move on it is not shown as a gain." : "Cash earns nothing here; interest, if the broker pays any, is its own line.",
      },
    };
  });
  const dollars = cash.filter((c) => (c.account.currency ?? "INR") === "USD").reduce((s, c) => s + c.balance, 0);
  const rupees = cash.filter((c) => (c.account.currency ?? "INR") === "INR").reduce((s, c) => s + c.balance, 0);
  const parts = [dollars > 0 ? formatMoney("USD", dollars) : "", rupees > 0 ? formatMoney("INR", rupees) : ""].filter(Boolean).join(" and ");
  const brokers = new Set(cash.map((c) => c.account.bank)).size;
  const total = formatLakh(totalInr);
  return {
    total,
    accountsLine: `${plural(cash.length, "account", "accounts")}${parts ? ` · ${parts}` : ""}`,
    brokers,
    holdings: formatLakh(holdingsInr),
    idle,
    idleText: PERCENT(idle),
    investedText: PERCENT(1 - idle),
    everything: formatLakh(totalInr + holdingsInr),
    tiles,
    unpriced: unpriced.map((u) => ({ name: u.name, dollars: u.dollars === null ? "no balance" : formatMoney("USD", u.dollars) })),
    reason,
    greeting: {
      title: "Cash at your brokers",
      total,
      rows: [
        ...tiles.map((t) => ({ key: t.key, name: t.name, colorKey: t.colorKey, amount: t.inr ? `${t.balance} · ${t.inr}` : t.balance, note: `${t.readOn}, ${t.age}` })),
        { key: "holdings", name: "Holdings", colorKey: "emerald", amount: formatLakh(holdingsInr), note: undefined, fraction: undefined },
      ],
      note: SAID,
    },
  };
}
