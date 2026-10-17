import { describe, expect, it } from "vitest";
import { fieldLabel, skippedRowsNotice } from "./skippedRows";

const text = (notice: ReturnType<typeof skippedRowsNotice>) => (notice ? `${notice.headline}: ${notice.detail}` : null);

describe("fieldLabel", () => {
  it("spells out a camelCase column header", () => {
    expect(fieldLabel("totalAmountDue")).toBe("total amount due");
    expect(fieldLabel("paidFromAccountId")).toBe("paid from account id");
    expect(fieldLabel("status")).toBe("status");
  });

  it("splits a number off the words around it", () => {
    expect(fieldLabel("last4")).toBe("last 4");
  });
});

describe("skippedRowsNotice", () => {
  it("says nothing when the tab skipped no rows", () => {
    expect(skippedRowsNotice({ tab: "CardStatements", rows: [] })).toBeNull();
  });

  it("names the tab, the row and the blank field", () => {
    const notice = skippedRowsNotice({ tab: "CardStatements", rows: [{ rowNumber: 7, problems: [{ field: "totalAmountDue", message: "is blank" }] }] });
    expect(notice).toEqual({
      headline: "1 row in CardStatements couldn't be read",
      detail: "row 7, total amount due is blank. Fix it in the Sheet, then refresh.",
    });
  });

  it("groups a row's blank fields, then the ones that break a rule", () => {
    const notice = skippedRowsNotice({
      tab: "CardStatements",
      rows: [
        {
          rowNumber: 7,
          problems: [
            { field: "totalAmountDue", message: "is blank" },
            { field: "status", message: 'Invalid option: expected one of "Pending"|"Paid"' },
            { field: "minimumAmountDue", message: "is blank" },
          ],
        },
      ],
    });
    expect(notice?.detail).toBe("row 7, total amount due and minimum amount due are blank, and status isn't valid. Fix it in the Sheet, then refresh.");
  });

  it("lists several rows in Sheet order", () => {
    const notice = skippedRowsNotice({
      tab: "Cards",
      rows: [
        { rowNumber: 9, problems: [{ field: "color", message: "Invalid option" }] },
        { rowNumber: 4, problems: [{ field: "creditLimit", message: "is blank" }] },
      ],
    });
    expect(text(notice)).toBe("2 rows in Cards couldn't be read: row 4, credit limit is blank; row 9, color isn't valid. Fix them in the Sheet, then refresh.");
  });

  it("says aren't for several invalid fields", () => {
    const notice = skippedRowsNotice({
      tab: "Cards",
      rows: [{ rowNumber: 3, problems: [{ field: "last4", message: "Enter the last 4 digits" }, { field: "status", message: "Invalid option" }, { field: "color", message: "Invalid option" }] }],
    });
    expect(notice?.detail).toBe("row 3, last 4, status and color aren't valid. Fix it in the Sheet, then refresh.");
  });

  it("names a field once, however many rules it breaks", () => {
    const notice = skippedRowsNotice({
      tab: "Cards",
      rows: [{ rowNumber: 3, problems: [{ field: "last4", message: "Too small" }, { field: "last4", message: "Enter the last 4 digits" }] }],
    });
    expect(notice?.detail).toBe("row 3, last 4 isn't valid. Fix it in the Sheet, then refresh.");
  });

  it("never repeats a rule's message, which could quote the cell", () => {
    const notice = skippedRowsNotice({
      tab: "Cards",
      rows: [{ rowNumber: 5, problems: [{ field: "statementPdfPassword", message: "hunter2 is too short" }] }],
    });
    expect(text(notice)).not.toContain("hunter2");
    expect(notice?.detail).toBe("row 5, statement pdf password isn't valid. Fix it in the Sheet, then refresh.");
  });

  it("describes a rule across several columns, which has no field", () => {
    const notice = skippedRowsNotice({ tab: "InvestmentTransactions", rows: [{ rowNumber: 12, problems: [{ field: "row", message: "Invalid input" }] }] });
    expect(notice?.detail).toBe("row 12, its cells don't fit together. Fix it in the Sheet, then refresh.");
  });

  it("names the first five rows and counts the rest", () => {
    const rows = [2, 3, 4, 5, 6, 7, 8].map((rowNumber) => ({ rowNumber, problems: [{ field: "status", message: "Invalid option" }] }));
    const notice = skippedRowsNotice({ tab: "CardStatements", rows });
    expect(notice?.headline).toBe("7 rows in CardStatements couldn't be read");
    expect(notice?.detail).toBe(
      "row 2, status isn't valid; row 3, status isn't valid; row 4, status isn't valid; row 5, status isn't valid; row 6, status isn't valid; and 2 more rows. Fix them in the Sheet, then refresh.",
    );
  });

  it("says row, not rows, for one more", () => {
    const rows = [2, 3, 4, 5, 6, 7].map((rowNumber) => ({ rowNumber, problems: [{ field: "id", message: "is blank" }] }));
    expect(skippedRowsNotice({ tab: "Cards", rows })?.detail).toMatch(/; and 1 more row\. Fix them in the Sheet, then refresh\.$/);
  });
});
