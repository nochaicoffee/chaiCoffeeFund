import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { assertColumnsMatchSchema, columnKinds, readRow, reportInvalidRow, serialToIsoDate } from "./rowReading";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";

/** A cut-down statement row, with the same kinds of rules the real schemas use. */
interface Row {
  id: string;
  cardId: string;
  statementDate: string;
  totalAmountDue: number;
  status: "Pending" | "Paid";
  amountPaid?: number;
  paidDate?: string;
  last4?: string;
}
const schema = z.object({
  id: nonEmptyString,
  cardId: nonEmptyString,
  statementDate: isoDate,
  totalAmountDue: z.number(),
  status: z.enum(["Pending", "Paid"]),
  amountPaid: nonNegativeNumber.optional(),
  paidDate: isoDate.optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
});
const columns: (keyof Row)[] = ["id", "cardId", "statementDate", "totalAmountDue", "status", "amountPaid", "paidDate", "last4"];
const dateColumns = new Set<keyof Row>(["statementDate", "paidDate"]);
const kinds = columnKinds(schema);
const read = (row: unknown[]) => readRow<Row>(row, columns, dateColumns, schema, kinds);

/** 46239 is 2026-08-05 as a Sheets date serial. */
const AUG_5 = 46239;

describe("readRow", () => {
  it("reads a valid row, turning a date serial into an ISO date and leaving blank optional cells out", () => {
    expect(read(["s1", "card", AUG_5, 38500, "Pending", "", "", ""])).toEqual({
      kind: "valid",
      record: { id: "s1", cardId: "card", statementDate: "2026-08-05", totalAmountDue: 38500, status: "Pending" },
    });
  });

  it("accepts a date typed as ISO text", () => {
    expect(read(["s1", "card", "2026-08-05", 38500, "Paid", 38500, "2026-08-20"])).toMatchObject({
      kind: "valid",
      record: { statementDate: "2026-08-05", paidDate: "2026-08-20" },
    });
  });

  it("leaves out a row with a blank required number, saying which field", () => {
    expect(read(["s1", "card", AUG_5, "", "Pending"])).toMatchObject({
      kind: "invalid",
      problems: [{ field: "totalAmountDue", message: "is blank" }],
    });
  });

  it("reads a number stored as text as a number, with or without ₹ and commas", () => {
    expect(read(["s1", "card", AUG_5, "38500", "Pending"])).toMatchObject({ kind: "valid", record: { totalAmountDue: 38500 } });
    expect(read(["s1", "card", AUG_5, " ₹38,500.50 ", "Pending"])).toMatchObject({ kind: "valid", record: { totalAmountDue: 38500.5 } });
    expect(read(["s1", "card", AUG_5, "-500", "Pending"])).toMatchObject({ kind: "valid", record: { totalAmountDue: -500 } });
    expect(read(["s1", "card", AUG_5, "−₹6,400", "Pending"])).toMatchObject({ kind: "valid", record: { totalAmountDue: -6400 } });
  });

  it("leaves out text that isn't a number in a number column", () => {
    expect(read(["s1", "card", AUG_5, "38.5k", "Pending"])).toMatchObject({ kind: "invalid", problems: [{ field: "totalAmountDue" }] });
    expect(read(["s1", "card", AUG_5, "0x10", "Pending"])).toMatchObject({ kind: "invalid", problems: [{ field: "totalAmountDue" }] });
  });

  it("checks an optional number's own rule when it's filled in", () => {
    expect(read(["s1", "card", AUG_5, 38500, "Paid", -1])).toMatchObject({ kind: "invalid", problems: [{ field: "amountPaid" }] });
  });

  it("leaves out a row with a blank or unreadable date", () => {
    expect(read(["s1", "card", "", 38500, "Pending"])).toMatchObject({ kind: "invalid", problems: [{ field: "statementDate", message: "is blank" }] });
    expect(read(["s1", "card", "5 Aug 2026", 38500, "Pending"])).toMatchObject({ kind: "invalid", problems: [{ field: "statementDate" }] });
    expect(read(["s1", "card", AUG_5, 38500, "Paid", 38500, "Aug 20"])).toMatchObject({ kind: "invalid", problems: [{ field: "paidDate" }] });
  });

  it("leaves out a row with an unknown dropdown value", () => {
    expect(read(["s1", "card", AUG_5, 38500, "Unpaid"])).toMatchObject({ kind: "invalid", problems: [{ field: "status" }] });
    expect(read(["s1", "card", AUG_5, 38500, "paid"])).toMatchObject({ kind: "invalid", problems: [{ field: "status" }] });
  });

  it("reads a number in a text column as text, so a lost leading zero still fails its rule", () => {
    expect(read([1, "card", AUG_5, 38500, "Pending"])).toMatchObject({ kind: "valid", record: { id: "1" } });
    expect(read(["s1", "card", AUG_5, 38500, "Pending", "", "", 7042])).toMatchObject({ kind: "valid", record: { last4: "7042" } });
    expect(read(["s1", "card", AUG_5, 38500, "Pending", "", "", 425])).toMatchObject({ kind: "invalid", problems: [{ field: "last4" }] });
  });

  it("reports a row with data but no id", () => {
    expect(read(["", "card", AUG_5, 38500, "Pending"])).toMatchObject({ kind: "invalid", problems: [{ field: "id", message: "is blank" }] });
  });

  it("lists every failing field, and keeps the cleaned cells for code that must still see the row", () => {
    const result = read(["s1", "card", "", "", "Unpaid"]);
    expect(result.kind).toBe("invalid");
    if (result.kind !== "invalid") return;
    expect(result.problems.map((p) => p.field).sort()).toEqual(["statementDate", "status", "totalAmountDue"]);
    expect(result.values).toEqual({ id: "s1", cardId: "card", status: "Unpaid" });
  });

  it("skips a row whose cells are all blank, without reporting it", () => {
    expect(read([])).toEqual({ kind: "blank" });
    expect(read(["", " ", ""])).toEqual({ kind: "blank" });
  });

  it("reports a refinement on the field it names", () => {
    const refined = schema.refine((r) => r.status !== "Paid" || r.amountPaid !== undefined, { message: "a paid statement needs its amount", path: ["amountPaid"] });
    expect(readRow<Row>(["s1", "card", AUG_5, 38500, "Paid"], columns, dateColumns, refined, columnKinds(refined))).toMatchObject({
      kind: "invalid",
      problems: [{ field: "amountPaid", message: "is blank" }],
    });
  });
});

describe("columnKinds", () => {
  it("reads each column's kind from the schema, through optional", () => {
    expect(kinds).toEqual({
      id: "text",
      cardId: "text",
      statementDate: "text",
      totalAmountDue: "number",
      status: "text",
      amountPaid: "number",
      paidDate: "text",
      last4: "text",
    });
  });

  it("needs an object schema", () => {
    expect(() => columnKinds(z.string())).toThrow();
  });
});

describe("serialToIsoDate", () => {
  it("counts days from the Sheets epoch", () => {
    expect(serialToIsoDate(AUG_5)).toBe("2026-08-05");
    expect(serialToIsoDate(1)).toBe("1899-12-31");
  });

  it("keeps the day when the cell also has a time, even late in the evening", () => {
    expect(serialToIsoDate(AUG_5 + 0.75)).toBe("2026-08-05");
    expect(serialToIsoDate(AUG_5 + 0.999)).toBe("2026-08-05");
  });
});

describe("assertColumnsMatchSchema", () => {
  it("accepts columns that match the schema exactly", () => {
    expect(() => assertColumnsMatchSchema("Tab", columns as string[], [...dateColumns] as string[], schema)).not.toThrow();
  });

  it("names a schema field with no column, and a column the schema doesn't know", () => {
    expect(() => assertColumnsMatchSchema("Tab", ["id", "cardId", "statementDate", "totalAmountDue", "status", "amountPaid", "paidDate", "extra"], ["statementDate", "paidDate"], schema)).toThrow(
      "Tab: the columns don't match the row schema: last4 is in the schema but has no column; column extra isn't in the schema",
    );
  });

  it("names a date field that isn't a date column, and the reverse", () => {
    expect(() => assertColumnsMatchSchema("Tab", columns as string[], ["statementDate", "cardId"], schema)).toThrow(
      "paidDate is a date but not a date column; date column cardId isn't an isoDate in the schema",
    );
  });
});

describe("reportInvalidRow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs the tab, row number, id and failing fields once, never the cell values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const problems = [{ field: "totalAmountDue", message: "is blank" }];
    reportInvalidRow("CardStatements", 7, "s-report", problems);
    reportInvalidRow("CardStatements", 7, "s-report", problems);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[sheets] CardStatements row 7 (id s-report) was left out: totalAmountDue is blank");
  });

  it("logs again when the same row has a different problem", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reportInvalidRow("CardStatements", 8, undefined, [{ field: "status", message: "Invalid option" }]);
    reportInvalidRow("CardStatements", 8, undefined, [{ field: "status", message: "is blank" }]);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toBe("[sheets] CardStatements row 8 was left out: status Invalid option");
  });
});
