import { dailyEarnings, summariseLentLoan, type LentLoanSummary } from "./lentOut";
import type { LentLoan, LentRepayment } from "../sheets/types";

/**
 * Who owes what: the data of the Lent page's hero (docs/design/lent-out.md, task A3).
 *
 * A block per loan still out, sized by what its borrower owes today (principal still out plus any interest owed). Picking one shows
 * the total without it: a measure of how much rides on one borrower, never a forecast. A repaid loan owes nothing, so it leaves the
 * map and the shares are worked out over what is still out. So does a loan that is still marked Active but owes nothing (all its principal
 * has come back and no interest is owed): it is kept as repaid, not drawn as a zero-size block. Pure: nothing here is stored.
 */

/** More borrowers than this and the blocks become a scrolling list, longest first, so sixteen people never become sixteen tiny blocks. */
export const MAP_BLOCKS_MAX = 3;

export interface WhoBlock {
  summary: LentLoanSummary;
  loan: LentLoan;
  owedToday: number;
  /** Its part of the total owed, 0 to 1. */
  share: number;
  /** What it earns a day (`dailyEarnings`). */
  perDay: number;
  /** The total still out if this borrower didn't pay back. */
  totalWithout: number;
  /** How much of today's total would remain without it, 0 to 1. */
  remainingWithout: number;
  /** What the daily earnings would fall to without it. */
  perDayWithout: number;
}

export interface WhoOwesWhat {
  /** Everything still owed, over the loans that are still out. */
  total: number;
  /** What all the loans earn a day. */
  perDay: number;
  /** Loans still out, biggest owed first. */
  blocks: WhoBlock[];
  /** True past `MAP_BLOCKS_MAX` borrowers: show a list, not blocks. */
  asList: boolean;
  /** The biggest block's share, 0 to 1. Undefined when nothing is out. */
  biggestShare?: number;
  /** Loans marked Repaid, and Active ones that owe nothing: out of the map, kept as a strip. Most recently closed first, those with no closing day last. */
  repaid: LentLoan[];
}

export function whoOwesWhat(loans: LentLoan[], repayments: LentRepayment[], asOfDate: string): WhoOwesWhat {
  const rows = loans.filter((l) => l.status !== "Repaid").map((loan) => ({ loan, summary: summariseLentLoan(loan, repayments, asOfDate), perDay: dailyEarnings(loan, repayments, asOfDate) }));
  const owing = rows.filter((r) => r.summary.owedToday > 0.005);
  const total = owing.reduce((t, r) => t + r.summary.owedToday, 0);
  const perDay = owing.reduce((t, r) => t + r.perDay, 0);
  const blocks: WhoBlock[] = owing
    .map((r): WhoBlock => ({
      summary: r.summary,
      loan: r.loan,
      owedToday: r.summary.owedToday,
      share: total > 0 ? r.summary.owedToday / total : 0,
      perDay: r.perDay,
      totalWithout: total - r.summary.owedToday,
      remainingWithout: total > 0 ? (total - r.summary.owedToday) / total : 0,
      perDayWithout: perDay - r.perDay,
    }))
    .sort((a, b) => b.owedToday - a.owedToday || a.loan.id.localeCompare(b.loan.id));
  const settled = new Set(rows.filter((r) => r.summary.owedToday <= 0.005).map((r) => r.loan.id));
  const repaid = loans.filter((l) => l.status === "Repaid" || settled.has(l.id)).sort((a, b) => (b.closedDate ?? "").localeCompare(a.closedDate ?? "") || a.id.localeCompare(b.id));
  return { total, perDay, blocks, asList: blocks.length > MAP_BLOCKS_MAX, biggestShare: blocks[0]?.share, repaid };
}
