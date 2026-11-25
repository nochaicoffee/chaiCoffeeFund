import { describe, expect, it } from "vitest";
import { isActiveSection, PHONE_TAB_HREFS, SECTIONS, splitForPhone } from "./sections";

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

describe("splitForPhone", () => {
  const { tabs, more } = splitForPhone(SECTIONS);

  it("puts the four favourites on the bar, in order", () => {
    expect(tabs.map((s) => s.href)).toEqual([...PHONE_TAB_HREFS]);
  });

  it("leaves every other section behind More, so none is lost or listed twice", () => {
    expect(tabs.length + more.length).toBe(SECTIONS.length);
    expect(more.some((s) => tabs.includes(s))).toBe(false);
    expect(new Set([...tabs, ...more])).toEqual(new Set(SECTIONS));
  });

  it("keeps More in sidebar order", () => {
    const order = SECTIONS.map((s) => s.href);
    const hrefs = more.map((s) => s.href);
    expect(hrefs).toEqual(order.filter((h) => hrefs.includes(h)));
  });
});
