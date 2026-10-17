import { addMonths, monthOf, type CardData } from "../aggregate/cardSpend";
import type { Card, Statement } from "../sheets/types";

/**
 * Sample cards and statements from the final design (design/dashboards/CardsListLight.dc.html),
 * for previewing the Cards dashboard in development with `/cards?demo`, before any real
 * cards exist. Never used in production (see isDemoAllowed). The five months of
 * statements end at the most recent statement date on or before `today`; the
 * latest month is pending and the rest are paid in full.
 */
const DEMO_CARDS: Card[] = [
  {
    id: "demo-regalia",
    name: "Regalia Gold",
    alias: "Regalia",
    issuer: "HDFC-Bank",
    cardType: "Reward-Points",
    creditLimit: 120000,
    statementDay: 5,
    dueDayBuffer: 20,
    status: "Active",
    last4: "7042",
    color: "Sapphire",
  },
  {
    id: "demo-amazon",
    name: "Amazon Pay",
    alias: "Amazon",
    issuer: "ICICI-Bank",
    cardType: "Cashback",
    creditLimit: 80000,
    statementDay: 3,
    dueDayBuffer: 20,
    status: "Active",
    last4: "3189",
    color: "Ruby",
  },
  {
    id: "demo-gold",
    name: "Gold Card",
    alias: "Gold",
    issuer: "American-Express",
    cardType: "Reward-Points",
    creditLimit: 200000,
    statementDay: 12,
    dueDayBuffer: 20,
    status: "Active",
    last4: "5560",
    color: "Onyx",
  },
];

/** Oldest to newest, the design's April–August figures. */
const DEMO_TOTALS: Record<string, number[]> = {
  "demo-regalia": [29600, 28100, 35600, 42100, 38500],
  "demo-amazon": [11400, 12300, 14500, 15200, 12400],
};
const STATEMENT_DAY: Record<string, string> = { "demo-regalia": "05", "demo-amazon": "03" };
const DUE_DAY: Record<string, string> = { "demo-regalia": "25", "demo-amazon": "23" };

export function demoCardData(today: string): CardData {
  // The latest statement month: this month once both statements are out, otherwise last month.
  const latest = Number(today.slice(8, 10)) >= 5 ? monthOf(today) : addMonths(monthOf(today), -1);
  const statements: Statement[] = [];
  for (const [cardId, totals] of Object.entries(DEMO_TOTALS)) {
    totals.forEach((total, i) => {
      const month = addMonths(latest, i - (totals.length - 1));
      const pending = i === totals.length - 1;
      statements.push({
        id: `${cardId}-${month}`,
        cardId,
        statementDate: `${month}-${STATEMENT_DAY[cardId]}`,
        dueDate: `${month}-${DUE_DAY[cardId]}`,
        totalAmountDue: total,
        minimumAmountDue: Math.round(total / 10),
        status: pending ? "Pending" : "Paid",
        amountPaid: pending ? undefined : total,
      });
    });
  }
  return { cards: DEMO_CARDS, statements };
}

/** Sample data is a development aid only: never shown in a production build. */
export function isDemoAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}
