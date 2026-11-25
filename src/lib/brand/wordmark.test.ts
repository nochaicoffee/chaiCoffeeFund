import { describe, expect, it } from "vitest";
import { splitWordmark } from "./wordmark";

describe("splitWordmark", () => {
  it("sets the trailing Fund apart", () => {
    expect(splitWordmark("chaiCoffeeFund")).toEqual({ lead: "chaiCoffee", accent: "Fund" });
  });

  it("keeps any other name whole", () => {
    expect(splitWordmark("Budget")).toEqual({ lead: "Budget", accent: "" });
    expect(splitWordmark("")).toEqual({ lead: "", accent: "" });
  });

  it("doesn't split a name that is only the accent word", () => {
    expect(splitWordmark("Fund")).toEqual({ lead: "Fund", accent: "" });
  });

  it("joins back to the name it was given", () => {
    for (const name of ["chaiCoffeeFund", "MyFund", "Ledger", "Fund"]) {
      const { lead, accent } = splitWordmark(name);
      expect(lead + accent).toBe(name);
    }
  });
});
