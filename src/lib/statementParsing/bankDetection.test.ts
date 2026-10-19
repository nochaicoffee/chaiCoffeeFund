import { describe, expect, it } from "vitest";
import { detectBank, mentionsBank } from "./bankDetection";

describe("detectBank", () => {
  it.each([
    ["HDFC Bank Statement of Accounts", "hdfc"],
    ["Welcome to ICICI Bank Credit Card", "icici"],
    ["AXIS BANK payment summary", "axis"],
    ["SBI Card statement", "sbi"],
    ["Your KOTAK credit card bill", "kotak"],
    ["AMERICAN EXPRESS Card Member Statement", "amex"],
    ["Statement from CSB Bank / jupiter.money", "csb"],
    ["YES BANK Credit Card Statement", "yes"],
  ] as const)("detects %s as %s", (text, expected) => {
    expect(detectBank(text)).toBe(expected);
  });

  it("returns unknown when no keyword matches", () => {
    expect(detectBank("Some random statement text")).toBe("unknown");
  });

  it("picks the first bank in its list when the text names several", () => {
    expect(detectBank("YES BANK statement. Pay by HDFC Bank NetBanking")).toBe("hdfc");
  });
});

describe("mentionsBank", () => {
  it("finds a bank the text names anywhere, whatever else it names", () => {
    const text = "YES BANK statement. Pay by HDFC Bank NetBanking";
    expect(mentionsBank(text, "yes")).toBe(true);
    expect(mentionsBank(text, "hdfc")).toBe(true);
    expect(mentionsBank(text, "axis")).toBe(false);
  });

  it("ignores case, like detectBank", () => {
    expect(mentionsBank("statement from csb bank", "csb")).toBe(true);
  });
});
