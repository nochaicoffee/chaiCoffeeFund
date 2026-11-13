import { describe, expect, it } from "vitest";
import { incomeShares, investedShares, leftShares, spentShares } from "./moneyShares";

describe("incomeShares", () => {
  const sources = [
    { source: "NetApp Salary", amount: 1_770_000 },
    { source: "Tax refund", amount: 174_890 },
    { source: "LIC", amount: 143_699 },
    { source: "Hotel Sonali Nov", amount: 66_000 },
    { source: "Hotel Sonali Jan", amount: 54_000 },
  ];
  it("names the biggest sources, folds the rest into Other income, and puts the loan on its own row", () => {
    expect(incomeShares(sources, 1_100_920).map((s) => [s.kind, s.name, s.value])).toEqual([
      ["income", "NetApp Salary", 1_770_000],
      ["income", "Tax refund", 174_890],
      ["income", "LIC", 143_699],
      ["income", "Other income", 120_000],
      ["borrowed", "Borrowed", 1_100_920],
    ]);
  });
  it("has no Other row for a few sources and no Borrowed row when nothing was borrowed", () => {
    expect(incomeShares(sources.slice(0, 2), 0).map((s) => s.name)).toEqual(["NetApp Salary", "Tax refund"]);
    expect(incomeShares([], 0)).toEqual([]);
  });
});

describe("spentShares", () => {
  const out = { "Card bills": 700_330, EMIs: 390_324, "Big spends": 560_066, Subscriptions: 4_390, Investments: 0 };
  it("lists the recorded parts and the cash and UPI that left, in that order, and leaves out what is empty", () => {
    expect(spentShares({ out }, 316_061).map((s) => [s.kind, s.value])).toEqual([["cardBills", 700_330], ["emis", 390_324], ["bigSpends", 560_066], ["subscriptions", 4_390], ["cashUpi", 316_061]]);
    expect(spentShares({ out: { ...out, "Big spends": 0, Subscriptions: 0 } }, 0).map((s) => s.kind)).toEqual(["cardBills", "emis"]);
  });
});

describe("investedShares", () => {
  it("takes what was sent to be the borrowed money first, then his own, and shows what came back as a minus", () => {
    const rows = investedShares({ sent: 1_616_230, takenBack: 449_583, borrowed: 1_100_920 });
    expect(rows.map((s) => [s.kind, s.value])).toEqual([["sentLoan", 1_100_920], ["sentOwn", 515_310], ["takenBack", 449_583]]);
    expect(rows[2].text).toBe("−₹4.5L");
  });
  it("never says more came from the loan than was sent, or than was borrowed", () => {
    expect(investedShares({ sent: 300_000, takenBack: 0, borrowed: 1_100_920 }).map((s) => [s.kind, s.value])).toEqual([["sentLoan", 300_000]]);
    expect(investedShares({ sent: 300_000, takenBack: 0, borrowed: 0 }).map((s) => [s.kind, s.value])).toEqual([["sentOwn", 300_000]]);
    expect(investedShares({ sent: 0, takenBack: 0, borrowed: 0 })).toEqual([]);
  });
});

describe("incomeShares with money held for others", () => {
  it("puts held money on its own row after the loan, and leaves it out when there is none", () => {
    const rows = incomeShares([{ source: "Salary", amount: 100 }], 50, 20);
    expect(rows.map((r) => [r.kind, r.name, r.value])).toEqual([["income", "Salary", 100], ["borrowed", "Borrowed", 50], ["held", "Held for others", 20]]);
    expect(incomeShares([{ source: "Salary", amount: 100 }], 0).map((r) => r.kind)).toEqual(["income"]);
  });
});

describe("leftShares", () => {
  it("names money lent out less what came back, and nothing when none is out", () => {
    expect(leftShares({ lent: 182_000, returned: 0 }).map((s) => [s.kind, s.name, s.value])).toEqual([["lent", "Lent to people", 182_000]]);
    expect(leftShares({ lent: 0, returned: 0 })).toEqual([]);
    expect(leftShares({ lent: -5_000, returned: 0 })).toEqual([]);
  });

  it("names money handed back to someone whose money he held, apart from money lent", () => {
    expect(leftShares({ lent: 0, returned: 258_357 }).map((s) => [s.kind, s.name, s.value])).toEqual([["returned", "Handed back to others", 258_357]]);
    expect(leftShares({ lent: 10_000, returned: 5_000 }).map((s) => s.kind)).toEqual(["lent", "returned"]);
  });
});
