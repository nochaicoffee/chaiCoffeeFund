import { describe, expect, it } from "vitest";
import type { Setting } from "../sheets/types";
import { dataLookOf, isLook, lookFromSettings, planLook, resolveLook } from "./look";

const row = (value: string, id = "s1"): Setting => ({ id, key: "look", value });

describe("the look", () => {
  it("knows the two looks and nothing else", () => {
    expect(isLook("Classic")).toBe(true);
    expect(isLook("Neubrutalism")).toBe(true);
    expect(isLook("neubrutal")).toBe(false);
    expect(isLook(undefined)).toBe(false);
  });

  it("reads the Settings tab's look row, and nothing when there is none or it isn't a look", () => {
    expect(lookFromSettings([row("Neubrutalism")])).toBe("Neubrutalism");
    expect(lookFromSettings([])).toBeNull();
    expect(lookFromSettings([row("Pastel")])).toBeNull();
  });

  it("follows the Sheet when it was read, whatever the cookie says", () => {
    expect(resolveLook("Neubrutalism", "Classic")).toBe("Neubrutalism");
    expect(resolveLook("Classic", "Neubrutalism")).toBe("Classic");
    // Read, but never set: Classic, not the cookie.
    expect(resolveLook(null, "Neubrutalism")).toBe("Classic");
  });

  it("falls back to the cookie when the Sheet wasn't read, then to Classic", () => {
    expect(resolveLook(undefined, "Neubrutalism")).toBe("Neubrutalism");
    expect(resolveLook(undefined, "nonsense")).toBe("Classic");
    expect(resolveLook(undefined, undefined)).toBe("Classic");
  });

  it("marks only Neubrutalism on <html>, so Classic is the page as it always was", () => {
    expect(dataLookOf("Neubrutalism")).toBe("neubrutal");
    expect(dataLookOf("Classic")).toBeUndefined();
  });

  it("keeps one look row: adds it, updates it, or leaves it when it already says so", () => {
    expect(planLook([], "Neubrutalism")).toEqual({ kind: "create" });
    expect(planLook([row("Classic", "r9")], "Neubrutalism")).toEqual({ kind: "update", id: "r9" });
    expect(planLook([row("Neubrutalism")], "Neubrutalism")).toEqual({ kind: "none" });
  });
});
