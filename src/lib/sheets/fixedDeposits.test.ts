import { describe, expect, it } from "vitest";
import { columnSpecs } from "./tableColumns";
import { FIXED_DEPOSIT_COLUMNS, checkFixedDeposit, createFixedDepositSchema, fixedDepositRowSchema, updateFixedDepositSchema } from "./fixedDeposits";

const cumulative = {
  name: "HDFC 1 year",
  bankName: "HDFC Bank",
  principalAmount: 100_000,
  interestRate: 7,
  compoundingType: "Cumulative",
  startDate: "2026-01-01",
  maturityDate: "2027-01-01",
  maturityAmount: 107_189,
  status: "Active",
};

const nonCumulative = { ...cumulative, name: "SBI monthly payout", compoundingType: "Non-Cumulative", payoutFrequency: "Monthly", maturityAmount: 100_000 };

const problems = (input: unknown) => createFixedDepositSchema.safeParse(input).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) ?? [];

describe("createFixedDepositSchema", () => {
  it("accepts a cumulative deposit, and a non-cumulative one that names its payout frequency", () => {
    expect(createFixedDepositSchema.safeParse(cumulative).success).toBe(true);
    expect(createFixedDepositSchema.safeParse(nonCumulative).success).toBe(true);
  });

  it("refuses a maturity date on or before the start date", () => {
    expect(problems({ ...cumulative, maturityDate: "2025-12-31" })).toEqual(["maturityDate: The maturity date must be after the start date"]);
    expect(problems({ ...cumulative, maturityDate: "2026-01-01" })).toEqual(["maturityDate: The maturity date must be after the start date"]);
  });

  it("refuses a maturity amount below what was placed, but accepts one equal to it (a payout deposit)", () => {
    expect(problems({ ...cumulative, maturityAmount: 99_000 })).toEqual(["maturityAmount: The maturity amount can't be less than the amount placed"]);
    expect(createFixedDepositSchema.safeParse({ ...cumulative, maturityAmount: 100_000 }).success).toBe(true);
  });

  it("needs a non-cumulative deposit's payout frequency, and refuses one on a cumulative deposit", () => {
    const noFrequency = { ...nonCumulative, payoutFrequency: undefined };
    expect(problems(noFrequency)).toEqual(["payoutFrequency: Say how often a non-cumulative deposit pays out its interest"]);
    expect(problems({ ...cumulative, payoutFrequency: "Monthly" })).toEqual(["payoutFrequency: A cumulative deposit reinvests its interest, so it has no payout frequency"]);
  });

  it("reports every broken rule at once, each at its own field", () => {
    expect(problems({ ...cumulative, maturityDate: "2025-01-01", maturityAmount: 1, payoutFrequency: "Yearly" })).toHaveLength(3);
  });

  it("refuses a principal of zero", () => {
    expect(createFixedDepositSchema.safeParse({ ...cumulative, principalAmount: 0, maturityAmount: 0 }).success).toBe(false);
  });
});

describe("fixedDepositRowSchema", () => {
  it("reads a good row, and leaves out one whose dates run backwards", () => {
    expect(fixedDepositRowSchema.safeParse({ ...cumulative, id: "fd-1" }).success).toBe(true);
    expect(fixedDepositRowSchema.safeParse({ ...cumulative, id: "fd-2", maturityDate: "2025-01-01" }).success).toBe(false);
  });
});

describe("checkFixedDeposit", () => {
  it("catches what a partial update can't see: moving the maturity date before the stored start date", () => {
    expect(updateFixedDepositSchema.safeParse({ maturityDate: "2025-06-01" }).success).toBe(true);
    expect(checkFixedDeposit({ ...cumulative, id: "fd-1", maturityDate: "2025-06-01" } as never)).toBe("The maturity date must be after the start date");
    expect(checkFixedDeposit({ ...cumulative, id: "fd-1" } as never)).toBeNull();
  });

  it("catches switching a payout deposit to Cumulative while its payout frequency is still set", () => {
    expect(checkFixedDeposit({ ...nonCumulative, id: "fd-3", compoundingType: "Cumulative" } as never)).toBe(
      "A cumulative deposit reinvests its interest, so it has no payout frequency",
    );
  });
});

describe("updateFixedDepositSchema", () => {
  it("lets an update clear the payout frequency, so the switch to Cumulative can be written", () => {
    expect(updateFixedDepositSchema.safeParse({ compoundingType: "Cumulative", payoutFrequency: "" }).success).toBe(true);
    expect(updateFixedDepositSchema.safeParse({ payoutFrequency: "Weekly" }).success).toBe(false);
  });

  it("a cleared payout frequency overrides the stored one as unset, so the switch passes its whole-row check", () => {
    const patch = updateFixedDepositSchema.parse({ compoundingType: "Cumulative", payoutFrequency: "" });
    const merged = { ...nonCumulative, id: "fd-3", ...patch };
    expect(merged.payoutFrequency).toBeUndefined();
    expect(checkFixedDeposit(merged as never)).toBeNull();
  });
});

describe("the FixedDeposits tab's dropdowns", () => {
  it("come from the schema, so the Sheet and the code can't drift apart", () => {
    const specs = columnSpecs(FIXED_DEPOSIT_COLUMNS as string[], fixedDepositRowSchema);
    const options = (name: string) => specs.find((spec) => spec.name === name)?.options;
    expect(options("compoundingType")).toEqual(["Cumulative", "Non-Cumulative"]);
    expect(options("payoutFrequency")).toEqual(["Monthly", "Quarterly", "Yearly"]);
    expect(options("status")).toEqual(["Active", "Matured", "Closed"]);
    expect(specs.find((spec) => spec.name === "startDate")?.type).toBe("DATE");
    expect(specs.find((spec) => spec.name === "principalAmount")?.type).toBe("DOUBLE");
  });
});
