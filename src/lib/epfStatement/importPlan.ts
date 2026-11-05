import { contradictedTypedEntries, entriesOfAccount, epfBalance, epfInterestForYear, epfRateForYear, financialYearOf, impliedRatePercent, type EpfRateKind } from "../aggregate/epf";
import { isoFrom } from "../accountStatementParsing/readers";
import { formatInr } from "../format/money";
import { entryConflict } from "../sheets/epfRules";
import type { EpfAccount, EpfEntry, EpfRate } from "../sheets/types";
import { checkEpfPassbook, creditDateProblem } from "./parseEpfPassbookText";
import type { EpfPassbook, EpfPassbookChecks, EpfShares, PassbookCredit, PassbookEntryDraft } from "./parseEpfPassbookText";

/**
 * What importing a passbook would do, worked out before anything is saved (ADR 0011). Pure: the review screen runs it on every
 * change (a corrected row, a conflict answered, an account chosen), and the confirm action runs it again on fresh Sheet data,
 * so what is written is always what this function says and never what the browser claims.
 *
 * - **Never guesses the account.** The member ID's last four match exactly one account, or he chooses (or names a new one).
 * - **A credit is identified by its wage month, the year's interest by its financial year.** The same one again changes nothing;
 *   a typed credit with the passbook's figures becomes the passbook's; a different day or amount is a conflict he answers.
 * - **Anything not read straight from the file is Typed**: a row he added or whose day or amount he changed. The checks can pass
 *   with such a row, but only because it was chosen to make them pass, so the import is marked unverified.
 */

export type Resolution = "passbook" | "mine";
export type CreditSource = "Passbook" | "Typed";

// ---------- The review's corrections ----------
type CreditFigures = Pick<PassbookCredit, "date" | "employee" | "employer" | "pension">;
export interface ReviewEdits {
  /** Rows read from the file whose day or amount he changed, by wage month. */
  changed: Record<string, CreditFigures>;
  /** Rows he added for credits the file doesn't have. */
  added: PassbookCredit[];
}
export const NO_EDITS: ReviewEdits = { changed: {}, added: [] };

export interface ReviewedPassbook {
  /** The passbook as it now stands in the review, its credits in wage-month order. */
  passbook: EpfPassbook;
  /** The wage months not read straight from the file. */
  typed: Set<string>;
  /** Why an edit can't be right; each blocks the import. */
  problems: string[];
}

const sameShares = (a: EpfShares, b: EpfShares) => a.employee === b.employee && a.employer === b.employer && a.pension === b.pension;
const sameCredit = (e: Pick<PassbookCredit, "date" | keyof EpfShares>, c: Pick<PassbookCredit, "date" | keyof EpfShares>) => e.date === c.date && sameShares(e, c);
/** Employee + employer: what earns interest, and what the review shows as a credit's amount. */
export const totalOf = (s: { employee: number; employer: number }): number => s.employee + s.employer;

const isWholeRupees = (n: number) => Number.isInteger(n) && n >= 0;

/** The file's passbook with his corrections applied. The rows are checked by the same rule as the parser's. */
export function applyReviewEdits(original: EpfPassbook, edits: ReviewEdits): ReviewedPassbook {
  const problems: string[] = [];
  const typed = new Set<string>();
  const fileMonths = new Set(original.credits.map((c) => c.wageMonth));
  const check = (credit: PassbookCredit) => {
    const why = !isoFrom(Number(credit.date.slice(0, 4)), Number(credit.date.slice(5, 7)), Number(credit.date.slice(8, 10))) || credit.date.length !== 10 ? "the day isn't a date" : creditDateProblem(credit, original);
    if (why) problems.push(`${credit.wageMonth}: ${why}`);
    if (![credit.employee, credit.employer, credit.pension].every(isWholeRupees)) problems.push(`${credit.wageMonth}: an amount isn't a whole number of rupees`);
  };
  const credits = original.credits.map((c) => {
    const change = edits.changed[c.wageMonth];
    if (!change) return c;
    const edited = { ...c, ...change };
    // Put back exactly as the file has it, it is the file's row again.
    if (sameCredit(edited, c)) return c;
    typed.add(c.wageMonth);
    check(edited);
    return edited;
  });
  for (const month of Object.keys(edits.changed)) if (!fileMonths.has(month)) problems.push(`${month}: that row isn't in the file`);
  for (const added of edits.added) {
    if (fileMonths.has(added.wageMonth) || typed.has(added.wageMonth)) {
      problems.push(`${added.wageMonth}: already a row for that wage month, change that one instead`);
      continue;
    }
    typed.add(added.wageMonth);
    check(added);
    credits.push(added);
  }
  credits.sort((a, b) => (a.wageMonth < b.wageMonth ? -1 : a.wageMonth > b.wageMonth ? 1 : 0));
  return { passbook: { ...original, credits }, typed, problems };
}

// ---------- The account ----------
export type EpfAccountMatch = { kind: "match"; account: EpfAccount } | { kind: "several"; accounts: EpfAccount[] } | { kind: "none" };

/** The account a passbook belongs to, by the last four of its member ID. Not a match is never filled in by guessing. */
export function matchEpfAccount(accounts: EpfAccount[], last4: string | undefined): EpfAccountMatch {
  if (!last4) return { kind: "none" };
  const same = accounts.filter((a) => a.memberIdLast4?.toUpperCase() === last4.toUpperCase());
  if (same.length === 1) return { kind: "match", account: same[0] };
  return same.length > 1 ? { kind: "several", accounts: same } : { kind: "none" };
}

export type AccountChoice = { kind: "existing"; id: string } | { kind: "new"; name: string };

// ---------- The plan ----------
export interface PlanInput {
  original: EpfPassbook;
  edits: ReviewEdits;
  accounts: EpfAccount[];
  /** Every entry and rate in the Sheet: the plan looks at the chosen account's only. */
  entries: EpfEntry[];
  rates: EpfRate[];
  /** Nothing chosen yet: a single match is taken, otherwise the import waits for a choice. */
  choice: AccountChoice | null;
  /** His answer to each conflict, by `creditKey(wageMonth)` or `INTEREST_KEY`. Unanswered: the passbook's if the row was read from the file, his own otherwise. */
  resolutions: Record<string, Resolution>;
  /** His answer to each typed credit the file contradicts, by entry id. Unanswered: keep. */
  contradicted: Record<string, "keep" | "remove">;
}

export const creditKey = (wageMonth: string) => `credit:${wageMonth}`;
export const INTEREST_KEY = "interest";

export type CreditStatus = "new" | "same" | "replaces-typed" | "conflict";
export interface PlannedCredit {
  credit: PassbookCredit;
  source: CreditSource;
  status: CreditStatus;
  /** The credit already in the Sheet for that wage month. */
  existing?: EpfEntry;
  /** For a conflict, which one is kept. */
  resolution?: Resolution;
}

export interface InterestRule {
  ratePercent: number;
  /** Where the rate used came from: entered, or assumed from an earlier year. */
  source: EpfRateKind;
  ruleGives: { employee: number; employer: number; total: number };
  credited: { employee: number; employer: number; total: number };
  /** Credited minus what the rule gives: the credited figure always wins, the difference is only shown. */
  difference: number;
  /** The rate the credited interest implies, to the hundredth, or null when it can't be worked out. */
  impliedRatePercent: number | null;
}

export interface PlannedInterest {
  status: "none" | "new" | "same" | "replaces-typed" | "conflict";
  existing?: EpfEntry;
  resolution?: Resolution;
  rule: InterestRule | null;
}

export interface PlannedWrites {
  /** A new account to create first; the rows then belong to it. */
  createAccount?: Omit<EpfAccount, "id">;
  /** Changes to the chosen account: its member ID's last four if it has none, and how far it is confirmed. */
  patchAccount?: Partial<Omit<EpfAccount, "id">>;
  create: PassbookEntryDraft[];
  update: { id: string; patch: Partial<Omit<EpfEntry, "id">> }[];
  remove: string[];
}

export interface ImportPlan {
  passbook: EpfPassbook;
  checks: EpfPassbookChecks;
  match: EpfAccountMatch;
  choice: AccountChoice | null;
  account: EpfAccount | null;
  credits: PlannedCredit[];
  interest: PlannedInterest;
  /** The balance carried in from before: an opening row to add, one already there, or a balance that doesn't agree. */
  opening: "added" | "present" | "none" | "differs";
  /** An opening balance row an earlier year's rows now make redundant. */
  supersededOpening: EpfEntry | null;
  /** Typed credits dated inside what the file covers that it doesn't have, for him to keep or remove. */
  contradicted: EpfEntry[];
  writes: PlannedWrites;
  /** From his typed corrections: the year is closed only with rows he chose. */
  unverified: boolean;
  typedMonths: string[];
  /** Nothing in the Sheet would change (but the account may still be marked confirmed further). */
  nothingNew: boolean;
  /** Things worth saying that don't stop the import. */
  warnings: string[];
  /** Why the import can't go ahead; empty when it can. */
  blockers: string[];
}

const minDate = (a: string, b: string) => (a < b ? a : b);

export function planEpfImport(input: PlanInput): ImportPlan {
  const reviewed = applyReviewEdits(input.original, input.edits);
  const passbook = reviewed.passbook;
  const checks = checkEpfPassbook(passbook);
  const fy = passbook.financialYear;
  const blockers = [...reviewed.problems];
  const warnings: string[] = [];

  // ----- The account
  const match = matchEpfAccount(input.accounts, passbook.memberIdLast4);
  const choice: AccountChoice | null = input.choice ?? (match.kind === "match" ? { kind: "existing", id: match.account.id } : null);
  const account = choice?.kind === "existing" ? (input.accounts.find((a) => a.id === choice.id) ?? null) : null;
  if (!choice) blockers.push("Choose which EPF account this passbook is for");
  else if (choice.kind === "existing" && !account) blockers.push("That EPF account doesn't exist any more");
  else if (choice.kind === "new" && !choice.name.trim()) blockers.push("Name the new account");
  if (account?.memberIdLast4 && passbook.memberIdLast4 && account.memberIdLast4.toUpperCase() !== passbook.memberIdLast4.toUpperCase()) {
    blockers.push(`${account.name} is for a member ID ending ${account.memberIdLast4}, and this passbook's ends ${passbook.memberIdLast4}`);
  }
  if (!checks.passes) blockers.push("The checks don't pass, so nothing can be imported yet");

  const accountId = account?.id ?? "new-account";
  const existing = account ? entriesOfAccount(input.entries, account.id) : [];

  // ----- Credits
  const existingByMonth = new Map(existing.filter((e) => e.kind === "Contribution").map((e) => [e.wageMonth, e]));
  const credits: PlannedCredit[] = passbook.credits.map((credit) => {
    const source: CreditSource = reviewed.typed.has(credit.wageMonth) ? "Typed" : "Passbook";
    const found = existingByMonth.get(credit.wageMonth);
    if (!found) return { credit, source, status: "new" };
    if (sameCredit(found, credit)) return { credit, source, status: found.source === "Typed" && source === "Passbook" ? "replaces-typed" : "same", existing: found };
    return { credit, source, status: "conflict", existing: found, resolution: input.resolutions[creditKey(credit.wageMonth)] ?? (source === "Passbook" ? "passbook" : "mine") };
  });

  // ----- Interest
  const existingInterest = existing.find((e) => e.kind === "Interest" && financialYearOf(e.date) === fy);
  let interestStatus: PlannedInterest["status"] = "none";
  let interestResolution: Resolution | undefined;
  if (passbook.interest) {
    if (!existingInterest) interestStatus = "new";
    else if (existingInterest.date === passbook.interest.date && sameShares(existingInterest, passbook.interest)) interestStatus = existingInterest.source === "Typed" ? "replaces-typed" : "same";
    else {
      interestStatus = "conflict";
      interestResolution = input.resolutions[INTEREST_KEY] ?? "passbook";
    }
  }

  // ----- Opening balance
  const openingRow = existing.find((e) => e.kind === "Opening");
  const superseded = openingRow && openingRow.date === passbook.closingDate && sameShares(openingRow, passbook.closing) ? openingRow : null;
  const base = existing.filter((e) => e.id !== superseded?.id);
  const hasEarlier = base.some((e) => e.date <= passbook.openingDate);
  const openingIsNothing = sameShares(passbook.opening, { employee: 0, employer: 0, pension: 0 });
  let opening: ImportPlan["opening"] = "none";
  let openingDraft: PassbookEntryDraft | null = null;
  if (!hasEarlier && !openingIsNothing) {
    if (openingRow && !superseded) {
      opening = "differs";
      warnings.push(`This account already has an opening balance dated ${openingRow.date}, so the passbook's opening balance of ${formatInr(passbook.opening.employee + passbook.opening.employer)} on ${passbook.openingDate} isn't added`);
    } else {
      opening = "added";
      openingDraft = { kind: "Opening", date: passbook.openingDate, employee: passbook.opening.employee, employer: passbook.opening.employer, pension: passbook.opening.pension, source: "Passbook" };
    }
  } else if (hasEarlier) {
    const had = epfBalance(base, passbook.openingDate);
    opening = "present";
    if (!sameShares(had, passbook.opening)) {
      opening = "differs";
      warnings.push(`The app has ${formatInr(had.employee + had.employer)} on ${passbook.openingDate} and this passbook opens with ${formatInr(passbook.opening.employee + passbook.opening.employer)}: an earlier year may be missing`);
    }
  }

  // ----- Typed credits the file contradicts
  const fileAsEntries: EpfEntry[] = passbook.credits.map((c) => ({ id: `file-${c.wageMonth}`, epfAccountId: accountId, kind: "Contribution", date: c.date, wageMonth: c.wageMonth, employee: c.employee, employer: c.employer, pension: c.pension, source: "Passbook" }));
  const coveredThrough = minDate(passbook.printedOn, `${Number(fy.slice(0, 4)) + 1}-03-31`);
  const contradicted = contradictedTypedEntries(existing, fileAsEntries, `${fy.slice(0, 4)}-04-01`, coveredThrough);

  // ----- Writes
  const create: PassbookEntryDraft[] = [];
  const update: PlannedWrites["update"] = [];
  const remove: string[] = [];
  if (superseded) remove.push(superseded.id);
  if (openingDraft) create.push(openingDraft);
  for (const row of credits) {
    const { credit, source } = row;
    const figures = { date: credit.date, employee: credit.employee, employer: credit.employer, pension: credit.pension };
    if (row.status === "new") create.push({ kind: "Contribution", wageMonth: credit.wageMonth, ...figures, source });
    else if (row.status === "replaces-typed" || (row.status === "conflict" && row.resolution === "passbook")) update.push({ id: row.existing!.id, patch: { ...figures, source } });
  }
  if (passbook.interest) {
    const figures = { date: passbook.interest.date, employee: passbook.interest.employee, employer: passbook.interest.employer, pension: passbook.interest.pension };
    if (interestStatus === "new") create.push({ kind: "Interest", ...figures, source: "Passbook" });
    else if (interestStatus === "replaces-typed" || (interestStatus === "conflict" && interestResolution === "passbook")) update.push({ id: existingInterest!.id, patch: { ...figures, source: "Passbook" } });
  }
  for (const entry of contradicted) if (input.contradicted[entry.id] === "remove") remove.push(entry.id);

  // The rows can't collide with each other or with what stays, by the same rule the routes use.
  const removed = new Set(remove);
  const state: Omit<EpfEntry, "id">[] = existing.filter((e) => !removed.has(e.id) && !update.some((u) => u.id === e.id));
  for (const u of update) state.push({ ...existing.find((e) => e.id === u.id)!, ...u.patch });
  for (const draft of create) {
    const row = { ...draft, epfAccountId: accountId };
    const clash = entryConflict(state.map((e, i) => ({ ...e, id: `s${i}` })), row);
    if (clash) blockers.push(clash);
    state.push(row);
  }

  // ----- What the account looks like afterwards
  const projected: EpfEntry[] = state.map((e, i) => ({ ...e, id: `p${i}`, epfAccountId: accountId }));
  if (checks.passes && blockers.length === 0) {
    const after = epfBalance(projected, passbook.closingDate);
    if (!sameShares(after, passbook.closing)) warnings.push(`After this import the app would hold ${formatInr(after.employee + after.employer)} on ${passbook.closingDate}, and the passbook's closing balance is ${formatInr(passbook.closing.employee + passbook.closing.employer)}`);
  }

  // ----- The credited interest against the rule
  let rule: InterestRule | null = null;
  if (passbook.interest) {
    const withoutThisInterest = projected.filter((e) => !(e.kind === "Interest" && financialYearOf(e.date) === fy));
    const accountRates = input.rates.filter((r) => r.epfAccountId === account?.id);
    const rate = epfRateForYear(withoutThisInterest, accountRates, fy);
    const credited = { employee: passbook.interest.employee, employer: passbook.interest.employer, total: passbook.interest.employee + passbook.interest.employer };
    const asEntry: EpfEntry = { id: "interest", epfAccountId: accountId, kind: "Interest", ...passbook.interest, source: "Passbook" };
    if (rate) {
      const ruleGives = epfInterestForYear(withoutThisInterest, fy, rate.ratePercent);
      rule = { ratePercent: rate.ratePercent, source: rate.source, ruleGives, credited, difference: credited.total - ruleGives.total, impliedRatePercent: impliedRatePercent([...withoutThisInterest, asEntry], fy) };
    }
  }

  // ----- The account itself
  const writes: PlannedWrites = { create, update, remove };
  if (choice?.kind === "new") {
    writes.createAccount = { name: choice.name.trim(), establishment: passbook.establishment, memberIdLast4: passbook.memberIdLast4, status: "Active", confirmedThrough: coveredThrough };
  } else if (account) {
    const patch: Partial<Omit<EpfAccount, "id">> = {};
    if (!account.memberIdLast4 && passbook.memberIdLast4) patch.memberIdLast4 = passbook.memberIdLast4;
    // Complete up to the day the file covers: its print date, or the end of its year for an earlier year. Never moves back.
    if (!account.confirmedThrough || coveredThrough > account.confirmedThrough) patch.confirmedThrough = coveredThrough;
    if (Object.keys(patch).length > 0) writes.patchAccount = patch;
  }

  return {
    passbook,
    checks,
    match,
    choice,
    account,
    credits,
    interest: { status: interestStatus, existing: existingInterest, resolution: interestResolution, rule },
    opening,
    supersededOpening: superseded ?? null,
    contradicted,
    writes,
    unverified: reviewed.typed.size > 0,
    typedMonths: [...reviewed.typed].sort(),
    nothingNew: create.length === 0 && update.length === 0 && remove.length === 0,
    warnings,
    blockers,
  };
}
