import { describe, expect, it } from "vitest";
import { columnSpecs } from "./tableColumns";
import { EPF_RATE_COLUMNS, checkEpfRate, createEpfRateSchema, epfRateRowSchema, updateEpfRateSchema } from "./epfRates";

const rate = { epfAccountId: "a1", financialYear: "2026-27", ratePercent: 8.25, source: "Assumed" };
const problems = (input: unknown) => createEpfRateSchema.safeParse(input).error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`) ?? [];

describe("createEpfRateSchema", () => {
  it("accepts a declared or an assumed rate for a financial year", () => {
    expect(createEpfRateSchema.safeParse(rate).success).toBe(true);
    expect(createEpfRateSchema.safeParse({ ...rate, ratePercent: 8.5, source: "Declared" }).success).toBe(true);
  });
  it("has no Implied source: a credited year's rate is worked out and never stored", () => {
    expect(createEpfRateSchema.safeParse({ ...rate, source: "Implied" }).success).toBe(false);
  });
  it("reads the year as two years in a row, including across the century", () => {
    expect(createEpfRateSchema.safeParse({ ...rate, financialYear: "2099-00" }).success).toBe(true);
    expect(problems({ ...rate, financialYear: "2026-28" })).toEqual(["financialYear: A financial year runs from one year to the next, such as 2026-27"]);
    expect(createEpfRateSchema.safeParse({ ...rate, financialYear: "26-27" }).success).toBe(false);
    expect(createEpfRateSchema.safeParse({ ...rate, financialYear: "FY 2026-27" }).success).toBe(false);
  });
  it("refuses a rate of nothing, a negative one, and one that is surely a typo (over 30)", () => {
    for (const bad of [0, -1, 31, 825]) expect(createEpfRateSchema.safeParse({ ...rate, ratePercent: bad }).success).toBe(false);
  });
});

describe("checkEpfRate and updateEpfRateSchema", () => {
  it("catches moving a year so it no longer runs one year to the next", () => {
    expect(updateEpfRateSchema.safeParse({ financialYear: "2025-27" }).success).toBe(true); // a partial update can't see the rule
    expect(checkEpfRate({ ...rate, financialYear: "2025-27" } as never)).toBe("A financial year runs from one year to the next, such as 2026-27");
    expect(checkEpfRate(rate as never)).toBeNull();
  });
  it("lets an assumed rate be updated to a declared one", () => {
    expect(updateEpfRateSchema.parse({ ratePercent: 8.5, source: "Declared" })).toEqual({ ratePercent: 8.5, source: "Declared" });
  });
});

describe("the EpfRates tab", () => {
  it("has these columns in this order, and reads a row", () => {
    expect(EPF_RATE_COLUMNS).toEqual(["id", "epfAccountId", "financialYear", "ratePercent", "source"]);
    expect(epfRateRowSchema.safeParse({ ...rate, id: "r1" }).success).toBe(true);
  });
  it("gets its dropdown and types from the schema", () => {
    const specs = columnSpecs(EPF_RATE_COLUMNS as string[], epfRateRowSchema);
    expect(specs.find((s) => s.name === "source")?.options).toEqual(["Declared", "Assumed"]);
    expect(specs.find((s) => s.name === "ratePercent")?.type).toBe("DOUBLE");
    expect(specs.find((s) => s.name === "financialYear")?.type).toBe("TEXT");
  });
});
