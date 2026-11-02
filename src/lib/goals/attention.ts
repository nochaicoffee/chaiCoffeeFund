import { daysBetween } from "../aggregate/cardSpend";
import { earmarkProblems, earmarksByAccount, type GoalsData } from "../aggregate/goals";
import { skyPieces } from "../aggregate/goalsOrbit";
import { formatDate, formatShortDate } from "../format/date";
import { formatInr } from "../format/money";

/**
 * What needs attention (F-GO-05), for the Goals page's strip and Overview's list: a piece with a Fixed date close and short of its plan, a piece whose
 * date has passed, and an account that holds less than goals have earmarked in it. Read from the sky's pieces, so a Fixed sub-goal counts as much as a
 * Fixed goal. A label and a detail, so neither page has to take a sentence apart.
 */
export interface AttentionInput extends GoalsData {
  accounts: { id: string; name: string }[];
  /** Each account's latest balance; an account with none isn't checked. */
  balances: Record<string, number>;
}

export interface AttentionItem {
  /** The top-level goal it's about, which "See goal" picks; "all" for an account. */
  id: string;
  tone: "warning" | "negative";
  label: string;
  detail: string;
  /** What's still to set aside, for the Set aside button (0 for an account). */
  left: number;
}

/** How near a Fixed date has to be before a short plan is worth a strip. */
export const FIXED_WARNING_DAYS = 90;

export const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : n === -1 ? "yesterday" : `${-n} days ago`);
const dateIn = (today: string, date: string) => (date.slice(0, 4) === today.slice(0, 4) ? formatShortDate(date) : formatDate(date));

export function attentionItems(data: AttentionInput, today: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const piece of skyPieces(data, today)) {
    if (piece.paused || piece.left <= 0 || !piece.due) continue;
    const name = piece.parentName && !piece.own ? `${piece.parentName}: ${piece.name}` : piece.name;
    if (piece.due < today) {
      items.push({ id: piece.topId, tone: "negative", left: piece.left, label: `${name} · overdue`, detail: `due ${dateIn(today, piece.due)}, ${formatInr(piece.left)} still to set aside. It needs it all now.` });
      continue;
    }
    const days = daysBetween(today, piece.due);
    if (piece.dateType === "Fixed" && days <= FIXED_WARNING_DAYS && piece.planned < piece.required) {
      items.push({ id: piece.topId, tone: "warning", left: piece.left, label: `${name} · Fixed date ${dateIn(today, piece.due)} (${inDays(days)})`, detail: `${formatInr(piece.left)} still to set aside, and you plan ${formatInr(piece.planned)} a month.${piece.necessity === "Need" ? " It's a Need." : ""}` });
    }
  }
  for (const problem of earmarkProblems(earmarksByAccount(data), data.balances)) {
    const name = data.accounts.find((a) => a.id === problem.accountId)?.name ?? "An account";
    items.push({ id: "all", tone: "warning", left: 0, label: `${name} earmarks`, detail: `goals hold ${formatInr(problem.earmarked)} of the ${formatInr(problem.balance)} in the account (${formatInr(problem.over)} more than it has).` });
  }
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "negative" ? -1 : 1));
}
