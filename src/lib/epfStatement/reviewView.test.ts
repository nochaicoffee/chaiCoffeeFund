import { describe, expect, it } from "vitest";
import { NO_EDITS, planEpfImport } from "./importPlan";
import type { PlanInput } from "./importPlan";
import { parseEpfPassbookText } from "./parseEpfPassbookText";
import { checkLines, importLabel, missingWageMonths, suggestedRow, summaryRows, wageMonthLabel } from "./reviewView";
import { FAKE, aTypicalYear, syntheticPassbookText } from "./__fixtures__/syntheticPassbook";

const read = (change: Parameters<typeof aTypicalYear>[0] = {}) => {
  const r = parseEpfPassbookText(syntheticPassbookText(aTypicalYear(change)));
  if (!r.ok) throw new Error(r.problem);
  return r.passbook;
};
const account = { id: "acc-1", name: "Example", memberIdLast4: FAKE.memberIdLast4, status: "Active" as const };
const plan = (over: Partial<PlanInput> = {}) => planEpfImport({ original: read(), edits: NO_EDITS, accounts: [account], entries: [], rates: [], choice: null, resolutions: {}, contradicted: {}, ...over });
const full = aTypicalYear();
const shortOriginal = () => {
  const r = parseEpfPassbookText(syntheticPassbookText({ ...full, credits: full.credits.filter((_, i) => i !== 5), printedTotal: { employee: 120000, employer: 120000, pension: 0 }, closing: { employee: 229000, employer: 229000, pension: 0 } }));
  if (!r.ok) throw new Error(r.problem);
  return r.passbook;
};

describe("the missing row", () => {
  it("names the wage months the year doesn't have, March to February", () => {
    expect(missingWageMonths(read())).toEqual([]);
    expect(missingWageMonths(shortOriginal())).toEqual(["2025-08"]);
    expect(wageMonthLabel("2025-08")).toBe("Aug 2025");
  });
  it("offers it credited on the 1st of the next month, with the amounts the checks found missing", () => {
    expect(suggestedRow(plan({ original: shortOriginal() }))).toEqual({ wageMonth: "2025-08", date: "2025-09-01", employee: 10000, employer: 10000, pension: 0 });
  });
  it("never suggests a day after the passbook was printed, or a month it doesn't have", () => {
    expect(suggestedRow(plan())).toBeNull();
    const dec = read();
    dec.credits = dec.credits.filter((c) => c.wageMonth !== "2026-02");
    dec.printedOn = "2026-02-20";
    expect(suggestedRow(plan({ original: dec }))?.date).toBe("2026-02-20");
  });
});

describe("the words of the review", () => {
  it("says the checks pass with the figures", () => {
    const lines = checkLines(plan());
    expect(lines.map((l) => l.ok)).toEqual([true, true, true]);
    expect(lines[0].detail).toBe("₹2,00,000 + ₹2,40,000 + ₹18,000 = ₹4,58,000, the closing balance on the passbook.");
    expect(lines[1].detail).toContain("12 credits, ₹2,40,000");
  });
  it("says which check failed, and by how much", () => {
    const lines = checkLines(plan({ original: shortOriginal() }));
    expect(lines[0]).toMatchObject({ ok: false });
    expect(lines[0].detail).toContain("but the passbook says ₹4,58,000");
    expect(lines[1]).toMatchObject({ ok: false });
    expect(lines[1].detail).toContain("the total line says ₹2,40,000".replace("the", "The"));
  });
  it("marks the year unverified after a typed row", () => {
    const added = { wageMonth: "2025-08", date: "2025-09-01", employee: 10000, employer: 10000, pension: 0 };
    const lines = checkLines(plan({ original: shortOriginal(), edits: { changed: {}, added: [added] } }));
    expect(lines[1].detail).toContain("11 read from the file and 1 you added or changed, so the year stays marked unverified");
  });
  it("shows the rule's figure and the difference, and says the credited figure is kept", () => {
    const rate = { id: "r", epfAccountId: "acc-1", financialYear: "2025-26", ratePercent: 8.25, source: "Declared" as const };
    const line = checkLines(plan({ rates: [rate] }))[2];
    expect(line.detail).toMatch(/the rule at 8\.25% \(declared\) gives ₹[\d,]+, a difference of/);
    expect(line.detail).toContain("The credited figure is what is kept");
    expect(checkLines(plan())[2].detail).toContain("No rate is known for this year");
  });
  it("labels the button by what it will do", () => {
    expect(importLabel(plan())).toBe("Import 12 credits and the interest");
    const stored = plan().writes.create.map((d, i) => ({ id: `e${i}`, epfAccountId: "acc-1", ...d }));
    expect(importLabel(plan({ entries: stored, accounts: [{ ...account, confirmedThrough: "2026-03-31" }] }))).toBe("Done");
    expect(importLabel(plan({ entries: stored }))).toBe("Save");
    // The interest answered "the file's" is the interest, not a credit; a redundant opening row alone is "Save".
    const other = stored.map((e) => (e.kind === "Interest" ? { ...e, employee: 1 } : e));
    expect(importLabel(plan({ entries: other, accounts: [{ ...account, confirmedThrough: "2026-03-31" }] }))).toBe("Import the interest");
    expect(importLabel(plan({ entries: other, accounts: [{ ...account, confirmedThrough: "2026-03-31" }], resolutions: { interest: "mine" } }))).toBe("Done");
  });
  it("counts what importing does", () => {
    expect(summaryRows(plan())).toEqual([
      { label: "New credits", value: "12" },
      { label: "Already in the app", value: "0" },
      { label: "Interest to record", value: "₹18,000" },
      { label: "Balance after", value: "₹4,58,000" },
    ]);
  });
});
