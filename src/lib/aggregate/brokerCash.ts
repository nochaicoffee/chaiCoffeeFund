import type { Account, AccountCurrency, InvestmentTransaction } from "../sheets/types";
import type { RupeeSnapshot } from "./accountCurrency";
import { balanceOn, isClosed } from "./accounts";

/**
 * Cash at the brokers (PRD F-IV-18, ADR 0012): the uninvested money in each Brokerage account,
 * as the Investments page shows it beside the holdings. Cash is outside the holdings' worth, the
 * split and the yearly return: a transfer to a broker isn't a gain, and idle cash earns nothing.
 * It is counted once in net worth, as an account.
 */

export interface BrokerCash {
  account: Account;
  /** Its latest balance in its own currency (dollars for a dollar account), as read on `date`. */
  balance: number;
  /** The same in rupees, at the rate it was counted at. */
  rupees: number;
  date: string;
}

/** Every open Brokerage account with a balance, biggest in rupees first. `snapshots` are in rupees with `native` for a dollar account (inRupees). */
export function cashByBroker(accounts: Account[], snapshots: RupeeSnapshot[], today: string): BrokerCash[] {
  const held: BrokerCash[] = [];
  for (const account of accounts) {
    if (account.accountType !== "Brokerage" || isClosed(account)) continue;
    const latest = balanceOn(snapshots, account.id, today);
    if (latest) held.push({ account, balance: latest.native ?? latest.balance, rupees: latest.balance, date: latest.date });
  }
  return held.sort((a, b) => b.rupees - a.rupees);
}

/** All the cash, in rupees. */
export const totalCash = (cash: BrokerCash[]): number => cash.reduce((sum, c) => sum + c.rupees, 0);

/** The idle share: cash over holdings plus cash, 0 to 1. Nothing at all is 0, never NaN. */
export function idleShare(cashRupees: number, holdingsRupees: number): number {
  const all = cashRupees + holdingsRupees;
  return all > 0 ? cashRupees / all : 0;
}

export interface CashAfter {
  /** What the cash account holds after the trade, in its own currency. */
  after: number;
  /** A buy that takes more than the cash on record. A warning, never a block: the balance may be old (PRD Q13). */
  short: boolean;
  /** How far under zero it goes, 0 when it doesn't. */
  shortBy: number;
  /** The trade is in the other currency (a US trade against a rupee account): nothing is worked out, the balance is left as it is. */
  mismatch: boolean;
}

/**
 * What a trade does to the cash account that paid for it. A buy takes its `total` (in the
 * trade's currency, which is the cash account's: a US trade is in dollars, so a US trade against a rupee account is a mismatch), a sell adds it.
 */
export function cashAfterTrade(balance: number, trade: Pick<InvestmentTransaction, "tradeType" | "total" | "currency">, cashCurrency: AccountCurrency): CashAfter {
  // A trade's total is in its own currency; taking it off a balance in another would be a wrong figure, so say so instead.
  if (trade.currency !== cashCurrency) return { after: balance, short: false, shortBy: 0, mismatch: true };
  const after = trade.tradeType === "Buy" ? balance - trade.total : balance + trade.total;
  return { after, short: after < 0, shortBy: after < 0 ? -after : 0, mismatch: false };
}
