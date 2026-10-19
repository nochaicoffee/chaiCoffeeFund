import { describe, expect, it } from "vitest";
import { toStatementFields } from "./toStatementFields";

describe("toStatementFields", () => {
  it("converts a complete parsed statement to typed fields", () => {
    const result = toStatementFields({
      bank: "hdfc",
      statementDate: "03 Jun, 2025",
      dueDate: "23 Jun 2025",
      totalAmountDue: "18,264.00",
      minimumAmountDue: "915.00",
    });
    expect(result).toEqual({
      statementDate: "2025-06-03",
      dueDate: "2025-06-23",
      totalAmountDue: 18264,
      minimumAmountDue: 915,
    });
  });

  it("returns null when the due date is a credit-balance sentinel rather than a date", () => {
    const result = toStatementFields({
      bank: "hdfc",
      statementDate: "03 Jun, 2025",
      dueDate: "N/A (Credit Balance)",
      totalAmountDue: "-3871.25",
      minimumAmountDue: "0.00",
    });
    expect(result).toBeNull();
  });

  it("returns null when any field is missing", () => {
    const result = toStatementFields({
      bank: "sbi",
      statementDate: "10/02/2026",
      totalAmountDue: "500.00",
      minimumAmountDue: "50.00",
      // dueDate missing
    });
    expect(result).toBeNull();
  });

  // The Add statement form's rules (readStatementForm): no real statement breaks them,
  // so a parse that does read the wrong date or number (#56).
  const fields = { bank: "csb" as const, statementDate: "10/02/2026", dueDate: "02/03/2026", totalAmountDue: "1200.00", minimumAmountDue: "200.00" };

  it("returns null when the due date isn't after the statement date", () => {
    expect(toStatementFields({ ...fields, dueDate: "10 JAN 2026" })).toBeNull();
    expect(toStatementFields({ ...fields, dueDate: "10/02/2026" })).toBeNull();
  });

  it("returns null when the minimum due is more than the total", () => {
    expect(toStatementFields({ ...fields, minimumAmountDue: "1200.01" })).toBeNull();
    expect(toStatementFields({ ...fields, totalAmountDue: "-50.00", minimumAmountDue: "10.00" })).toBeNull();
  });

  it("accepts a minimum equal to the total, and a credit balance with a ₹0 minimum", () => {
    expect(toStatementFields({ ...fields, minimumAmountDue: "1200.00" })).toMatchObject({ totalAmountDue: 1200, minimumAmountDue: 1200 });
    expect(toStatementFields({ ...fields, totalAmountDue: "-50.00", minimumAmountDue: "0.00" })).toMatchObject({ totalAmountDue: -50, minimumAmountDue: 0 });
  });
});
