import { describe, expect, it } from "vitest";
import { checkCardLast4, findCardLast4s } from "./extractCardLast4";

describe("findCardLast4s", () => {
  it("reads a masked number in the common shapes", () => {
    expect(findCardLast4s("Card No. 4386 24XX XXXX 1234 Statement Date 16/10/2026")).toEqual(["1234"]);
    expect(findCardLast4s("Credit Card Number XXXX XXXX XXXX 5678")).toEqual(["5678"]);
    expect(findCardLast4s("Card Number: XXXXXXXXXXXX9012 Name")).toEqual(["9012"]);
    expect(findCardLast4s("**** **** **** 3456 Total Amount Due")).toEqual(["3456"]);
    expect(findCardLast4s("5241-81XX-XXXX-4417")).toEqual(["4417"]);
    expect(findCardLast4s("xxxx xxxx xxxx 0425")).toEqual(["0425"]);
  });

  it("reads Amex's 15-digit layout", () => {
    expect(findCardLast4s("Card Member XXXX XXXXXX X1004 Closing Date")).toEqual(["1004"]);
  });

  it("copes with pdf.js splitting the number into odd groups", () => {
    expect(findCardLast4s("Card No 43 86 24XX XX XX 12 34 Due")).toEqual(["1234"]);
    expect(findCardLast4s("Card No 4386 24 XX XXXX 1234 Due")).toEqual(["1234"]);
    expect(findCardLast4s("Card No 4386 24XX XXXX1234 Due")).toEqual(["1234"]);
  });

  it("reads 'card ending 1234' wording", () => {
    expect(findCardLast4s("your Credit Card ending 7042 has been generated")).toEqual(["7042"]);
    expect(findCardLast4s("Card ending in 3189.")).toEqual(["3189"]);
    expect(findCardLast4s("Card No. ending with XX1220")).toEqual(["1220"]);
    expect(findCardLast4s("card number ending in 0425")).toEqual(["0425"]);
  });

  it("doesn't take a year or date after 'ending' for a last 4", () => {
    expect(findCardLast4s("Statement for the period ending 2026-10-12")).toEqual([]);
    expect(findCardLast4s("Rewards for the year ending 2026. Your card statement")).toEqual([]);
    expect(findCardLast4s("Your card statement for the period ending 2026-10-12")).toEqual([]);
  });

  it("ignores numbers that only look like card numbers", () => {
    // Unmasked: a reference or account number.
    expect(findCardLast4s("Reference 4386 2412 3456 7890")).toEqual([]);
    // A masked savings account (12 characters), a phone number and amounts.
    expect(findCardLast4s("Autopay from XXXXXXXX5678. Call 1800 266 4332. Total ₹38,500.00, Min 3,850.00")).toEqual([]);
    // Too few masked characters.
    expect(findCardLast4s("4386 2412 34X5 6789")).toEqual([]);
  });

  it("lists every different number once, for a statement with an add-on card", () => {
    expect(findCardLast4s("Primary 4386 XXXX XXXX 1234 ... Add-on 4386 XXXX XXXX 9999 ... 4386 XXXX XXXX 1234")).toEqual(["1234", "9999"]);
  });

  it("stops at the card number when other numbers follow it", () => {
    expect(findCardLast4s("XXXX XXXX XXXX 1234 25 Oct 2026")).toEqual(["1234"]);
  });
});

describe("checkCardLast4", () => {
  it("fills a missing last 4 when the statement shows exactly one", () => {
    expect(checkCardLast4({}, ["1234"])).toEqual({ kind: "fill", last4: "1234" });
  });

  it("doesn't guess between two numbers for a card with no last 4", () => {
    expect(checkCardLast4({}, ["1234", "9999"])).toEqual({ kind: "ok" });
  });

  it("accepts a statement that shows the card's last 4, even beside an add-on's", () => {
    expect(checkCardLast4({ last4: "1234" }, ["1234"])).toEqual({ kind: "ok" });
    expect(checkCardLast4({ last4: "1234" }, ["9999", "1234"])).toEqual({ kind: "ok" });
  });

  it("flags a statement that shows only other numbers", () => {
    expect(checkCardLast4({ last4: "1234" }, ["5678"])).toEqual({ kind: "mismatch", found: ["5678"] });
  });

  it("has nothing to say when the statement shows no number", () => {
    expect(checkCardLast4({ last4: "1234" }, [])).toEqual({ kind: "ok" });
    expect(checkCardLast4({}, [])).toEqual({ kind: "ok" });
  });
});
