import { epfYearReconciles } from "../aggregate/epf";
import { isoFrom, last4Of, monthNumber } from "../accountStatementParsing/readers";
import type { EpfEntry } from "../sheets/types";

/**
 * Reads the text of one EPFO member passbook (one financial year) into rows and checks. Pure: no PDF, no Sheets.
 *
 * A passbook page has an opening balance, one row for each credit (wage month, the day credited, the employee,
 * employer and pension shares), the year's "Total Contributions", the year's interest and a closing balance, each
 * for the three shares. ADR 0011 says what is done with it. Two rules shape this file:
 * - **Never guess.** A row that doesn't match the layout, a total the layout doesn't have, a transfer-in or a
 *   withdrawal (none of which his passbooks contain) all make the whole file `ok: false` with a problem that names
 *   what couldn't be read, never a value.
 * - **Nothing personal leaves it.** The UAN, date of birth and the member's name are never read; the member ID is
 *   reduced to its last four, which is only used to match an account.
 */

export interface EpfShares {
  employee: number;
  employer: number;
  pension: number;
}

export interface PassbookCredit extends EpfShares {
  /** "2026-09": the month the wages were for. */
  wageMonth: string;
  /** The day EPFO credited it. */
  date: string;
}

export interface EpfPassbook {
  /** "2025-26". */
  financialYear: string;
  /** The day the passbook was printed: it is complete up to then, and no later. */
  printedOn: string;
  /** The last four of the member ID, to match an account. Undefined when the file doesn't print one. */
  memberIdLast4?: string;
  /** The employer as printed, to label a new account. Best effort: undefined when it can't be told apart from the page's other text. */
  establishment?: string;
  /** The balance at the start of the year (the day before 1 April). */
  opening: EpfShares;
  openingDate: string;
  credits: PassbookCredit[];
  /** What the page prints as the year's "Total Contributions", to check the rows against. */
  printedContributions: EpfShares;
  /** The interest credited on 31 March, or null while the year is still running (the page prints 0 until then). */
  interest: (EpfShares & { date: string }) | null;
  closing: EpfShares;
  closingDate: string;
}

/** The two checks that decide whether a file can be accepted. Figures are gaps in rupees: 0 means it adds up. */
export interface EpfPassbookChecks {
  /** The page's "Total Contributions" minus what its rows add up to. */
  rowsGap: EpfShares;
  /** The closing balance minus (opening + the rows + interest). */
  balanceGap: EpfShares;
  rowsAddToTotal: boolean;
  balanceReconciles: boolean;
  /** Both hold. Only then can the year be imported without a typed row. */
  passes: boolean;
}

export type ParseEpfPassbookResult = { ok: true; passbook: EpfPassbook; checks: EpfPassbookChecks } | { ok: false; problem: string };

const SHARES = ["employee", "employer", "pension"] as const;
const ZERO: EpfShares = { employee: 0, employer: 0, pension: 0 };
const sharesOf = (f: (share: (typeof SHARES)[number]) => number): EpfShares => ({ employee: f("employee"), employer: f("employer"), pension: f("pension") });

/** Run on every edit in the review screen as well: the figures to check are the passbook's, and the rows may have been corrected. */
export function checkEpfPassbook(p: Pick<EpfPassbook, "opening" | "credits" | "printedContributions" | "interest" | "closing">): EpfPassbookChecks {
  const rows = sharesOf((s) => p.credits.reduce((total, c) => total + c[s], 0));
  const interest = p.interest ?? ZERO;
  const rowsGap = sharesOf((s) => p.printedContributions[s] - rows[s]);
  const balanceGap = sharesOf((s) => p.closing[s] - (p.opening[s] + rows[s] + interest[s]));
  const rowsAddToTotal = SHARES.every((s) => rowsGap[s] === 0);
  const balanceReconciles = SHARES.every((s) => epfYearReconciles({ opening: p.opening[s], contributions: rows[s], interest: interest[s], closing: p.closing[s] }));
  return { rowsGap, balanceGap, rowsAddToTotal, balanceReconciles, passes: rowsAddToTotal && balanceReconciles };
}

/** The rows an import would write for a passbook: credits and (when credited) the year's interest. No ids: the caller adds the account and the ids. */
export type PassbookEntryDraft = Omit<EpfEntry, "id" | "epfAccountId">;
export function passbookEntries(p: Pick<EpfPassbook, "credits" | "interest">): PassbookEntryDraft[] {
  const credits: PassbookEntryDraft[] = p.credits.map((c) => ({ kind: "Contribution", date: c.date, wageMonth: c.wageMonth, employee: c.employee, employer: c.employer, pension: c.pension, source: "Passbook" }));
  const interest: PassbookEntryDraft[] = p.interest ? [{ kind: "Interest", date: p.interest.date, employee: p.interest.employee, employer: p.interest.employer, pension: p.interest.pension, source: "Passbook" }] : [];
  return [...credits, ...interest];
}

/**
 * Why a credit's dates can't be right for a passbook of this year, or null: it must be credited after its wage month, inside
 * the financial year, and no later than the day the passbook was printed. Shared with the review, which checks the rows he
 * adds or changes by the same rule.
 */
export function creditDateProblem(credit: Pick<PassbookCredit, "wageMonth" | "date">, passbook: Pick<EpfPassbook, "financialYear" | "printedOn">): string | null {
  const start = `${passbook.financialYear.slice(0, 4)}-04-01`;
  const end = `${Number(passbook.financialYear.slice(0, 4)) + 1}-03-31`;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(credit.wageMonth)) return "the wage month isn't a month";
  if (credit.date.slice(0, 7) <= credit.wageMonth) return "a credit can't come in the month of its wages or before it";
  if (credit.date < start || credit.date > end) return `the day is outside ${passbook.financialYear}`;
  if (credit.date > passbook.printedOn) return "the day is after the passbook was printed";
  return null;
}

// ---------- Reading ----------
/** An amount as the passbook prints it: whole rupees, grouped Indian style ("1,19,356"). Captured loosely, then checked by `toRupees`. */
const AMOUNT = String.raw`(\d[\d,]*)`;
const THREE = String.raw`${AMOUNT}\s+${AMOUNT}\s+${AMOUNT}`;
const DATE_SLASH = String.raw`(\d{2})\/(\d{2})\/(\d{4})`;

/** Whole rupees, or NaN when the commas aren't where Indian grouping puts them ("1,2,5" is a misread, not 125). */
const GROUPED = /^(\d{1,3}|\d{1,2}(,\d{2})*,\d{3})$/;
const toRupees = (text: string): number => (GROUPED.test(text) ? Number(text.replace(/,/g, "")) : Number.NaN);
const threeFrom = (m: RegExpMatchArray, at: number): EpfShares => ({ employee: toRupees(m[at]), employer: toRupees(m[at + 1]), pension: toRupees(m[at + 2]) });
/** The day-first date whose three groups start at `at`. */
const isoOf = (m: RegExpMatchArray, at: number): string | null => isoFrom(Number(m[at + 2]), Number(m[at + 1]), Number(m[at]));
const isZero = (s: EpfShares) => s.employee === 0 && s.employer === 0 && s.pension === 0;
const isMisread = (s: EpfShares) => !SHARES.every((k) => Number.isFinite(s[k]));
const UNREADABLE_AMOUNT = "an amount on the page couldn't be read";

// One credit: "Mar-2025 01-04-2025 CR Cont. for the Due-Month 202504 <EPF wages> <EPS wages> <employee> <employer> <pension>".
// The first month is the wage month; the date after it is when EPFO credited it, and 202504 is that credit's month. Older
// files say "Cont. for Due-Month" and print the credit month the other way round (042024).
const CREDIT = new RegExp(
  String.raw`(?<mon>[A-Za-z]{3})-(?<wageYear>\d{4})\s+(?<day>\d{2})-(?<month>\d{2})-(?<year>\d{4})\s+CR\s+Cont\.\s+for\s+(?:the\s+)?Due-Month\s+(?<creditMonth>\d{6})\s+\d[\d,]*\s+\d[\d,]*\s+(?<employee>\d[\d,]*)\s+(?<employer>\d[\d,]*)\s+(?<pension>\d[\d,]*)`,
  "g",
);

/** The passbook's text (pdf.js joins its pieces with spaces and breaks pages with a newline). */
export function parseEpfPassbookText(rawText: string): ParseEpfPassbookResult {
  const text = rawText.replace(/\s+/g, " ");
  const fail = (problem: string): ParseEpfPassbookResult => ({ ok: false, problem });

  const headings = [...text.matchAll(/EPF Passbook \[ Financial Year - (\d{4})-(\d{4}) \]/g)];
  if (headings.length === 0) return fail("this doesn't look like an EPF passbook (no financial year heading)");
  if (headings.length > 1) return fail("this file holds more than one financial year: add one year's passbook at a time");
  const year = headings[0];
  const startYear = Number(year[1]);
  if (Number(year[2]) !== startYear + 1) return fail("couldn't read the financial year");
  const financialYear = `${startYear}-${String(startYear + 1).slice(2)}`;

  const printed = /Printed On : (\d{2})-(\d{2})-(\d{4})/.exec(text);
  const printedOn = printed ? isoFrom(Number(printed[3]), Number(printed[2]), Number(printed[1])) : null;
  if (!printedOn) return fail("couldn't read the date the passbook was printed");

  const opening = new RegExp(String.raw`OB Int\. Updated upto ${DATE_SLASH} ${THREE}`).exec(text);
  const openingDate = opening && isoOf(opening, 1);
  if (!opening || !openingDate) return fail("couldn't read the opening balance");
  if (openingDate !== `${startYear}-03-31`) return fail("the opening balance isn't as at the end of the previous financial year");

  const total = new RegExp(String.raw`Total Contributions for the year \[ (\d{4}) \] ${THREE}`).exec(text);
  if (!total) return fail("couldn't read the year's total contributions");
  if (Number(total[1]) !== startYear) return fail("the year's totals are for a different year than the heading");
  if (isMisread(threeFrom(total, 2)) || isMisread(threeFrom(opening, 4))) return fail(UNREADABLE_AMOUNT);

  // A transfer-in or a withdrawal changes the balance in ways the rows here don't show, and none has been seen: stop rather than guess.
  for (const kind of ["Transfer-Ins/VDRs", "Withdrawals"]) {
    const m = new RegExp(String.raw`Total ${kind} for the year \[ (\d{4}) \] ${THREE}`).exec(text);
    if (!m) return fail(`couldn't read the year's total ${kind === "Withdrawals" ? "withdrawals" : "transfer-ins"}`);
    if (Number(m[1]) !== startYear || isMisread(threeFrom(m, 2))) return fail(UNREADABLE_AMOUNT);
    if (!isZero(threeFrom(m, 2))) return fail(`this year has ${kind === "Withdrawals" ? "a withdrawal" : "a transfer-in"}, which the import doesn't read yet`);
  }

  const end = new RegExp(String.raw`(?<!OB )Int\. Updated upto ${DATE_SLASH} ${THREE} Closing Balance as on ${DATE_SLASH} ${THREE}`).exec(text);
  const interestDate = end && isoOf(end, 1);
  const closingDate = end && isoOf(end, 7);
  if (!end || !interestDate || !closingDate) return fail("couldn't read the year's interest and closing balance");
  if (interestDate !== `${startYear + 1}-03-31` || closingDate !== interestDate) return fail("the closing balance isn't as at the end of the financial year");
  const interestShares = threeFrom(end, 4);
  if (isMisread(interestShares) || isMisread(threeFrom(end, 10))) return fail(UNREADABLE_AMOUNT);
  // Interest is not credited yet while the year is running, and for a while after it ends (EPFO declares the rate first): the
  // page prints 0 either way. A credited year's interest is never 0 on a balance, so 0 means "not yet", whatever the date.
  const credited = interestDate <= printedOn && !isZero(interestShares);
  if (interestDate > printedOn && !isZero(interestShares)) return fail("the passbook has interest dated after the day it was printed");

  const credits: PassbookCredit[] = [];
  const seen = new Set<string>();
  let rowsFound = 0;
  for (const m of text.matchAll(CREDIT)) {
    rowsFound++;
    const g = m.groups!;
    const month = monthNumber(g.mon);
    const date = isoFrom(Number(g.year), Number(g.month), Number(g.day));
    if (!month || !date) return fail("a credit row has a date that isn't on the calendar");
    const wageMonth = `${g.wageYear}-${String(month).padStart(2, "0")}`;
    // A row is only as good as its dates: after its wage month, inside this year, no later than the print date, and in the
    // credit month the row itself prints.
    if (creditDateProblem({ wageMonth, date }, { financialYear, printedOn }) || ![`${date.slice(0, 4)}${date.slice(5, 7)}`, `${date.slice(5, 7)}${date.slice(0, 4)}`].includes(g.creditMonth)) {
      return fail("a credit row has dates that don't fit the passbook's year");
    }
    if (seen.has(wageMonth)) return fail("two credits are for the same wage month, which the import can't tell apart");
    seen.add(wageMonth);
    const shares = { employee: toRupees(g.employee), employer: toRupees(g.employer), pension: toRupees(g.pension) };
    if (isMisread(shares)) return fail(UNREADABLE_AMOUNT);
    credits.push({ wageMonth, date, ...shares });
  }
  const rowsStarted = (text.match(/Cont\.\s+for/g) ?? []).length;
  if (rowsStarted !== rowsFound) return fail(`${rowsStarted - rowsFound} of the credit rows couldn't be read`);

  const passbook: EpfPassbook = {
    financialYear,
    printedOn,
    memberIdLast4: memberIdLast4(text),
    establishment: establishmentName(text),
    opening: threeFrom(opening, 4),
    openingDate,
    credits,
    printedContributions: threeFrom(total, 2),
    interest: credited ? { ...interestShares, date: interestDate } : null,
    closing: threeFrom(end, 10),
    closingDate,
  };
  return { ok: true, passbook, checks: checkEpfPassbook(passbook) };
}

/** "Member ID/Name BGBNG00000000000099 / NAME" → "0099". The name after the slash is never read. */
function memberIdLast4(text: string): string | undefined {
  const m = /Member ID\/Name ([A-Z0-9]+) \//.exec(text);
  return m ? last4Of(m[1]) : undefined;
}

/** "Establishment ID/Name BGBNG0000000 / EXAMPLE PRIVATE LIMITED <other text>": the run of capitalised words, which stops at the page's next label. */
function establishmentName(text: string): string | undefined {
  const m = /Establishment ID\/Name [A-Z0-9]+ \/ ((?:[A-Z][A-Z0-9&.,'()-]*)(?: [A-Z][A-Z0-9&.,'()-]*)*)/.exec(text);
  return m?.[1];
}
