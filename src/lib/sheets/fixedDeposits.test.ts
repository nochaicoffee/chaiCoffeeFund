import { describe, expect, it } from "vitest";
import type { FixedDeposit } from "./types";
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

describe("a deposit as his FD app shows it", () => {
  // His app shows the amount, the rate, the start and the tenure: no bank and no maturity amount.
  const hisApp = { name: "₹15,000 FD · 13 Mar", principalAmount: 15_000, interestRate: 7.75, compoundingType: "Cumulative", startDate: "2026-03-13", maturityDate: "2027-09-14", status: "Active" };

  it("is accepted with no bank and no maturity amount", () => {
    expect(createFixedDepositSchema.safeParse(hisApp).success).toBe(true);
  });
  it("still refuses a maturity amount below what was placed when one is given", () => {
    expect(problems({ ...hisApp, maturityAmount: 14_000 })).toEqual(["maturityAmount: The maturity amount can't be less than the amount placed"]);
  });
  it("lets an update clear the bank and the maturity amount (once the bank's figure turns out wrong)", () => {
    const patch = updateFixedDepositSchema.parse({ bankName: "", maturityAmount: "" });
    expect(patch.bankName).toBe("");
    expect(patch.maturityAmount).toBeUndefined();
    expect(checkFixedDeposit({ ...cumulative, id: "fd-1", ...patch } as never)).toBeNull();
  });
});

const BASE: FixedDeposit = { id: "fd-1", name: "HDFC 1 year", bankName: "HDFC Bank", principalAmount: 100_000, interestRate: 7, compoundingType: "Cumulative", startDate: "2026-01-01", maturityDate: "2027-01-01", maturityAmount: 107_189, status: "Active" };

describe("closing a deposit", () => {
  const closed = { ...cumulative, status: "Closed", closedDate: "2027-01-02", receivedAmount: 107_189, closeKind: "Matured" };

  it("records the day, the money received and how it ended", () => {
    expect(createFixedDepositSchema.safeParse(closed).success).toBe(true);
    expect(createFixedDepositSchema.safeParse({ ...closed, closeKind: "Pre-closed", closedDate: "2026-11-04", receivedAmount: 103_000 }).success).toBe(true);
  });
  it("lets a closed deposit have none of it (an old row, or one closed before these existed)", () => {
    expect(createFixedDepositSchema.safeParse({ ...cumulative, status: "Closed" }).success).toBe(true);
  });
  it("refuses a closing day, an amount or a way it ended on a deposit that is not closed", () => {
    expect(problems({ ...cumulative, closedDate: "2027-01-02" })).toEqual(["closedDate: Only a closed deposit has a closing day"]);
    expect(problems({ ...cumulative, receivedAmount: 1 })).toEqual(["receivedAmount: Only a closed deposit has an amount received"]);
    expect(problems({ ...cumulative, closeKind: "Matured" })).toEqual(["closeKind: Only a closed deposit has a way it closed"]);
  });
  it("refuses a deposit that closes before it started", () => {
    expect(problems({ ...closed, closeKind: "Pre-closed", closedDate: "2025-12-31" })).toEqual(["closedDate: A deposit can't close before it started"]);
  });
  it("accepts only Matured or Pre-closed as the way it ended", () => {
    expect(createFixedDepositSchema.safeParse({ ...closed, closeKind: "Early" }).success).toBe(false);
  });
  it("reopening a deposit clears what closing recorded, so the whole-row check passes", () => {
    const patch = updateFixedDepositSchema.parse({ status: "Active" });
    expect(patch).toMatchObject({ closedDate: "", receivedAmount: undefined, closeKind: undefined });
    expect(checkFixedDeposit({ ...BASE, ...patch, status: "Active" })).toBeNull();
  });
  it("without that, an Active deposit that still has a closing day fails the whole-row check", () => {
    expect(checkFixedDeposit({ ...BASE, status: "Active", closedDate: "2027-01-02", receivedAmount: 107_189, closeKind: "Matured" })).toBe("Only a closed deposit has a closing day");
  });
  it("closing sets the three together and keeps the rest", () => {
    const patch = updateFixedDepositSchema.parse({ status: "Closed", closedDate: "2027-01-02", receivedAmount: 107_189, closeKind: "Matured" });
    expect(checkFixedDeposit({ ...BASE, ...patch })).toBeNull();
  });

  it("refuses close details sent together with a status that is not Closed, instead of dropping them", () => {
    for (const status of ["Active", "Matured"]) {
      const r = updateFixedDepositSchema.safeParse({ status, closedDate: "2027-01-02" });
      expect(r.success).toBe(false);
      expect(updateFixedDepositSchema.safeParse({ status, receivedAmount: 1000 }).success).toBe(false);
      expect(updateFixedDepositSchema.safeParse({ status, closeKind: "Matured" }).success).toBe(false);
    }
  });
  it("clears what closing recorded when the status goes to Matured too (not only Active), and lets a clearing blank come with it", () => {
    expect(updateFixedDepositSchema.parse({ status: "Matured" })).toMatchObject({ closedDate: "", receivedAmount: undefined, closeKind: undefined });
    expect(updateFixedDepositSchema.safeParse({ status: "Active", closedDate: "", receivedAmount: "", closeKind: "" }).success).toBe(true);
  });
  it("refuses an amount received of nothing", () => {
    expect(problems({ ...closed, receivedAmount: 0 })).toEqual(["receivedAmount: Too small: expected number to be >0"]);
  });
  it("keeps how it ended consistent with the maturity date", () => {
    expect(problems({ ...closed, closedDate: "2026-11-04" })).toEqual(["closeKind: A deposit that closed before its maturity date was closed early: choose Pre-closed"]);
    expect(problems({ ...closed, closeKind: "Pre-closed", closedDate: "2027-01-01" })).toEqual(["closeKind: A deposit that closed on or after its maturity date matured: choose Matured"]);
    expect(createFixedDepositSchema.safeParse({ ...closed, closeKind: "Pre-closed", closedDate: "2026-11-04", receivedAmount: 103_000 }).success).toBe(true);
    expect(createFixedDepositSchema.safeParse({ ...closed, closedDate: "2027-01-01" }).success).toBe(true); // closed on the maturity day itself is at maturity
  });
  it("closed without a day, an amount or a way is still valid, and a closeKind alone is not judged against dates it does not have", () => {
    expect(createFixedDepositSchema.safeParse({ ...cumulative, status: "Closed", closeKind: "Matured" }).success).toBe(true);
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

describe("the FixedDeposits tab's columns", () => {
  it("keep every existing column in its place and add the three close columns at the end", () => {
    expect(FIXED_DEPOSIT_COLUMNS).toEqual([
      "id", "name", "bankName", "principalAmount", "interestRate", "compoundingType", "payoutFrequency", "startDate", "maturityDate",
      "maturityAmount", "accountId", "status", "closedDate", "receivedAmount", "closeKind",
    ]);
  });
});

describe("the FixedDeposits tab's dropdowns", () => {
  it("come from the schema, so the Sheet and the code can't drift apart", () => {
    const specs = columnSpecs(FIXED_DEPOSIT_COLUMNS as string[], fixedDepositRowSchema);
    const options = (name: string) => specs.find((spec) => spec.name === name)?.options;
    expect(options("compoundingType")).toEqual(["Cumulative", "Non-Cumulative"]);
    expect(options("payoutFrequency")).toEqual(["Monthly", "Quarterly", "Yearly"]);
    expect(options("status")).toEqual(["Active", "Matured", "Closed"]);
    expect(options("closeKind")).toEqual(["Matured", "Pre-closed"]);
    expect(specs.find((spec) => spec.name === "closedDate")?.type).toBe("DATE");
    expect(specs.find((spec) => spec.name === "receivedAmount")?.type).toBe("DOUBLE");
    expect(specs.find((spec) => spec.name === "startDate")?.type).toBe("DATE");
    expect(specs.find((spec) => spec.name === "principalAmount")?.type).toBe("DOUBLE");
  });
});
