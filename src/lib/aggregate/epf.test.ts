import { describe, expect, it } from "vitest";
import {
  contradictedTypedEntries, entriesOfAccount, contributionsByMonth, creditLagDays, creditedInterest, epfBalance, epfInterestForYear, epfMonthStates, epfRateForYear,
  epfYearReconciles, financialYearEnd, financialYearOf, financialYearStart, impliedRatePercent, interestNotYetCredited, projectEpf, usualCreditDay,
  yearEndInterestEstimate,
} from "./epf";
import { ACCOUNT_ID, credit, HIS_ENTRIES, interestEntry } from "./epf.fixture";
import type { EpfEntry, EpfRate } from "../sheets/types";

const opening = (date: string, each: number): EpfEntry => ({ id: "o", epfAccountId: ACCOUNT_ID, kind: "Opening", date, employee: each, employer: each, pension: 0, source: "Typed" });
const rate = (financialYear: string, ratePercent: number, source: EpfRate["source"] = "Declared"): EpfRate => ({ id: `r-${financialYear}`, epfAccountId: ACCOUNT_ID, financialYear, ratePercent, source });

describe("financial years", () => {
  it("runs 1 April to 31 March", () => {
    expect(financialYearOf("2026-03-31")).toBe("2025-26");
    expect(financialYearOf("2026-04-01")).toBe("2026-27");
    expect(financialYearOf("2027-03-31")).toBe("2026-27");
    expect(financialYearStart("2026-27")).toBe("2026-04-01");
    expect(financialYearEnd("2026-27")).toBe("2027-03-31");
  });
});

describe("epfBalance", () => {
  it("is the passbook's closing balance at each year end (both shares added)", () => {
    expect(epfBalance(HIS_ENTRIES, "2024-03-31").total).toBe(2 * 20492);
    expect(epfBalance(HIS_ENTRIES, "2025-03-31").total).toBe(2 * 175159);
    expect(epfBalance(HIS_ENTRIES, "2026-03-31").total).toBe(2 * 360029);
  });
  it("is the passbook's running total today: ₹4,76,283 for each share, ₹9,52,566 in all", () => {
    const b = epfBalance(HIS_ENTRIES, "2026-11-04");
    expect(b.employee).toBe(476283);
    expect(b.employer).toBe(476283);
    expect(b.pension).toBe(0);
    expect(b.total).toBe(952566);
  });
  it("counts nothing dated after the day, and adds an opening balance", () => {
    expect(epfBalance(HIS_ENTRIES, "2024-01-31").total).toBe(0);
    expect(epfBalance([opening("2026-03-31", 50000)], "2026-04-01").total).toBe(100000);
  });
});

describe("epfInterestForYear: the rule against what EPFO credited", () => {
  it("gives exactly what EPFO credited for FY 2024-25 (₹7,211 each share, ₹14,422 in all) at 8.25%", () => {
    expect(epfInterestForYear(HIS_ENTRIES, "2024-25", 8.25)).toEqual({ employee: 7211, employer: 7211, total: 14422 });
  });
  it("gives exactly what EPFO credited for FY 2025-26 (₹20,462 each share, ₹40,924 in all) at 8.25%", () => {
    expect(epfInterestForYear(HIS_ENTRIES, "2025-26", 8.25)).toEqual({ employee: 20462, employer: 20462, total: 40924 });
  });
  it("is within ₹1 for FY 2023-24, which is only ₹116 (₹117 against ₹116, the rounding of tiny sums)", () => {
    const got = epfInterestForYear(HIS_ENTRIES, "2023-24", 8.25).total;
    expect(Math.abs(got - 116)).toBeLessThanOrEqual(1);
  });
  it("does not match at 8.5%: ₹14,858 and ₹42,164, which is why his years are 8.25%", () => {
    expect(epfInterestForYear(HIS_ENTRIES, "2024-25", 8.5).total).toBe(14858); // each share rounded on its own, as EPFO credits it
    expect(epfInterestForYear(HIS_ENTRIES, "2025-26", 8.5).total).toBe(42164);
  });
  it("grows one credit exactly as the rule says: ₹6,000 each share counted from the month after, for 11 months", () => {
    // credited 1 April, so it earns from May to March: 11 months × 6,000 × 8.25% ÷ 12 = 453.75 for each share, rounded to 454
    const one = [credit("c", "2026-03", "2026-04-01", 6000)];
    expect(epfInterestForYear(one, "2026-27", 8.25)).toEqual({ employee: 454, employer: 454, total: 908 });
  });
  it("counts a credit from the month AFTER it is credited, never the month it arrives", () => {
    const oneMonth = [credit("c", "2026-03", "2027-02-20", 12000)];
    // credited 20 Feb: counts in March only (1 month), not in February
    expect(epfInterestForYear(oneMonth, "2026-27", 12)).toEqual({ employee: 120, employer: 120, total: 240 }); // 12,000 each share × 12% ÷ 12 × 1 month
  });
  it("starts a year from the balance at its start, interest on the opening balance for all twelve months", () => {
    expect(epfInterestForYear([opening("2026-03-31", 50000)], "2026-27", 12)).toEqual({ employee: 6000, employer: 6000, total: 12000 });
  });
  it("leaves the pension share out: it earns nothing here", () => {
    const withPension: EpfEntry[] = [{ ...opening("2026-03-31", 0), pension: 100000 }];
    expect(epfInterestForYear(withPension, "2026-27", 12).total).toBe(0);
  });
  it("stops at the last month that has fully passed when given a day", () => {
    const upToOctober = epfInterestForYear(HIS_ENTRIES, "2026-27", 8.25, { through: "2026-11-04" });
    expect(upToOctober.total).toBe(39008); // April to October, the seven months that have passed
    expect(epfInterestForYear(HIS_ENTRIES, "2026-27", 8.25, { through: "2026-10-30" }).total).toBeLessThan(upToOctober.total); // October not over yet
  });
});

describe("a balance that starts partway through a year", () => {
  it("earns interest from the month after an Opening balance dated in the year (₹50,000 each share from Aug 1 at 12%: 7 months, ₹3,500 each)", () => {
    const mid = [{ ...opening("2026-08-01", 50000) }];
    expect(epfInterestForYear(mid, "2026-27", 12)).toEqual({ employee: 3500, employer: 3500, total: 7000 });
  });
});

describe("one account at a time", () => {
  const other: EpfEntry = { ...credit("x", "2026-03", "2026-04-01", 5000), epfAccountId: "epf-2" };
  it("refuses entries from two accounts instead of adding their balances together", () => {
    expect(() => epfBalance([...HIS_ENTRIES, other], "2026-11-04")).toThrow(/one account/);
    expect(() => epfInterestForYear([...HIS_ENTRIES, other], "2026-27", 8.25)).toThrow(/one account/);
  });
  it("filters one account's entries out of a mixed list", () => {
    expect(entriesOfAccount([...HIS_ENTRIES, other], "epf-1")).toHaveLength(HIS_ENTRIES.length);
    expect(epfBalance(entriesOfAccount([...HIS_ENTRIES, other], "epf-1"), "2026-11-04").total).toBe(952566);
  });
});

describe("rates", () => {
  it("implies 8.25% from each credited year's interest, worked out and not stored", () => {
    expect(impliedRatePercent(HIS_ENTRIES, "2024-25")).toBe(8.25);
    expect(impliedRatePercent(HIS_ENTRIES, "2025-26")).toBe(8.25);
  });
  it("only pins a tiny first year to about a tenth of a percent", () => {
    expect(impliedRatePercent(HIS_ENTRIES, "2023-24")).toBe(8.3);
  });
  it("is null when the year has no credited interest", () => {
    expect(impliedRatePercent(HIS_ENTRIES, "2026-27")).toBeNull();
  });
  it("uses an entered rate first, a credited year's implied rate next, then the latest earlier rate marked Assumed", () => {
    expect(epfRateForYear(HIS_ENTRIES, [rate("2026-27", 8.5)], "2026-27")).toEqual({ ratePercent: 8.5, source: "Declared" });
    expect(epfRateForYear(HIS_ENTRIES, [], "2025-26")).toEqual({ ratePercent: 8.25, source: "Implied" });
    expect(epfRateForYear(HIS_ENTRIES, [], "2026-27")).toEqual({ ratePercent: 8.25, source: "Assumed" });
  });
  it("does not imply a rate from a year that is missing a credit, and assumes the earlier year's instead", () => {
    const missingSep = HIS_ENTRIES.filter((e) => e.wageMonth !== "2025-09"); // September 2025's wages left out
    expect(impliedRatePercent(missingSep, "2025-26")).toBeNull();
    expect(epfRateForYear(missingSep, [], "2025-26")).toEqual({ ratePercent: 8.25, source: "Assumed" });
  });
  it("says there is no rate when nothing is known", () => {
    expect(epfRateForYear([], [], "2026-27")).toBeNull();
  });
  it("keeps an entered rate's own source", () => {
    expect(epfRateForYear([], [rate("2026-27", 8.3, "Assumed")], "2026-27")).toEqual({ ratePercent: 8.3, source: "Assumed" });
  });
});

describe("interestNotYetCredited", () => {
  it("is ₹39,008 for April to October at the assumed 8.25%, and says it is assumed", () => {
    const e = interestNotYetCredited(HIS_ENTRIES, [], "2026-11-04");
    expect(e).toMatchObject({ amount: 39008, source: "Assumed", ratePercent: 8.25, months: 7, credited: false });
  });
  it("follows a declared rate: 8.5% gives ₹40,190", () => {
    expect(interestNotYetCredited(HIS_ENTRIES, [rate("2026-27", 8.5)], "2026-11-04")).toMatchObject({ amount: 40190, source: "Declared" });
  });
  it("is nothing once the year's interest is credited", () => {
    const withIt = [...HIS_ENTRIES, interestEntry("i", "2027-03-31", 37301)];
    expect(interestNotYetCredited(withIt, [], "2027-03-31")).toMatchObject({ amount: 0, credited: true });
  });
  it("is nothing with no rate to use", () => {
    expect(interestNotYetCredited([credit("c", "2026-03", "2026-04-01", 1000)], [], "2026-11-04")).toMatchObject({ amount: 0, ratePercent: null });
  });
});

describe("yearEndInterestEstimate", () => {
  it("is ₹74,456 if each month still to come brings a credit the size of the last one", () => {
    expect(yearEndInterestEstimate(HIS_ENTRIES, [], "2026-11-04")).toMatchObject({ amount: 74456, source: "Assumed", credited: false });
  });
  it("keeps a month that is due but missing: it counts like a credit arriving today", () => {
    // October's credit (due the 18th) is still missing on 25 Nov, so it counts from December, exactly like a typed credit dated 25 Nov.
    const missing = yearEndInterestEstimate(HIS_ENTRIES, [], "2026-11-25").amount;
    const typed = yearEndInterestEstimate([...HIS_ENTRIES, credit("t", "2026-10", "2026-11-25", 19654, "Typed")], [], "2026-11-25").amount;
    expect(missing).toBe(typed);
    const leftOut = epfInterestForYear(HIS_ENTRIES, "2026-27", 8.25, { extra: [] }).total; // what ignoring every credit still to come would give
    expect(missing).toBeGreaterThan(leftOut);
  });
  it("is the credited figure once it is there", () => {
    const withIt = [...HIS_ENTRIES, interestEntry("i", "2027-03-31", 37301)];
    expect(yearEndInterestEstimate(withIt, [], "2027-03-31")).toMatchObject({ amount: 74602, credited: true });
  });
});

describe("projectEpf (arithmetic, never a forecast)", () => {
  it("works out a hand-checked case: ₹1,00,000 at 12% for a year with nothing added is ₹1,12,000", () => {
    // 12 months × (1,00,000 × 12% ÷ 12 = ₹1,000), credited on 31 March
    const p = projectEpf([opening("2026-03-31", 50000)], [rate("2026-27", 12)], "2026-04-04", 1, 0);
    expect(p).toEqual({ years: 1, total: 112000, contributed: 0, interest: 12000 });
  });
  it("adds each month's credit and compounds each March (10 years at ₹39,308 a month and 8.25%: ₹93,72,860)", () => {
    const p = projectEpf(HIS_ENTRIES, [], "2026-11-04", 10, 39308);
    expect(p).toMatchObject({ years: 10, total: 9372860, contributed: 4716960 });
    expect(p!.total).toBe(952566 + p!.contributed + p!.interest);
  });
  it("matches the 5 and 20 year figures the design shows", () => {
    expect(projectEpf(HIS_ENTRIES, [], "2026-11-04", 5, 39308)!.total).toBe(4362394);
    expect(projectEpf(HIS_ENTRIES, [], "2026-11-04", 20, 39308)!.total).toBe(27890725);
  });
  it("has no answer without a rate", () => {
    expect(projectEpf([], [], "2026-11-04", 5, 1000)).toBeNull();
  });
});

describe("epfMonthStates", () => {
  const credits = HIS_ENTRIES.filter((e) => e.kind === "Contribution");
  const states = (printed: string | null, entries: EpfEntry[] = credits) => Object.fromEntries(epfMonthStates(entries, "2026-27", printed).map((m) => [m.wageMonth, m.state]));

  it("confirms the months in the passbook and expects the rest, on a passbook printed on 4 Nov", () => {
    const s = states("2026-11-04");
    expect(["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map((m) => s[m])).toEqual(Array(7).fill("Confirmed"));
    expect(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"].map((m) => s[m])).toEqual(Array(5).fill("Expected"));
  });
  it("calls October Late once a passbook printed after its usual day (the 18th) still doesn't have it", () => {
    expect(states("2026-11-25")["2026-10"]).toBe("Late");
    expect(states("2026-11-25")["2026-11"]).toBe("Expected");
  });
  it("never calls a month Late on an old passbook printed before its usual day", () => {
    const old = credits.filter((e) => e.date <= "2026-09-17");
    expect(states("2026-10-05", old)["2026-09"]).toBe("Expected"); // due 18 Oct, after the print date
  });
  it("is never Late when there is no print date", () => {
    expect(Object.values(states(null))).not.toContain("Late");
  });
  it("marks a typed credit Typed, and still counts it", () => {
    const typed = [...HIS_ENTRIES, credit("t", "2026-10", "2026-11-18", 19654, "Typed")];
    expect(states("2026-11-25", typed)["2026-10"]).toBe("Typed");
    expect(epfBalance(typed, "2026-11-25").total).toBe(952566 + 2 * 19654);
  });
  it("is never Late on the usual day itself: a passbook printed on the 18th may be a few hours early", () => {
    expect(states("2026-11-18")["2026-10"]).toBe("Expected");
    expect(states("2026-11-19")["2026-10"]).toBe("Late");
  });
  it("marks wage months before the account's first credit as Before, not Expected or Late", () => {
    const first = Object.fromEntries(epfMonthStates(HIS_ENTRIES, "2023-24", "2026-11-04").map((m) => [m.wageMonth, m.state]));
    expect(["2023-03", "2023-06", "2023-12"].map((m) => first[m])).toEqual(["Before", "Before", "Before"]);
    expect([first["2024-01"], first["2024-02"]]).toEqual(["Confirmed", "Confirmed"]);
  });
  it("sizes an expected month like the last credit: ₹39,308 for both shares", () => {
    expect(epfMonthStates(credits, "2026-27", "2026-11-04").find((m) => m.wageMonth === "2026-10")).toMatchObject({ amount: 39308, due: "2026-11-18" });
  });
});

describe("credits", () => {
  it("measures how long after the wage month each came: 1 day until May's wages, then 26, 18, 17, 18", () => {
    const lag = (wage: string) => creditLagDays(HIS_ENTRIES.find((e) => e.wageMonth === wage)!);
    expect(lag("2026-05")).toBe(1);
    expect(lag("2026-06")).toBe(26);
    expect(lag("2026-07")).toBe(18);
    expect(lag("2026-08")).toBe(17);
    expect(lag("2026-09")).toBe(18);
  });
  it("finds the usual day: the 18th (the middle of the latest three)", () => {
    expect(usualCreditDay(HIS_ENTRIES)).toBe(18);
    expect(usualCreditDay([])).toBeNull();
  });
  it("adds up what went in by the month it was credited", () => {
    const by = contributionsByMonth(HIS_ENTRIES);
    expect(by["2026-08"]).toBe(39308);
    expect(by["2026-07"]).toBe(28646);
    expect(by["2024-02"]).toBe(2 * 8482);
  });
  it("reads the interest EPFO credited for a year", () => {
    expect(creditedInterest(HIS_ENTRIES, "2025-26")).toEqual({ employee: 20462, employer: 20462, total: 40924 });
    expect(creditedInterest(HIS_ENTRIES, "2026-27")).toBeNull();
  });
});

describe("epfYearReconciles", () => {
  it("passes for each of his passbook years (each share)", () => {
    expect(epfYearReconciles({ opening: 0, contributions: 20434, interest: 58, closing: 20492 })).toBe(true);
    expect(epfYearReconciles({ opening: 20492, contributions: 147456, interest: 7211, closing: 175159 })).toBe(true);
    expect(epfYearReconciles({ opening: 175159, contributions: 164408, interest: 20462, closing: 360029 })).toBe(true);
    expect(epfYearReconciles({ opening: 360029, contributions: 116254, interest: 0, closing: 476283 })).toBe(true);
  });
  it("fails when one credit is missing", () => {
    expect(epfYearReconciles({ opening: 175159, contributions: 164408 - 14323, interest: 20462, closing: 360029 })).toBe(false);
  });
});

describe("contradictedTypedEntries", () => {
  const typedOct = credit("t", "2026-10", "2026-11-19", 19654, "Typed");
  const passbookWith = HIS_ENTRIES.filter((e) => e.kind === "Contribution");
  it("lists a typed credit a later passbook (printed after it) doesn't have", () => {
    expect(contradictedTypedEntries([typedOct], passbookWith, "2026-04-01", "2026-12-05")).toEqual([typedOct]);
  });
  it("leaves it alone when the passbook has that wage month", () => {
    const has = [...passbookWith, credit("p", "2026-10", "2026-11-19", 19654)];
    expect(contradictedTypedEntries([typedOct], has, "2026-04-01", "2026-12-05")).toEqual([]);
  });
  it("leaves a typed credit dated after the passbook was printed (it can't know about it)", () => {
    expect(contradictedTypedEntries([typedOct], passbookWith, "2026-04-01", "2026-11-10")).toEqual([]);
  });
});
