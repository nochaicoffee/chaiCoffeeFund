import { formatDate } from "../format/date";
import { formatInr } from "../format/money";
import { totalOf, type ImportPlan } from "./importPlan";
import type { EpfPassbook, PassbookCredit } from "./parseEpfPassbookText";

/**
 * What the review screen says, as plain data worked out from the plan, so the wording is tested and the component only draws it.
 * Nothing here decides anything: whether an import can go ahead is the plan's `blockers`.
 */

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2025-03" → "Mar 2025". */
export const wageMonthLabel = (wageMonth: string): string => `${MONTH[Number(wageMonth.slice(5, 7)) - 1]} ${wageMonth.slice(0, 4)}`;

/** The twelve wage months of the passbook's year (March to February) that have no row yet. */
export function missingWageMonths(passbook: Pick<EpfPassbook, "financialYear" | "credits">): string[] {
  const have = new Set(passbook.credits.map((c) => c.wageMonth));
  const start = Number(passbook.financialYear.slice(0, 4));
  return Array.from({ length: 12 }, (_, i) => {
    const month = 3 + i; // March of the start year, through February
    return `${month > 12 ? start + 1 : start}-${String(month > 12 ? month - 12 : month).padStart(2, "0")}`;
  }).filter((m) => !have.has(m));
}

/**
 * The row to offer when the checks fail: the first missing wage month, credited on the 1st of the next month (or the print date if
 * that is later than it), with the amounts the checks found missing. He changes it only if his passbook says otherwise.
 */
export function suggestedRow(plan: Pick<ImportPlan, "passbook" | "checks">): PassbookCredit | null {
  const wageMonth = missingWageMonths(plan.passbook)[0];
  if (!wageMonth) return null;
  const next = Number(wageMonth.slice(5, 7)) === 12 ? `${Number(wageMonth.slice(0, 4)) + 1}-01` : `${wageMonth.slice(0, 5)}${String(Number(wageMonth.slice(5, 7)) + 1).padStart(2, "0")}`;
  const date = `${next}-01` > plan.passbook.printedOn ? plan.passbook.printedOn : `${next}-01`;
  const gap = plan.checks.rowsGap;
  return { wageMonth, date, employee: Math.max(0, gap.employee), employer: Math.max(0, gap.employer), pension: Math.max(0, gap.pension) };
}

export interface CheckLine {
  ok: boolean;
  title: string;
  detail: string;
}

/** The checks, in the words of the design: the two that decide, and the interest against the rule, which only informs. */
export function checkLines(plan: ImportPlan): CheckLine[] {
  const { passbook, checks } = plan;
  const rows = passbook.credits.reduce((t, c) => t + totalOf(c), 0);
  const total = totalOf(passbook.printedContributions);
  const interest = passbook.interest ? totalOf(passbook.interest) : 0;
  const open = totalOf(passbook.opening);
  const close = totalOf(passbook.closing);
  const typed = plan.typedMonths.length;
  const lines: CheckLine[] = [
    {
      ok: checks.balanceReconciles,
      title: "Opening + credits + interest = closing.",
      detail: checks.balanceReconciles
        ? `${formatInr(open)} + ${formatInr(rows)} + ${formatInr(interest)} = ${formatInr(close)}, the closing balance on the passbook.`
        : `${formatInr(open)} + ${formatInr(rows)} + ${formatInr(interest)} = ${formatInr(open + rows + interest)}, but the passbook says ${formatInr(close)}.`,
    },
    {
      ok: checks.rowsAddToTotal,
      title: "The rows add up to the passbook's total.",
      detail: checks.rowsAddToTotal
        ? `${passbook.credits.length} credits, ${formatInr(rows)}, as its "Total Contributions" line says${typed ? `: ${passbook.credits.length - typed} read from the file and ${typed} you added or changed, so the year stays marked unverified` : ""}.`
        : `The total line says ${formatInr(total)}; the rows add to ${formatInr(rows)}.`,
    },
  ];
  const rule = plan.interest.rule;
  if (passbook.interest) {
    lines.push({
      ok: true,
      title: "Interest.",
      detail: rule
        ? `EPFO credited ${formatInr(interest)} on ${formatDate(passbook.interest.date)}; the rule at ${rule.ratePercent}% (${rule.source.toLowerCase()}) gives ${formatInr(rule.ruleGives.total)}${rule.difference === 0 ? "." : `, a difference of ${formatInr(rule.difference)}. The credited figure is what is kept.`}`
        : `EPFO credited ${formatInr(interest)} on ${formatDate(passbook.interest.date)}. No rate is known for this year, so there is nothing to compare it with.`,
    });
  }
  return lines;
}

const takesPassbook = (c: { status: string; resolution?: string }) => c.status === "new" || c.status === "replaces-typed" || (c.status === "conflict" && c.resolution === "passbook");

/** The big button's words: the credits it writes (new, or replacing a typed or conflicting one), the interest, or just "Save". */
export function importLabel(plan: ImportPlan): string {
  if (plan.nothingNew && !plan.writes.patchAccount && !plan.writes.createAccount) return "Done";
  const credits = plan.credits.filter(takesPassbook).length;
  const interest = plan.interest.status === "new" || plan.interest.status === "replaces-typed" || (plan.interest.status === "conflict" && plan.interest.resolution === "passbook");
  const parts = [credits > 0 ? `${credits} ${credits === 1 ? "credit" : "credits"}` : "", interest ? "the interest" : ""].filter(Boolean);
  return parts.length ? `Import ${parts.join(" and ")}` : "Save";
}

/** The "What importing does" box: counts only. */
export function summaryRows(plan: ImportPlan): { label: string; value: string }[] {
  const fresh = plan.credits.filter((c) => c.status === "new").length;
  const replaced = plan.credits.filter((c) => c.status === "replaces-typed" || (c.status === "conflict" && c.resolution === "passbook")).length;
  const same = plan.credits.filter((c) => c.status === "same" || (c.status === "conflict" && c.resolution === "mine")).length;
  const rows = [
    { label: "New credits", value: String(fresh) },
    { label: "Already in the app", value: String(same) },
  ];
  if (replaced) rows.push({ label: "Replaced by the passbook's", value: String(replaced) });
  if (plan.typedMonths.length) rows.push({ label: "Added or changed by you (typed)", value: String(plan.typedMonths.length) });
  rows.push({ label: "Interest to record", value: plan.interest.status === "new" || plan.interest.status === "replaces-typed" || (plan.interest.status === "conflict" && plan.interest.resolution === "passbook") ? formatInr(totalOf(plan.passbook.interest!)) : plan.passbook.interest ? "already recorded" : "none yet" });
  rows.push({ label: "Balance after", value: formatInr(totalOf(plan.passbook.closing)) });
  return rows;
}
