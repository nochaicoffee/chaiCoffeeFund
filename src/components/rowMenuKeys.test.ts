import { describe, expect, it } from "vitest";
import { nextMenuIndex } from "./rowMenuKeys";

describe("nextMenuIndex", () => {
  it("steps down and up, wrapping round the ends", () => {
    expect(nextMenuIndex("ArrowDown", 0, 3)).toBe(1);
    expect(nextMenuIndex("ArrowDown", 2, 3)).toBe(0);
    expect(nextMenuIndex("ArrowUp", 1, 3)).toBe(0);
    expect(nextMenuIndex("ArrowUp", 0, 3)).toBe(2);
  });
  it("jumps to the first and last with Home and End, from anywhere", () => {
    expect(nextMenuIndex("Home", 2, 3)).toBe(0);
    expect(nextMenuIndex("End", 0, 3)).toBe(2);
  });
  it("starts at the first item going down when focus isn't on an item", () => {
    expect(nextMenuIndex("ArrowDown", -1, 3)).toBe(0);
  });
  it("ignores other keys and an empty menu", () => {
    expect(nextMenuIndex("a", 0, 3)).toBeNull();
    expect(nextMenuIndex("ArrowDown", -1, 0)).toBeNull();
  });
});
