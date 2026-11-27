import { describe, expect, it } from "vitest";
import { figureClass } from "./sentenceFigure";

describe("a sentence's bold part", () => {
  it("keeps a figure on one line", () => {
    expect(figureClass("₹1,23,456")).toContain("whitespace-nowrap");
    expect(figureClass("51 this year")).toContain("whitespace-nowrap");
  });

  it("lets a list of names wrap", () => {
    expect(figureClass("SBI Rainy Day, Kotak Everyday, Axis EMI, ICICI Invest")).not.toContain("whitespace-nowrap");
  });
});
