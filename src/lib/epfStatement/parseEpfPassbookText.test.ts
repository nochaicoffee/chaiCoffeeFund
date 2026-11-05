import { describe, expect, it } from "vitest";
import { checkEpfPassbook, parseEpfPassbookText, passbookEntries } from "./parseEpfPassbookText";
import type { EpfPassbook, ParseEpfPassbookResult } from "./parseEpfPassbookText";
import { FAKE, aTypicalYear, indian, syntheticPassbookText } from "./__fixtures__/syntheticPassbook";

function ok(result: ParseEpfPassbookResult) {
  if (!result.ok) throw new Error(`expected a passbook, got: ${result.problem}`);
  return result;
}
const problemOf = (result: ParseEpfPassbookResult) => {
  if (result.ok) throw new Error("expected a problem");
  return result.problem;
};

describe("reading a passbook", () => {
  const { passbook, checks } = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear())));

  it("reads the year, the print date and what identifies the account", () => {
    expect(passbook.financialYear).toBe("2025-26");
    expect(passbook.printedOn).toBe("2026-11-04");
    expect(passbook.memberIdLast4).toBe(FAKE.memberIdLast4);
    expect(passbook.establishment).toBe(FAKE.establishment);
  });
  it("reads every credit with its wage month, the day credited and the three shares", () => {
    expect(passbook.credits).toHaveLength(12);
    expect(passbook.credits[0]).toEqual({ wageMonth: "2025-03", date: "2025-04-01", employee: 10000, employer: 10000, pension: 0 });
    expect(passbook.credits[11]).toMatchObject({ wageMonth: "2026-02", date: "2026-03-01" });
  });
  it("reads the opening balance, the printed total, the interest and the closing balance for each share", () => {
    expect(passbook.opening).toEqual({ employee: 100000, employer: 100000, pension: 0 });
    expect(passbook.openingDate).toBe("2025-03-31");
    expect(passbook.printedContributions).toEqual({ employee: 120000, employer: 120000, pension: 0 });
    expect(passbook.interest).toEqual({ date: "2026-03-31", employee: 9000, employer: 9000, pension: 0 });
    expect(passbook.closing).toEqual({ employee: 229000, employer: 229000, pension: 0 });
    expect(passbook.closingDate).toBe("2026-03-31");
  });
  it("passes both checks when the file adds up", () => {
    expect(checks).toEqual({ rowsGap: { employee: 0, employer: 0, pension: 0 }, balanceGap: { employee: 0, employer: 0, pension: 0 }, rowsAddToTotal: true, balanceReconciles: true, passes: true });
  });
  it("reads lakh grouping and the older 'Cont. for Due-Month' wording", () => {
    const big = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ oldWording: true, opening: { employee: 1234567, employer: 1234567, pension: 0 } }))));
    expect(big.passbook.opening.employee).toBe(1234567);
    expect(big.passbook.credits).toHaveLength(12);
    expect(syntheticPassbookText(aTypicalYear({ oldWording: true }))).toContain("Cont. for Due-Month 042025");
    expect(indian(1234567)).toBe("12,34,567");
  });
  it("carries the pension share when there is one", () => {
    const withPension = aTypicalYear();
    withPension.credits[0] = { ...withPension.credits[0], pension: 1250 };
    const r = ok(parseEpfPassbookText(syntheticPassbookText(withPension)));
    expect(r.passbook.credits[0].pension).toBe(1250);
    expect(r.passbook.printedContributions.pension).toBe(1250);
    expect(r.checks.passes).toBe(true);
  });
});

describe("a year still running", () => {
  const running = aTypicalYear({
    startYear: 2026,
    opening: { employee: 229000, employer: 229000, pension: 0 },
    credits: [
      { wageMonth: "2026-03", date: "2026-04-01", employee: 14323, employer: 14323 },
      { wageMonth: "2026-04", date: "2026-05-01", employee: 14323, employer: 14323 },
    ],
    interest: { employee: 0, employer: 0, pension: 0 },
    printedOn: "2026-11-04",
  });
  it("has no credited interest yet and still passes", () => {
    const r = ok(parseEpfPassbookText(syntheticPassbookText(running)));
    expect(r.passbook.financialYear).toBe("2026-27");
    expect(r.passbook.interest).toBeNull();
    expect(r.passbook.closingDate).toBe("2027-03-31");
    expect(r.checks.passes).toBe(true);
  });
  it("a year that has ended but whose interest EPFO hasn't credited yet prints 0: not credited, never a zero row", () => {
    const r = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ interest: { employee: 0, employer: 0, pension: 0 }, printedOn: "2026-05-10" }))));
    expect(r.passbook.interest).toBeNull();
    expect(r.checks.passes).toBe(true);
    expect(passbookEntries(r.passbook).some((e) => e.kind === "Interest")).toBe(false);
  });
  it("refuses interest dated after the day it was printed", () => {
    const odd = syntheticPassbookText({ ...running, interest: { employee: 500, employer: 500, pension: 0 } });
    expect(problemOf(parseEpfPassbookText(odd))).toMatch(/interest dated after/);
  });
});

describe("a file that doesn't add up", () => {
  it("says the rows don't match the printed total, with the gap for each share", () => {
    const r = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ printedTotal: { employee: 125000, employer: 123000, pension: 0 } }))));
    expect(r.checks.rowsAddToTotal).toBe(false);
    expect(r.checks.rowsGap).toEqual({ employee: 5000, employer: 3000, pension: 0 });
    expect(r.checks.balanceReconciles).toBe(true);
    expect(r.checks.passes).toBe(false);
  });
  it("says the balance doesn't reconcile, with the gap", () => {
    const r = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ closing: { employee: 229500, employer: 229000, pension: 0 } }))));
    expect(r.checks.balanceReconciles).toBe(false);
    expect(r.checks.balanceGap).toEqual({ employee: 500, employer: 0, pension: 0 });
    expect(r.checks.rowsAddToTotal).toBe(true);
    expect(r.checks.passes).toBe(false);
  });
  it("a row missing from the page fails both checks, and the gap is that row's amount", () => {
    const full = aTypicalYear();
    const missing = { ...full, credits: full.credits.filter((_, i) => i !== 5), printedTotal: { employee: 120000, employer: 120000, pension: 0 }, closing: { employee: 229000, employer: 229000, pension: 0 } };
    const r = ok(parseEpfPassbookText(syntheticPassbookText(missing)));
    expect(r.passbook.credits).toHaveLength(11);
    expect(r.checks.rowsGap.employee).toBe(10000);
    expect(r.checks.balanceGap.employee).toBe(10000);
    expect(r.checks.passes).toBe(false);
  });
  it("re-checks after a row is corrected or added in the review", () => {
    const full = aTypicalYear();
    const { passbook } = ok(parseEpfPassbookText(syntheticPassbookText({ ...full, credits: full.credits.filter((_, i) => i !== 5), printedTotal: { employee: 120000, employer: 120000, pension: 0 }, closing: { employee: 229000, employer: 229000, pension: 0 } })));
    const fixed: EpfPassbook = { ...passbook, credits: [...passbook.credits, { wageMonth: "2025-08", date: "2025-09-01", employee: 10000, employer: 10000, pension: 0 }] };
    expect(checkEpfPassbook(fixed).passes).toBe(true);
    // A wrong amount typed in doesn't pass.
    expect(checkEpfPassbook({ ...fixed, credits: [...passbook.credits, { wageMonth: "2025-08", date: "2025-09-01", employee: 9000, employer: 10000, pension: 0 }] }).passes).toBe(false);
  });
});

describe("what it refuses to guess", () => {
  const typical = () => aTypicalYear();
  it("a credit row it can't read stops the file, and says how many, never a value", () => {
    const problem = problemOf(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ garbleRow: 3 }))));
    expect(problem).toBe("1 of the credit rows couldn't be read");
  });
  it("a withdrawal or a transfer-in, which no passbook of his has", () => {
    const some = { employee: 1000, employer: 1000, pension: 0 };
    expect(problemOf(parseEpfPassbookText(syntheticPassbookText({ ...typical(), withdrawals: some })))).toMatch(/withdrawal/);
    // A misread amount in one of those lines is reported as a misread, not as a withdrawal.
    const garbled = syntheticPassbookText(typical()).replace(/(Total Withdrawals for the year \[ 2025 \]) 0 0 0/, "$1 1,0,0 0 0");
    expect(problemOf(parseEpfPassbookText(garbled))).toBe("an amount on the page couldn't be read");
    expect(problemOf(parseEpfPassbookText(syntheticPassbookText({ ...typical(), transferIns: some })))).toMatch(/transfer-in/);
  });
  it("two credits for one wage month, since a credit is identified by its wage month", () => {
    const t = typical();
    t.credits[4] = { ...t.credits[4], wageMonth: t.credits[3].wageMonth };
    expect(problemOf(parseEpfPassbookText(syntheticPassbookText(t)))).toMatch(/same wage month/);
  });
  it("a credit dated 31 February", () => {
    const t = typical();
    t.credits[0] = { ...t.credits[0], date: "2025-02-31" };
    expect(problemOf(parseEpfPassbookText(syntheticPassbookText(t)))).toMatch(/isn't on the calendar/);
  });
  it("a credit whose dates don't fit: before its wage month, outside the year, after the print date, or not in its own credit month", () => {
    const edit = (change: (t: ReturnType<typeof aTypicalYear>) => void) => {
      const t = typical();
      change(t);
      return problemOf(parseEpfPassbookText(syntheticPassbookText(t)));
    };
    const fits = "a credit row has dates that don't fit the passbook's year";
    expect(edit((t) => (t.credits[0] = { ...t.credits[0], wageMonth: "2025-05" }))).toBe(fits); // credited before its wage month ended
    expect(edit((t) => (t.credits[0] = { ...t.credits[0], date: "2031-04-01" }))).toBe(fits); // outside the year and after the print date
    expect(edit((t) => (t.credits[0] = { ...t.credits[0], date: "2025-03-15", wageMonth: "2025-02" }))).toBe(fits); // before the year starts
    expect(edit((t) => { t.printedOn = "2025-12-01"; t.interest = { employee: 0, employer: 0, pension: 0 }; })).toBe(fits); // credits dated after the day it was printed
    expect(problemOf(parseEpfPassbookText(syntheticPassbookText(typical()).replace("Due-Month 202504", "Due-Month 202505")))).toBe(fits);
  });
  it("more than one financial year in a file, or totals for another year", () => {
    const one = syntheticPassbookText(typical());
    expect(problemOf(parseEpfPassbookText(`${one} ${one}`))).toMatch(/more than one financial year/);
    expect(problemOf(parseEpfPassbookText(one.replace("Total Contributions for the year [ 2025 ]", "Total Contributions for the year [ 2024 ]")))).toMatch(/different year/);
  });
  it("text that isn't a passbook, or one without a print date or the page's totals", () => {
    expect(problemOf(parseEpfPassbookText("Statement of account for some other bank"))).toMatch(/doesn't look like an EPF passbook/);
    const good = syntheticPassbookText(typical());
    expect(problemOf(parseEpfPassbookText(good.replace("Printed On :", "Printed :")))).toMatch(/printed/);
    expect(problemOf(parseEpfPassbookText(good.replace("Total Contributions", "Total Things")))).toMatch(/total contributions/);
    expect(problemOf(parseEpfPassbookText(good.replace("Closing Balance as on", "Closing as on")))).toMatch(/closing balance/);
  });
  it("an amount whose commas are in the wrong place", () => {
    const bad = syntheticPassbookText(typical()).replace("1,00,000 1,00,000 0", "1,0,000 1,00,000 0");
    expect(problemOf(parseEpfPassbookText(bad))).toBe("an amount on the page couldn't be read");
  });
  it("an opening balance that isn't the end of the previous year", () => {
    const wrong = syntheticPassbookText(typical()).replace("OB Int. Updated upto 31/03/2025", "OB Int. Updated upto 31/03/2024");
    expect(problemOf(parseEpfPassbookText(wrong))).toMatch(/opening balance/);
  });
});

describe("what leaves the parser", () => {
  const result = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear())));
  it("holds no UAN, date of birth, name or full member ID", () => {
    const everything = JSON.stringify(result);
    for (const secret of [FAKE.uan, FAKE.dateOfBirth, FAKE.memberName, "SAMPLE", FAKE.memberId, FAKE.establishmentId]) expect(everything).not.toContain(secret);
  });
  it("a refusal never repeats the file's text either", () => {
    const problem = problemOf(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ garbleRow: 0 }))));
    for (const secret of [FAKE.uan, FAKE.memberName, FAKE.memberId, "not a row"]) expect(problem).not.toContain(secret);
  });
});

describe("the rows an import would write", () => {
  it("is each credit and the year's interest, all from the passbook", () => {
    const { passbook } = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear())));
    const rows = passbookEntries(passbook);
    expect(rows).toHaveLength(13);
    expect(rows.every((r) => r.source === "Passbook")).toBe(true);
    expect(rows[0]).toEqual({ kind: "Contribution", date: "2025-04-01", wageMonth: "2025-03", employee: 10000, employer: 10000, pension: 0, source: "Passbook" });
    expect(rows[12]).toEqual({ kind: "Interest", date: "2026-03-31", employee: 9000, employer: 9000, pension: 0, source: "Passbook" });
  });
  it("has no interest row for a year still running", () => {
    const { passbook } = ok(parseEpfPassbookText(syntheticPassbookText(aTypicalYear({ startYear: 2026, credits: [{ wageMonth: "2026-03", date: "2026-04-01", employee: 10000, employer: 10000 }], interest: { employee: 0, employer: 0, pension: 0 } }))));
    expect(passbookEntries(passbook).some((r) => r.kind === "Interest")).toBe(false);
  });
});
