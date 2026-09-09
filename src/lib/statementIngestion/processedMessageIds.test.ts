import { describe, expect, it } from "vitest";
import { isProcessed, markProcessed } from "./processedMessageIds";

describe("markProcessed / isProcessed", () => {
  it("adds a new id", () => {
    const store = markProcessed({ ids: ["a"] }, "b");
    expect(store.ids).toEqual(["a", "b"]);
  });

  it("returns the same store (no duplicate) when the id is already present", () => {
    const store = { ids: ["a", "b"] };
    expect(markProcessed(store, "b")).toBe(store);
  });

  it("isProcessed reflects membership", () => {
    const store = { ids: ["a", "b"] };
    expect(isProcessed(store, "a")).toBe(true);
    expect(isProcessed(store, "z")).toBe(false);
  });
});
