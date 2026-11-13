import { describe, expect, it } from "vitest";
import { balanceDayConflict } from "./balanceRules";

const rows = [
  { id: "1", accountId: "a", date: "2026-11-01" },
  { id: "2", accountId: "b", date: "2026-11-01" },
];

describe("balanceDayConflict", () => {
  it("refuses a second balance for the same account and day, and names the row to update", () => {
    expect(balanceDayConflict(rows, { accountId: "a", date: "2026-11-01" })).toContain("(id 1)");
  });
  it("allows the same day for another account, and another day for the same account", () => {
    expect(balanceDayConflict(rows, { accountId: "c", date: "2026-11-01" })).toBeNull();
    expect(balanceDayConflict(rows, { accountId: "a", date: "2026-11-02" })).toBeNull();
  });
  it("lets a row keep its own account and day when it is the one being changed", () => {
    expect(balanceDayConflict(rows, { accountId: "a", date: "2026-11-01" }, "1")).toBeNull();
    expect(balanceDayConflict(rows, { accountId: "a", date: "2026-11-01" }, "2")).not.toBeNull();
  });
});
