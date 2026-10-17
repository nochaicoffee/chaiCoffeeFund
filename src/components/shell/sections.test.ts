import { describe, expect, it } from "vitest";
import { isActiveSection, SECTIONS } from "./sections";

describe("isActiveSection", () => {
  it("matches Overview only on the home page", () => {
    expect(isActiveSection("/", "/")).toBe(true);
    expect(isActiveSection("/", "/cards")).toBe(false);
  });

  it("treats sub-pages as part of their section", () => {
    expect(isActiveSection("/cards", "/cards")).toBe(true);
    expect(isActiveSection("/cards", "/cards/statements")).toBe(true);
  });

  it("doesn't match a section whose name is only a prefix", () => {
    expect(isActiveSection("/income", "/income-tax")).toBe(false);
  });
});

describe("SECTIONS", () => {
  it("has unique paths", () => {
    const hrefs = SECTIONS.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
