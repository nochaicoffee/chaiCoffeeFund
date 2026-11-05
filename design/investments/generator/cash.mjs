// Cash at the brokers (PRD F-IV-18, F-AC-05; wanted 2026-11-04): money sitting in a brokerage account that is not in any holding. Sample data, made up.
// In the app a broker's cash is an Account (type Brokerage, purpose Investment, currency INR or USD) whose balance is read off a statement like any
// other balance, so it lives on the Accounts page and counts once in net worth. This file is the picture of the sums; each is a pure function in
// lib/aggregate/ with a test. Cash has no cost basis and no price: a dollar balance is valued at today's rate, and the rate's move is not "gain".
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
const { sum } = D;

/** The two accounts of the example he gave: dollars at the US broker, a lakh at the Indian one. `asOf` is the day of the balance he last logged. */
export const CASH = [
  { id: "c-vested", name: "Vested cash", broker: "Vested", currency: "USD", balance: 3000, asOf: "2026-10-29", source: "Statement", color: "indigo", holds: "VOO, QQQ" },
  { id: "c-zerodha", name: "Zerodha cash", broker: "Zerodha", currency: "INR", balance: 100000, asOf: "2026-10-30", source: "Manual", color: "teal", holds: "Stocks and ETFs" },
].map((c) => ({ ...c, us: c.currency === "USD", inr: c.currency === "USD" ? c.balance * D.FX_NOW : c.balance }));

export const cashBy = (id) => CASH.find((c) => c.id === id);
export const CASH_INR = sum(CASH.map((c) => c.inr));
export const CASH_USD = sum(CASH.filter((c) => c.us).map((c) => c.balance));
/** What he has at the brokers all told: the holdings and the cash. */
export const WITH_CASH = D.VALUE + CASH_INR;
/** The idle share: cash over holdings plus cash. */
export const IDLE = CASH_INR / WITH_CASH;
/** The rupee's move on the dollars sitting there, since the day of the balance: not gain, shown so it isn't a surprise. */
export const TODAY = "2026-10-31";
export const daysOld = (c, today = TODAY) => Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${c.asOf}T00:00:00Z`)) / 86400000);
/** A balance more than 30 days old is stale: it still counts (the Accounts rule). */
export const STALE_AFTER = 30;
export const isStale = (c) => daysOld(c) > STALE_AFTER;

/** What the cash account holds after a buy it paid for (a sell adds). Dollars in a USD account, rupees in an INR one. A soft check: short is a warning, never a block. */
export const after = (c, trade) => { const amt = c.us ? trade.total : D.costInr(trade); return { before: c.balance, amount: amt, after: c.balance + (trade.tradeType === "Buy" ? -amt : amt) }; };
export const usdTxt = (n) => D.usd(n);
export const cashTxt = (c) => (c.us ? D.usd(c.balance) : L.inr(c.balance));
/** A copy of an account as it stood on an earlier day (for the "cash is old" state). */
export const readOn = (c, asOf) => ({ ...c, asOf });
