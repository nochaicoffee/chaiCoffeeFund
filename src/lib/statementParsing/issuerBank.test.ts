import { describe, expect, it } from "vitest";
import { optionLabel } from "@/lib/format/labels";
import { CARD_ISSUERS } from "@/lib/sheets/types";
import { BANK_PARSERS } from "./bankParsers";
import { bankForIssuer, checkStatementBank } from "./issuerBank";

const issuersWithParsers = CARD_ISSUERS.filter((issuer) => bankForIssuer(issuer) !== null);

describe("bankForIssuer", () => {
  it("gives every parser exactly one issuer", () => {
    expect(issuersWithParsers.map(bankForIssuer).sort()).toEqual(Object.keys(BANK_PARSERS).sort());
  });

  // Ties the map to detectBank's keywords: a statement that names its issuer is read as that issuer's bank.
  it.each(issuersWithParsers)("reads a statement that names %s with that issuer's parser", (issuer) => {
    expect(checkStatementBank({ name: "The card", issuer }, `Statement from ${optionLabel(issuer)}`)).toEqual({ bank: bankForIssuer(issuer) });
  });

  it.each(["Other", "IDFC-FIRST-Bank", "HSBC"] as const)("has no parser for %s", (issuer) => {
    expect(bankForIssuer(issuer)).toBeNull();
  });
});

describe("checkStatementBank", () => {
  const elite = { name: "YES Bank Elite Credit Card", issuer: "YES-Bank" } as const;

  it("reads a card's statement with its issuer's parser", () => {
    expect(checkStatementBank(elite, "YES BANK Credit Card Statement")).toEqual({ bank: "yes" });
  });

  it("skips a statement whose PDF looks like another bank's", () => {
    expect(checkStatementBank(elite, "HDFC Bank Statement of Accounts")).toEqual({
      problem: "the PDF looks like it's from HDFC Bank and doesn't mention YES Bank, YES Bank Elite Credit Card's issuer, so it's probably another card's statement. If that's the wrong issuer, change it in the Cards tab",
    });
  });

  it("reads a statement of the card's bank that also names a bank detectBank would pick first", () => {
    const text = "YES BANK Credit Card Statement. Pay from any bank: HDFC Bank, ICICI Bank, Axis Bank";
    expect(checkStatementBank(elite, text)).toEqual({ bank: "yes" });
  });

  it("skips a statement whose PDF doesn't mention the card's bank", () => {
    expect(checkStatementBank(elite, "Some random statement text")).toEqual({
      problem: "the PDF doesn't mention YES Bank, YES Bank Elite Credit Card's issuer, so it's probably not its statement",
    });
  });

  it("skips a card whose issuer has no parser, Other included, even when the PDF names a bank the app reads", () => {
    expect(checkStatementBank({ name: "Store card", issuer: "Other" }, "Statement from CSB Bank / jupiter.money")).toEqual({
      problem: "the app can't read statements from Store card's issuer, Other. If that's the wrong issuer, change it in the Cards tab",
    });
    expect(checkStatementBank({ name: "Wealth", issuer: "IDFC-FIRST-Bank" }, "IDFC FIRST Bank statement")).toEqual({
      problem: "the app can't read statements from Wealth's issuer, IDFC FIRST Bank. If that's the wrong issuer, change it in the Cards tab",
    });
  });
});
