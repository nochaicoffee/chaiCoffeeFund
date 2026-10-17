import { describe, expect, it } from "vitest";
import { findDuplicateStatement, normalizeKeywords, readCardForm, readMarkPaidForm, readStatementForm } from "./cardForms";

const TODAY = "2026-10-19";
const known = { cardIds: ["regalia", "amazon"], accountIds: ["savings"] };

const card = {
  name: "HDFC Bank Regalia Gold Credit Card",
  alias: "Regalia Gold",
  issuer: "HDFC-Bank",
  cardType: "Reward-Points",
  status: "Active",
  last4: "7042",
  creditLimit: "6,72,000",
  statementDay: "16",
  dueDayBuffer: "20",
  color: "Sapphire",
};

describe("readCardForm", () => {
  it("reads a complete card, with the limit as typed", () => {
    expect(readCardForm(card, known)).toEqual({
      ok: true,
      input: { ...card, creditLimit: 672000, statementDay: 16, dueDayBuffer: 20 },
    });
  });

  it("uses the card name when the short name is blank, and leaves last 4 out when it isn't known", () => {
    const result = readCardForm({ ...card, alias: " ", last4: "" }, known);
    expect(result).toMatchObject({ ok: true, input: { alias: "HDFC Bank Regalia Gold Credit Card" } });
    expect(result.ok && "last4" in result.input).toBe(false);
  });

  it("keeps the PDF password exactly as typed, tidies the keywords and keeps the usual account", () => {
    const result = readCardForm({ ...card, statementPdfPassword: " 0101 1990", emailMatchKeywords: "Edge,  csb ,edge,", defaultPaidFromAccountId: "savings" }, known);
    expect(result).toMatchObject({ ok: true, input: { statementPdfPassword: " 0101 1990", emailMatchKeywords: "Edge, csb", defaultPaidFromAccountId: "savings" } });
  });

  it("leaves blank optional fields out", () => {
    const result = readCardForm({ ...card, statementPdfPassword: "  ", emailMatchKeywords: " , ", defaultPaidFromAccountId: "" }, known);
    expect(result.ok && Object.keys(result.input)).not.toEqual(expect.arrayContaining(["statementPdfPassword"]));
    expect(result.ok && "emailMatchKeywords" in result.input).toBe(false);
    expect(result.ok && "defaultPaidFromAccountId" in result.input).toBe(false);
  });

  it("says what's missing, field by field, in the design's words", () => {
    expect(readCardForm({}, known)).toEqual({
      ok: false,
      errors: {
        name: "Enter the card name",
        issuer: "Choose the bank that issued the card",
        cardType: "Choose whether the card earns reward points or cashback",
        status: "Choose whether the card is active, inactive or closed",
        creditLimit: "Enter the credit limit",
        statementDay: "Choose the day of the month the statement is generated",
        dueDayBuffer: "Enter the days from statement to due date (1–60)",
        color: "Pick a colour",
      },
    });
  });

  it("explains a wrong value", () => {
    const result = readCardForm({ ...card, last4: "742", creditLimit: "1.2L", issuer: "HDFC Bank", statementDay: "32", dueDayBuffer: "0", defaultPaidFromAccountId: "gone" }, known);
    expect(result).toEqual({
      ok: false,
      errors: {
        last4: "Enter the last 4 digits of the card number",
        creditLimit: "Enter the credit limit as an amount, like 38,500",
        issuer: "Choose the bank that issued the card",
        statementDay: "Choose the day of the month the statement is generated",
        dueDayBuffer: "Enter the days from statement to due date (1–60)",
        defaultPaidFromAccountId: "Choose one of your accounts",
      },
    });
  });

  it("refuses a negative limit and a fractional day", () => {
    expect(readCardForm({ ...card, creditLimit: "-5000", statementDay: "15.5" }, known)).toEqual({
      ok: false,
      errors: { creditLimit: "The credit limit can't be negative", statementDay: "Choose the day of the month the statement is generated" },
    });
  });
});

const statement = { cardId: "regalia", statementDate: "2026-09-16", dueDate: "2026-10-06", totalAmountDue: "41,200", minimumAmountDue: "4,120" };

describe("readStatementForm", () => {
  it("reads a statement", () => {
    expect(readStatementForm(statement, known)).toEqual({
      ok: true,
      input: { cardId: "regalia", statementDate: "2026-09-16", dueDate: "2026-10-06", totalAmountDue: 41200, minimumAmountDue: 4120 },
    });
  });

  it("accepts a credit balance (a negative total) with a ₹0 minimum", () => {
    expect(readStatementForm({ ...statement, totalAmountDue: "-1,250.50", minimumAmountDue: "0" }, known)).toMatchObject({ ok: true, input: { totalAmountDue: -1250.5, minimumAmountDue: 0 } });
    expect(readStatementForm({ ...statement, totalAmountDue: "−₹1,250", minimumAmountDue: "0" }, known)).toMatchObject({ ok: true, input: { totalAmountDue: -1250 } });
  });

  it("keeps the minimum due within the total due", () => {
    expect(readStatementForm({ ...statement, totalAmountDue: "9,800", minimumAmountDue: "12,000" }, known)).toEqual({ ok: false, errors: { minimumAmountDue: "Minimum due can't be more than the total due" } });
    expect(readStatementForm({ ...statement, totalAmountDue: "-500", minimumAmountDue: "100" }, known)).toEqual({ ok: false, errors: { minimumAmountDue: "With a credit balance, the minimum due is ₹0" } });
  });

  it("needs a card that exists, and a due date after the statement date", () => {
    expect(readStatementForm({ ...statement, cardId: "gone", dueDate: "2026-09-10" }, known)).toEqual({
      ok: false,
      errors: { cardId: "Choose a card", dueDate: "The due date should be after the statement date" },
    });
  });

  it("says what's missing", () => {
    expect(readStatementForm({}, known)).toEqual({
      ok: false,
      errors: {
        cardId: "Choose a card",
        statementDate: "Choose a statement date",
        dueDate: "Choose a due date",
        totalAmountDue: "Enter the total due",
        minimumAmountDue: "Enter the minimum due",
      },
    });
  });
});

describe("readMarkPaidForm", () => {
  const pending = { cardId: "regalia", statementDate: "2026-09-16" };

  it("reads the amount, date and where it was paid from: an account or another card", () => {
    expect(readMarkPaidForm({ amountPaid: "41,200", paidDate: "2026-10-01", paidFrom: "account:savings" }, pending, known, TODAY)).toEqual({
      ok: true,
      input: { amountPaid: 41200, paidDate: "2026-10-01", paidFromAccountId: "savings" },
    });
    expect(readMarkPaidForm({ amountPaid: "41200", paidDate: "2026-10-01", paidFrom: "card:amazon" }, pending, known, TODAY)).toEqual({
      ok: true,
      input: { amountPaid: 41200, paidDate: "2026-10-01", paidFromCardId: "amazon" },
    });
  });

  it("leaves paid from out when it isn't recorded", () => {
    expect(readMarkPaidForm({ amountPaid: "41200", paidDate: "2026-10-01", paidFrom: "" }, pending, known, TODAY)).toEqual({ ok: true, input: { amountPaid: 41200, paidDate: "2026-10-01" } });
  });

  it("needs the date, between the statement date and today", () => {
    expect(readMarkPaidForm({ amountPaid: "41200", paidDate: "" }, pending, known, TODAY)).toEqual({ ok: false, errors: { paidDate: "Choose the date you paid" } });
    expect(readMarkPaidForm({ amountPaid: "41200", paidDate: "2026-09-01" }, pending, known, TODAY)).toEqual({ ok: false, errors: { paidDate: "The payment date can't be before the statement date" } });
    expect(readMarkPaidForm({ amountPaid: "41200", paidDate: "2026-10-20" }, pending, known, TODAY)).toEqual({ ok: false, errors: { paidDate: "The payment date can't be in the future" } });
  });

  it("refuses a missing or negative amount, an unknown account, and a card paying its own bill", () => {
    expect(readMarkPaidForm({ amountPaid: "", paidDate: "2026-10-01" }, pending, known, TODAY)).toEqual({ ok: false, errors: { amountPaid: "Enter the amount you paid" } });
    expect(readMarkPaidForm({ amountPaid: "-1", paidDate: "2026-10-01", paidFrom: "account:gone" }, pending, known, TODAY)).toEqual({
      ok: false,
      errors: { amountPaid: "The amount paid can't be negative", paidFrom: "Choose the account or card it was paid from" },
    });
    expect(readMarkPaidForm({ amountPaid: "1", paidDate: "2026-10-01", paidFrom: "card:regalia" }, pending, known, TODAY)).toEqual({
      ok: false,
      errors: { paidFrom: "A card can't pay its own bill: choose the account or card it was paid from" },
    });
  });
});

describe("normalizeKeywords", () => {
  it("is undefined when nothing's left", () => {
    expect(normalizeKeywords(" , ,")).toBeUndefined();
    expect(normalizeKeywords("Klick, YES BANK")).toBe("Klick, YES BANK");
  });
});

describe("findDuplicateStatement", () => {
  it("finds a statement for the same card and statement date", () => {
    const existing = [{ id: "s1", cardId: "regalia", statementDate: "2026-07-16" }];
    expect(findDuplicateStatement(existing, "regalia", "2026-07-16")?.id).toBe("s1");
    expect(findDuplicateStatement(existing, "amazon", "2026-07-16")).toBeUndefined();
    expect(findDuplicateStatement(existing, "regalia", "2026-08-16")).toBeUndefined();
  });
});
