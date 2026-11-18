import { describe, expect, it } from "vitest";
import { clearFailure, failureMessage, pendingId, pendingSpend, recordFailure, PENDING_PREFIX, type FailedAdd } from "./pendingAdds";

const input = { date: "2026-11-18", amount: 349, method: "UPI" as const, category: "food", note: "Snacks" };
const failedAdd = (id: string, message = "No"): FailedAdd => ({ id, input, message });

describe("a spend still being saved", () => {
  it("has a temporary id the page can recognise", () => {
    expect(pendingId(3)).toBe("pending-3");
    expect(pendingId(3).startsWith(PENDING_PREFIX)).toBe(true);
  });
  it("looks like a spend, carrying a category and a note only when it has them", () => {
    expect(pendingSpend("pending-1", input)).toEqual({ id: "pending-1", date: "2026-11-18", amount: 349, method: "UPI", category: "food", note: "Snacks" });
    expect(pendingSpend("pending-2", { date: "2026-11-18", amount: 90, method: "Card" })).toEqual({ id: "pending-2", date: "2026-11-18", amount: 90, method: "Card" });
  });
});

describe("failureMessage", () => {
  it("says a request that got no answer may have gone through, so a retry could double it", () => {
    expect(failureMessage("unreachable")).toMatch(/Check the day's list before you retry/);
  });
  it("gives the Sheet's own reason when it has one (a quota or a timeout), else a plain one", () => {
    expect(failureMessage({ status: "failed", message: "Google Sheets didn't answer in time, so this may or may not have been saved. Check before trying again." })).toMatch(/may or may not have been saved/);
    expect(failureMessage({ status: "failed" })).toMatch(/nothing was written/);
  });
  it("gives the first thing that was wrong when it was refused", () => {
    expect(failureMessage({ status: "invalid", errors: { category: "Choose a category from the list" } })).toBe("Choose a category from the list");
    expect(failureMessage({ status: "invalid", errors: {} })).toBe("That didn't save.");
  });
});

describe("the list of failed adds", () => {
  it("adds one, and a retry that fails again replaces its entry instead of piling up", () => {
    const list = recordFailure(recordFailure([], failedAdd("pending-1")), failedAdd("pending-2"));
    expect(list.map((f) => f.id)).toEqual(["pending-1", "pending-2"]);
    const again = recordFailure(list, failedAdd("pending-1", "Still no"));
    expect(again.map((f) => [f.id, f.message])).toEqual([["pending-2", "No"], ["pending-1", "Still no"]]);
  });
  it("clears one that was saved, retried or dismissed, and leaves the others", () => {
    const list = [failedAdd("pending-1"), failedAdd("pending-2")];
    expect(clearFailure(list, "pending-1").map((f) => f.id)).toEqual(["pending-2"]);
    expect(clearFailure(list, "nope")).toHaveLength(2);
  });
});
