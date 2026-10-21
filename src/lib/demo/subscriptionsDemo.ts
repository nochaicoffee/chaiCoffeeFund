import { CYCLE_STEP_MONTHS, addMonthsUTC } from "../aggregate/recurring";
import type { SubscriptionData } from "../aggregate/subscriptionPage";
import type { Account, Card, Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * Sample subscriptions from the final design (design/subscriptions/SubsFinal.dc.html),
 * for previewing the Subscriptions page in development with `/subscriptions?demo`,
 * before any real ones exist. Every name, price and date is made up. Never used in
 * production (see isDemoAllowed in cardsDemo.ts), and never written to the Sheet.
 * Payments are one a renewal, from the start date to `today`, at the price in force
 * then, except the renewals listed as `missing` (left unrecorded, to show the flag).
 */

const DEMO_CARDS: Card[] = [
  { id: "demo-millennia", name: "Millennia", alias: "Millennia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 150000, statementDay: 6, dueDayBuffer: 20, status: "Active", last4: "4417", color: "Teal" },
  { id: "demo-ace", name: "Ace", alias: "Ace", issuer: "Axis-Bank", cardType: "Cashback", creditLimit: 90000, statementDay: 14, dueDayBuffer: 20, status: "Active", last4: "2093", color: "Violet" },
  { id: "demo-coral", name: "Coral", alias: "Coral", issuer: "ICICI-Bank", cardType: "Reward-Points", creditLimit: 110000, statementDay: 2, dueDayBuffer: 20, status: "Active", last4: "7781", color: "Copper" },
];

const DEMO_ACCOUNTS: Account[] = [{ id: "demo-kotak", name: "Kotak Savings", bank: "Kotak", accountType: "Savings", purpose: "Spending", startDate: "2019-04-01", status: "Active" }];

const DEMO_SUBSCRIPTIONS: Subscription[] = [
  { id: "demo-netflix", name: "Netflix Premium", alias: "Netflix", category: "Streaming", amount: 649, billingCycle: "Monthly", billingAnchorDate: "2024-02-23", startDate: "2024-02-23", status: "Active", defaultPaidFromCardId: "demo-millennia", color: "Ruby" },
  { id: "demo-icloud", name: "iCloud+ 200 GB", alias: "iCloud+", category: "Cloud-Storage", amount: 219, billingCycle: "Monthly", billingAnchorDate: "2025-04-24", startDate: "2025-04-24", status: "Active", defaultPaidFromCardId: "demo-ace", color: "Violet" },
  { id: "demo-spotify", name: "Spotify Premium", alias: "Spotify", category: "Music", amount: 119, billingCycle: "Monthly", billingAnchorDate: "2023-06-28", startDate: "2023-06-28", status: "Active", defaultPaidFromCardId: "demo-millennia", color: "Teal" },
  { id: "demo-timesprime", name: "Times Prime", alias: "Times Prime", category: "Shopping", amount: 1199, billingCycle: "Yearly", billingAnchorDate: "2024-10-30", startDate: "2024-10-30", status: "Active", defaultPaidFromCardId: "demo-coral", color: "Onyx" },
  { id: "demo-youtube", name: "YouTube Premium", alias: "YouTube", category: "Streaming", amount: 149, billingCycle: "Monthly", billingAnchorDate: "2025-01-02", startDate: "2025-01-02", status: "Active", defaultPaidFromCardId: "demo-ace", color: "Ruby" },
  { id: "demo-chatgpt", name: "ChatGPT Plus", alias: "ChatGPT", category: "Software", amount: 1999, billingCycle: "Monthly", billingAnchorDate: "2025-06-08", startDate: "2025-06-08", status: "Active", defaultPaidFromCardId: "demo-coral", color: "Sapphire" },
  { id: "demo-swiggy", name: "Swiggy One", alias: "Swiggy One", category: "Food", amount: 549, billingCycle: "Quarterly", billingAnchorDate: "2025-09-01", startDate: "2025-09-01", status: "Active", defaultPaidFromAccountId: "demo-kotak", color: "Teal" },
  { id: "demo-prime", name: "Amazon Prime", alias: "Prime", category: "Shopping", amount: 1499, billingCycle: "Yearly", billingAnchorDate: "2022-12-15", startDate: "2022-12-15", status: "Active", defaultPaidFromCardId: "demo-coral", color: "Onyx" },
  { id: "demo-cult", name: "Cult.fit Elite", alias: "Cult.fit", category: "Fitness", amount: 4500, billingCycle: "Quarterly", billingAnchorDate: "2026-01-10", startDate: "2026-01-10", status: "Active", defaultPaidFromAccountId: "demo-kotak", color: "Copper" },
  { id: "demo-m365", name: "Microsoft 365 Family", alias: "Microsoft 365", category: "Software", amount: 6199, billingCycle: "Yearly", billingAnchorDate: "2025-03-03", startDate: "2025-03-03", status: "Active", defaultPaidFromCardId: "demo-millennia", color: "Sapphire" },
  { id: "demo-headspace", name: "Headspace", alias: "Headspace", category: "Fitness", amount: 299, billingCycle: "Monthly", billingAnchorDate: "2025-11-12", startDate: "2025-11-12", status: "Paused", defaultPaidFromCardId: "demo-ace", color: "Copper" },
  { id: "demo-sonyliv", name: "SonyLIV Premium", alias: "SonyLIV", category: "Streaming", amount: 999, billingCycle: "Yearly", billingAnchorDate: "2024-11-03", startDate: "2024-11-03", status: "Cancelled", endDate: "2026-09-14", defaultPaidFromCardId: "demo-millennia", color: "Ruby" },
];

/** How each one's payments went: the price charged from each date, renewals left unrecorded, and a paused one's last payment. */
const DEMO_HISTORY: Record<string, { prices?: [string, number][]; missing?: string[]; lastDate?: string }> = {
  "demo-netflix": { prices: [["2024-02-23", 499], ["2026-07-23", 649]] },
  "demo-icloud": { missing: ["2026-09-24"] },
  "demo-spotify": { prices: [["2023-06-28", 119], ["2026-09-28", 139]] },
  "demo-youtube": { prices: [["2025-01-02", 129], ["2026-03-02", 149]] },
  "demo-headspace": { lastDate: "2026-07-12" },
};

function priceOn(s: Subscription, date: string): number {
  let price = s.amount;
  for (const [from, amount] of DEMO_HISTORY[s.id]?.prices ?? []) if (from <= date) price = amount;
  return price;
}

function demoPayments(s: Subscription, today: string): SubscriptionPayment[] {
  const history = DEMO_HISTORY[s.id] ?? {};
  const until = s.status === "Paused" ? (history.lastDate ?? today) : s.status === "Cancelled" ? (s.endDate ?? today) : today;
  const payments: SubscriptionPayment[] = [];
  for (let i = 0; i < 1000; i++) {
    const date = addMonthsUTC(s.billingAnchorDate, i * CYCLE_STEP_MONTHS[s.billingCycle]);
    if (date > until || date > today) break;
    if (date < s.startDate || history.missing?.includes(date)) continue;
    payments.push({ id: `${s.id}-${date}`, subscriptionId: s.id, paymentDate: date, amount: priceOn(s, date), status: "Paid", paidFromCardId: s.defaultPaidFromCardId, paidFromAccountId: s.defaultPaidFromAccountId });
  }
  return payments;
}

export function demoSubscriptionData(today: string): SubscriptionData {
  return {
    subscriptions: DEMO_SUBSCRIPTIONS,
    payments: DEMO_SUBSCRIPTIONS.flatMap((s) => demoPayments(s, today)),
    cards: DEMO_CARDS,
    accounts: DEMO_ACCOUNTS,
  };
}
