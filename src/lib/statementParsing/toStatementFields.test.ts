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
      fields: {
        statementDate: "2025-06-03",
        dueDate: "2025-06-23",
        totalAmountDue: 18264,
        minimumAmountDue: 915,
      },
    });
  });

  it("says when the PDF itself has no due date, rather than that it couldn't be read", () => {
    const owed = { bank: "hdfc" as const, statementDate: "03 Jun, 2025", totalAmountDue: "-3871.25", minimumAmountDue: "0.00" };
    expect(toStatementFields({ ...owed, noDueDate: "nothing owed" })).toEqual({ problem: "the PDF shows no due date, as nothing is owed on it" });
    expect(toStatementFields({ ...owed, totalAmountDue: "1200.00", noDueDate: "due immediately" })).toEqual({
      problem: "the PDF shows no due date: it says the bill is due immediately",
    });
  });

  it("names a field it couldn't read before saying there's no due date", () => {
    expect(toStatementFields({ bank: "hdfc", statementDate: "03 Jun, 2025", minimumAmountDue: "0.00", noDueDate: "nothing owed" })).toEqual({
      problem: "couldn't read the total amount due from the PDF",
    });
  });

  it("names every field it couldn't read", () => {
    expect(toStatementFields({ bank: "sbi", statementDate: "10/02/2026", totalAmountDue: "500.00", minimumAmountDue: "50.00" })).toEqual({
      problem: "couldn't read the due date from the PDF",
    });
    expect(toStatementFields({ bank: "icici", statementDate: "10/02/2026", dueDate: "28/02/2026", totalAmountDue: "Nil" })).toEqual({
      problem: "couldn't read the total amount due and minimum amount due from the PDF",
    });
  });

  // The Add statement form's rules (readStatementForm): no real statement breaks them,
  // so a parse that does read the wrong date or number (#56).
  const fields = { bank: "csb" as const, statementDate: "10/02/2026", dueDate: "02/03/2026", totalAmountDue: "1200.00", minimumAmountDue: "200.00" };

  it("refuses a due date that isn't after the statement date", () => {
    const problem = "the due date read from the PDF isn't after its statement date, so one of them was misread";
    expect(toStatementFields({ ...fields, dueDate: "10 JAN 2026" })).toEqual({ problem });
    expect(toStatementFields({ ...fields, dueDate: "10/02/2026" })).toEqual({ problem });
  });

  it("refuses a minimum due above the total", () => {
    const problem = "the minimum amount due read from the PDF is more than its total amount due, so one of them was misread";
    expect(toStatementFields({ ...fields, minimumAmountDue: "1200.01" })).toEqual({ problem });
    expect(toStatementFields({ ...fields, totalAmountDue: "-50.00", minimumAmountDue: "10.00" })).toEqual({ problem });
  });

  it("accepts a minimum equal to the total, and a credit balance with a ₹0 minimum", () => {
    expect(toStatementFields({ ...fields, minimumAmountDue: "1200.00" })).toMatchObject({ fields: { totalAmountDue: 1200, minimumAmountDue: 1200 } });
    expect(toStatementFields({ ...fields, totalAmountDue: "-50.00", minimumAmountDue: "0.00" })).toMatchObject({ fields: { totalAmountDue: -50, minimumAmountDue: 0 } });
  });

  it("never puts a value in its reason", () => {
    const results = [
      toStatementFields({ ...fields, dueDate: "10 JAN 2026" }),
      toStatementFields({ ...fields, minimumAmountDue: "1234.56" }),
      toStatementFields({ ...fields, totalAmountDue: "Rs. 9,876.54 extra" }),
    ];
    for (const result of results) {
      expect(result).toHaveProperty("problem");
      expect("problem" in result && result.problem).not.toMatch(/\d/);
    }
  });
});
