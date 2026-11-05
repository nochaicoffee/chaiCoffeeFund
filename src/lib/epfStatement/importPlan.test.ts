import { describe, expect, it } from "vitest";
import type { EpfAccount, EpfEntry, EpfRate } from "../sheets/types";
import { NO_EDITS, applyReviewEdits, creditKey, INTEREST_KEY, matchEpfAccount, planEpfImport } from "./importPlan";
import type { PlanInput } from "./importPlan";
import { parseEpfPassbookText } from "./parseEpfPassbookText";
import type { EpfPassbook } from "./parseEpfPassbookText";
import { FAKE, aTypicalYear, syntheticPassbookText } from "./__fixtures__/syntheticPassbook";

function read(change: Parameters<typeof aTypicalYear>[0] = {}): EpfPassbook {
  const r = parseEpfPassbookText(syntheticPassbookText(aTypicalYear(change)));
  if (!r.ok) throw new Error(r.problem);
  return r.passbook;
}
const account = (change: Partial<EpfAccount> = {}): EpfAccount => ({ id: "acc-1", name: "Example Software", memberIdLast4: FAKE.memberIdLast4, status: "Active", ...change });
let n = 0;
const entry = (e: Partial<EpfEntry> & Pick<EpfEntry, "kind" | "date">): EpfEntry => ({ id: `e${++n}`, epfAccountId: "acc-1", employee: 10000, employer: 10000, pension: 0, source: "Passbook", ...e });
const credit = (wageMonth: string, date: string, change: Partial<EpfEntry> = {}) => entry({ kind: "Contribution", wageMonth, date, ...change });
const plan = (over: Partial<PlanInput> = {}) =>
  planEpfImport({ original: read(), edits: NO_EDITS, accounts: [account()], entries: [], rates: [], choice: null, resolutions: {}, contradicted: {}, ...over });

describe("which account", () => {
  it("takes the one account whose member ID ends the same", () => {
    const p = plan();
    expect(p.match).toEqual({ kind: "match", account: account() });
    expect(p.account?.id).toBe("acc-1");
    expect(p.blockers).toEqual([]);
  });
  it("waits for a choice when none matches or several do, and never guesses", () => {
    const none = plan({ accounts: [account({ memberIdLast4: "9999" }), account({ id: "acc-2", memberIdLast4: undefined })] });
    expect(none.match.kind).toBe("none");
    expect(none.account).toBeNull();
    expect(none.blockers).toContain("Choose which EPF account this passbook is for");
    expect(plan({ accounts: [account(), account({ id: "acc-2" })] }).match.kind).toBe("several");
    expect(matchEpfAccount([account()], undefined).kind).toBe("none");
  });
  it("lets him pick an account without a member ID, which then gets the file's last four", () => {
    const p = plan({ accounts: [account({ memberIdLast4: undefined })], choice: { kind: "existing", id: "acc-1" } });
    expect(p.blockers).toEqual([]);
    expect(p.writes.patchAccount).toMatchObject({ memberIdLast4: FAKE.memberIdLast4 });
  });
  it("refuses an account for a different member ID", () => {
    const p = plan({ accounts: [account({ memberIdLast4: "9999" })], choice: { kind: "existing", id: "acc-1" } });
    expect(p.blockers.join(" ")).toMatch(/ending 9999/);
  });
  it("creates a named account, with the file's last four and employer, and needs a name", () => {
    const p = plan({ accounts: [], choice: { kind: "new", name: "Example job" } });
    expect(p.blockers).toEqual([]);
    expect(p.writes.createAccount).toMatchObject({ name: "Example job", memberIdLast4: FAKE.memberIdLast4, establishment: FAKE.establishment, status: "Active" });
    expect(plan({ accounts: [], choice: { kind: "new", name: "  " } }).blockers).toContain("Name the new account");
  });
});

describe("a first import", () => {
  it("adds every credit, the interest and the opening balance, as the passbook's", () => {
    const p = plan();
    expect(p.credits.every((c) => c.status === "new" && c.source === "Passbook")).toBe(true);
    expect(p.interest.status).toBe("new");
    expect(p.opening).toBe("added");
    expect(p.writes.create).toHaveLength(14); // 12 credits + interest + opening
    expect(p.writes.create.filter((e) => e.kind === "Opening")).toEqual([{ kind: "Opening", date: "2025-03-31", employee: 100000, employer: 100000, pension: 0, source: "Passbook" }]);
    expect(p.writes.update).toEqual([]);
    expect(p.unverified).toBe(false);
    expect(p.nothingNew).toBe(false);
    expect(p.warnings).toEqual([]);
  });
  it("sets the account confirmed up to the end of an earlier year, not the day the file was printed", () => {
    expect(plan().writes.patchAccount).toEqual({ confirmedThrough: "2026-03-31" });
  });
  it("sets it to the print date for the year in progress, and never moves it back", () => {
    const running = read({ startYear: 2026, opening: { employee: 229000, employer: 229000, pension: 0 }, interest: { employee: 0, employer: 0, pension: 0 }, credits: [{ wageMonth: "2026-03", date: "2026-04-01", employee: 10000, employer: 10000 }] });
    expect(plan({ original: running }).writes.patchAccount).toEqual({ confirmedThrough: "2026-11-04" });
    expect(plan({ accounts: [account({ confirmedThrough: "2026-12-01" })] }).writes.patchAccount).toBeUndefined();
  });
  it("adds no opening balance when the year starts at zero", () => {
    const p = plan({ original: read({ opening: { employee: 0, employer: 0, pension: 0 }, closing: undefined }) });
    expect(p.opening).toBe("none");
    expect(p.writes.create.some((e) => e.kind === "Opening")).toBe(false);
  });
});

describe("importing the same year twice", () => {
  const first = plan();
  const stored: EpfEntry[] = first.writes.create.map((d) => entry(d));
  it("changes nothing", () => {
    const again = plan({ entries: stored });
    expect(again.credits.every((c) => c.status === "same")).toBe(true);
    expect(again.interest.status).toBe("same");
    expect(again.opening).toBe("present");
    expect(again.nothingNew).toBe(true);
    expect(again.writes.create).toEqual([]);
    expect(again.warnings).toEqual([]);
  });
});

describe("typed credits and conflicts", () => {
  it("a typed credit with the passbook's figures becomes the passbook's", () => {
    const p = plan({ entries: [credit("2025-05", "2025-06-01", { source: "Typed" })] });
    const row = p.credits.find((c) => c.credit.wageMonth === "2025-05")!;
    expect(row.status).toBe("replaces-typed");
    expect(p.writes.update).toEqual([{ id: expect.any(String), patch: { date: "2025-06-01", employee: 10000, employer: 10000, pension: 0, source: "Passbook" } }]);
    expect(p.writes.create.some((e) => e.wageMonth === "2025-05")).toBe(false);
  });
  it("a different day is a conflict, the passbook's by default, and keeping his own writes nothing", () => {
    const typed = credit("2025-05", "2025-06-02", { source: "Typed" });
    const passbookWins = plan({ entries: [typed] });
    expect(passbookWins.credits.find((c) => c.credit.wageMonth === "2025-05")).toMatchObject({ status: "conflict", resolution: "passbook" });
    expect(passbookWins.writes.update).toHaveLength(1);
    const mine = plan({ entries: [typed], resolutions: { [creditKey("2025-05")]: "mine" } });
    expect(mine.writes.update).toEqual([]);
    expect(mine.writes.create.some((e) => e.wageMonth === "2025-05")).toBe(false);
  });
  it("a different amount from a passbook row already imported is a conflict too, never a second row", () => {
    const p = plan({ entries: [credit("2025-05", "2025-06-01", { employee: 9000 })] });
    expect(p.credits.find((c) => c.credit.wageMonth === "2025-05")?.status).toBe("conflict");
    expect(p.writes.create.filter((e) => e.wageMonth === "2025-05")).toEqual([]);
  });
  it("a typed interest with the passbook's figures becomes the passbook's, like a typed credit", () => {
    const typed = entry({ kind: "Interest", date: "2026-03-31", employee: 9000, employer: 9000, source: "Typed" });
    const p = plan({ entries: [typed] });
    expect(p.interest.status).toBe("replaces-typed");
    expect(p.writes.update).toContainEqual({ id: typed.id, patch: { date: "2026-03-31", employee: 9000, employer: 9000, pension: 0, source: "Passbook" } });
    expect(p.writes.create.some((e) => e.kind === "Interest")).toBe(false);
  });
  it("a different interest figure is a conflict he answers", () => {
    const stored = entry({ kind: "Interest", date: "2026-03-31", employee: 8000, employer: 8000 });
    expect(plan({ entries: [stored] }).interest).toMatchObject({ status: "conflict", resolution: "passbook" });
    expect(plan({ entries: [stored] }).writes.update.some((u) => u.id === stored.id)).toBe(true);
    expect(plan({ entries: [stored], resolutions: { [INTEREST_KEY]: "mine" } }).writes.update.some((u) => u.id === stored.id)).toBe(false);
  });
  it("lists typed credits the file contradicts, keeps them unless he says remove, and leaves other years alone", () => {
    const stray = credit("2025-04", "2025-05-17", { source: "Typed" }); // inside the year, but the file has no wage month Apr 2025... it does
    const real = credit("2024-01", "2025-07-17", { source: "Typed" }); // a wage month the file doesn't have, in the year
    const nextYear = credit("2026-03", "2026-04-18", { source: "Typed" });
    const p = plan({ entries: [stray, real, nextYear] });
    expect(p.contradicted.map((e) => e.id)).toEqual([real.id]);
    expect(p.writes.remove).toEqual([]);
    expect(plan({ entries: [real], contradicted: { [real.id]: "remove" } }).writes.remove).toEqual([real.id]);
  });
  it("only counts a typed credit contradicted up to the day the file covers", () => {
    const running = read({ startYear: 2026, opening: { employee: 229000, employer: 229000, pension: 0 }, interest: { employee: 0, employer: 0, pension: 0 }, credits: [{ wageMonth: "2026-03", date: "2026-04-01", employee: 10000, employer: 10000 }] });
    const afterPrint = credit("2026-10", "2026-11-18", { source: "Typed" });
    expect(plan({ original: running, entries: [afterPrint] }).contradicted).toEqual([]);
  });
});

describe("correcting the review", () => {
  const short = (): EpfPassbook => {
    const full = aTypicalYear();
    const r = parseEpfPassbookText(syntheticPassbookText({ ...full, credits: full.credits.filter((_, i) => i !== 5), printedTotal: { employee: 120000, employer: 120000, pension: 0 }, closing: { employee: 229000, employer: 229000, pension: 0 } }));
    if (!r.ok) throw new Error(r.problem);
    return r.passbook;
  };
  const missing = { wageMonth: "2025-08", date: "2025-09-01", employee: 10000, employer: 10000, pension: 0 };
  it("can't import a file that doesn't add up", () => {
    const p = plan({ original: short() });
    expect(p.checks.passes).toBe(false);
    expect(p.blockers).toContain("The checks don't pass, so nothing can be imported yet");
  });
  it("can import after he adds the missing row, which is saved as typed and marks the year unverified", () => {
    const p = plan({ original: short(), edits: { changed: {}, added: [missing] } });
    expect(p.checks.passes).toBe(true);
    expect(p.blockers).toEqual([]);
    expect(p.unverified).toBe(true);
    expect(p.typedMonths).toEqual(["2025-08"]);
    expect(p.writes.create.find((e) => e.wageMonth === "2025-08")?.source).toBe("Typed");
    expect(p.writes.create.filter((e) => e.kind === "Contribution" && e.wageMonth !== "2025-08").every((e) => e.source === "Passbook")).toBe(true);
  });
  it("a changed row is typed too, since it is no longer what the file says", () => {
    const original = read();
    const p = plan({ original, edits: { changed: { "2025-05": { date: "2025-06-02", employee: 10000, employer: 10000, pension: 0 } }, added: [] } });
    expect(p.typedMonths).toEqual(["2025-05"]);
    expect(p.writes.create.find((e) => e.wageMonth === "2025-05")).toMatchObject({ date: "2025-06-02", source: "Typed" });
  });
  it("a row put back exactly as the file has it is the file's row again, not a typed one", () => {
    const original = read();
    const first = original.credits[1];
    const p = plan({ original, edits: { changed: { [first.wageMonth]: { date: first.date, employee: first.employee, employer: first.employer, pension: first.pension } }, added: [] } });
    expect(p.typedMonths).toEqual([]);
    expect(p.unverified).toBe(false);
  });
  it("a wrong amount typed in still doesn't pass", () => {
    const p = plan({ original: short(), edits: { changed: {}, added: [{ ...missing, employee: 9000 }] } });
    expect(p.checks.passes).toBe(false);
  });
  it("refuses an edit that can't be right", () => {
    const original = short();
    const bad = (credit: Partial<typeof missing>) => applyReviewEdits(original, { changed: {}, added: [{ ...missing, ...credit }] }).problems;
    expect(bad({ date: "2027-01-01" })[0]).toMatch(/outside 2025-26/);
    expect(bad({ date: "2025-07-31" })[0]).toMatch(/can't come in the month of its wages/);
    expect(bad({ date: "2025-09-31" })[0]).toMatch(/isn't a date/);
    expect(bad({ employee: -5 })[0]).toMatch(/whole number/);
    expect(bad({ wageMonth: "2025-13" })[0]).toMatch(/isn't a month/);
    expect(bad({ wageMonth: "2025-05" })[0]).toMatch(/already a row for that wage month/);
    expect(applyReviewEdits(original, { changed: { "2020-01": { date: "2025-09-01", employee: 1, employer: 1, pension: 0 } }, added: [] }).problems[0]).toMatch(/isn't in the file/);
  });
});

describe("the balance carried in", () => {
  it("adds nothing when the account already has earlier entries that agree", () => {
    const earlier = [credit("2025-02", "2025-03-01", { employee: 100000, employer: 100000 })];
    const p = plan({ entries: earlier });
    expect(p.opening).toBe("present");
    expect(p.writes.create.some((e) => e.kind === "Opening")).toBe(false);
    expect(p.warnings).toEqual([]);
  });
  it("says so when earlier entries don't agree with the passbook's opening", () => {
    const p = plan({ entries: [credit("2025-02", "2025-03-01")] });
    expect(p.opening).toBe("differs");
    expect(p.warnings.join(" ")).toMatch(/an earlier year may be missing/);
  });
  it("drops a later year's opening balance once this earlier year's rows make it redundant", () => {
    const laterOpening = entry({ kind: "Opening", date: "2026-03-31", employee: 229000, employer: 229000 });
    const p = plan({ entries: [laterOpening] });
    expect(p.supersededOpening?.id).toBe(laterOpening.id);
    expect(p.writes.remove).toEqual([laterOpening.id]);
    expect(p.writes.create.filter((e) => e.kind === "Opening")).toHaveLength(1);
    expect(p.blockers).toEqual([]);
  });
  it("never writes a second opening balance for an account that has one", () => {
    const other = entry({ kind: "Opening", date: "2020-03-31", employee: 5, employer: 5 });
    const p = plan({ entries: [other] });
    expect(p.writes.create.some((e) => e.kind === "Opening")).toBe(false);
  });
});

describe("the credited interest against the rule", () => {
  const prior = (rate: number) => [{ id: "r1", epfAccountId: "acc-1", financialYear: "2025-26", ratePercent: rate, source: "Declared" } satisfies EpfRate];
  it("shows what the rule gives at the year's rate and the difference, never changing the credited figure", () => {
    const p = plan({ rates: prior(8.25) });
    expect(p.interest.rule?.ratePercent).toBe(8.25);
    expect(p.interest.rule?.source).toBe("Declared");
    // 100,000 opening each + 10,000 a month from May: 100000×8.25%/12 + … rounded per share
    expect(p.interest.rule?.ruleGives.employee).toBeGreaterThan(8000);
    expect(p.interest.rule?.credited).toEqual({ employee: 9000, employer: 9000, total: 18000 });
    expect(p.interest.rule?.difference).toBe(18000 - (p.interest.rule?.ruleGives.total ?? 0));
    expect(p.writes.create.find((e) => e.kind === "Interest")).toMatchObject({ employee: 9000, employer: 9000 });
  });
  it("says what rate the credited interest implies", () => {
    // Interest is linear in the rate, so the implied rate is the entered rate scaled by credited ÷ what the rule gave.
    const rule = plan({ rates: prior(8.25) }).interest.rule!;
    expect(rule.impliedRatePercent).toBeCloseTo((8.25 * rule.credited.total) / rule.ruleGives.total, 1);
  });
  it("has nothing to compare when no rate is known", () => {
    expect(plan().interest.rule).toBeNull();
  });
  it("has no comparison for a year with no credited interest yet", () => {
    const running = read({ startYear: 2026, opening: { employee: 229000, employer: 229000, pension: 0 }, interest: { employee: 0, employer: 0, pension: 0 }, credits: [{ wageMonth: "2026-03", date: "2026-04-01", employee: 10000, employer: 10000 }] });
    const p = plan({ original: running, rates: prior(8.25) });
    expect(p.interest).toMatchObject({ status: "none", rule: null });
  });
});

describe("nothing goes wrong in the account's own rows", () => {
  it("uses only the chosen account's rows", () => {
    const otherAccount = credit("2025-05", "2025-06-02", { epfAccountId: "acc-2" });
    const p = plan({ entries: [otherAccount], accounts: [account(), account({ id: "acc-2", memberIdLast4: "7777" })] });
    expect(p.credits.every((c) => c.status === "new")).toBe(true);
  });
});
