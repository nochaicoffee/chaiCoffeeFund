import { describe, expect, it } from "vitest";
import { trapTarget } from "./focusTrap";

describe("trapTarget", () => {
  it("wraps forward from the last item to the first", () => {
    expect(trapTarget(3, 4, false)).toBe(0);
  });

  it("wraps backward from the first item to the last", () => {
    expect(trapTarget(0, 4, true)).toBe(3);
  });

  it("pulls focus back in from outside the list", () => {
    expect(trapTarget(-1, 4, true)).toBe(3);
  });

  it("leaves a step inside the list to the browser", () => {
    expect(trapTarget(1, 4, false)).toBeNull();
    expect(trapTarget(2, 4, true)).toBeNull();
  });

  it("does nothing for an empty list", () => {
    expect(trapTarget(0, 0, false)).toBeNull();
  });

  it("keeps a one-item list on its item", () => {
    expect(trapTarget(0, 1, false)).toBe(0);
    expect(trapTarget(0, 1, true)).toBe(0);
  });
});
