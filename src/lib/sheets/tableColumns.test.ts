import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { sheets_v4 } from "googleapis";
import { isoDate, nonEmptyString } from "./validation";
import { columnSpecs, planTableColumns } from "./tableColumns";

const schema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  amount: z.number(),
  status: z.enum(["Active", "Paused", "Cancelled"]),
  endDate: isoDate.optional(),
  note: nonEmptyString.optional(),
});
const specs = columnSpecs(["id", "name", "amount", "status", "endDate", "note"], schema);

const dropdown = (...values: string[]) => ({ condition: { type: "ONE_OF_LIST", values: values.map((userEnteredValue) => ({ userEnteredValue })) } });
const table = (columns: sheets_v4.Schema$TableColumnProperties[], range: sheets_v4.Schema$GridRange = { sheetId: 7, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columns.length }): sheets_v4.Schema$Table => ({
  tableId: "t1",
  range,
  columnProperties: columns,
});
const current = [
  { columnIndex: 0, columnName: "id", columnType: "TEXT" },
  { columnIndex: 1, columnName: "name", columnType: "TEXT" },
  { columnIndex: 2, columnName: "amount", columnType: "DOUBLE" },
  { columnIndex: 3, columnName: "status", columnType: "DROPDOWN", dataValidationRule: dropdown("Active", "Paused") },
];

describe("columnSpecs", () => {
  it("reads each column's type from the schema", () => {
    expect(specs).toEqual([
      { name: "id", type: "TEXT" },
      { name: "name", type: "TEXT" },
      { name: "amount", type: "DOUBLE" },
      { name: "status", type: "DROPDOWN", options: ["Active", "Paused", "Cancelled"] },
      { name: "endDate", type: "DATE" },
      { name: "note", type: "TEXT" },
    ]);
  });
});

describe("planTableColumns", () => {
  it("adds the missing columns on the end, typed, and widens the Table to hold them", () => {
    const plan = planTableColumns(specs, table(current));
    expect(plan.refused).toBeUndefined();
    expect(plan.changes).toEqual(["set status's dropdown to Active, Paused, Cancelled (was Active, Paused)", "add endDate (date)", "add note (text)"]);
    const update = plan.request?.updateTable;
    expect(update?.fields).toBe("range,columnProperties");
    expect(update?.table?.range).toEqual({ sheetId: 7, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 });
    expect(update?.table?.columnProperties?.slice(4)).toEqual([
      { columnIndex: 4, columnName: "endDate", columnType: "DATE" },
      { columnIndex: 5, columnName: "note", columnType: "TEXT" },
    ]);
  });

  it("keeps the existing columns as they are, apart from a dropdown's values", () => {
    const columns = planTableColumns(specs, table(current)).request?.updateTable?.table?.columnProperties ?? [];
    expect(columns.slice(0, 3)).toEqual(current.slice(0, 3));
    expect(columns[3]).toEqual({ ...current[3], dataValidationRule: dropdown("Active", "Paused", "Cancelled") });
  });

  it("does nothing when the Table already matches", () => {
    const done = [...current.slice(0, 3), { ...current[3], dataValidationRule: dropdown("Active", "Paused", "Cancelled") }, { columnIndex: 4, columnName: "endDate", columnType: "DATE" }, { columnIndex: 5, columnName: "note", columnType: "TEXT" }];
    expect(planTableColumns(specs, table(done))).toEqual({ changes: [] });
  });

  it("refuses when an existing column doesn't match the code's order, so nothing lands in the wrong column", () => {
    const swapped = [current[1], current[0], ...current.slice(2)];
    const plan = planTableColumns(specs, table(swapped));
    expect(plan.refused).toBe('column 1 is "name" in the Sheet but "id" in the code');
    expect(plan.request).toBeUndefined();
  });

  it("refuses a Table that doesn't start at A1", () => {
    const plan = planTableColumns(specs, table(current, { sheetId: 7, startRowIndex: 2, startColumnIndex: 0, endColumnIndex: 4 }));
    expect(plan.refused).toBe("the Table doesn't start at A1");
  });

  it("sends only the columns for a dropdown change, never the range, so a row appended since the read isn't dropped", () => {
    const done = [...current.slice(0, 3), current[3], { columnIndex: 4, columnName: "endDate", columnType: "DATE" }, { columnIndex: 5, columnName: "note", columnType: "TEXT" }];
    const update = planTableColumns(specs, table(done)).request?.updateTable;
    expect(update?.fields).toBe("columnProperties");
    expect(update?.table).toEqual({ tableId: "t1", columnProperties: expect.any(Array) });
  });

  it("adds a new dropdown column with exactly the schema's values", () => {
    const withCycle = z.object({ id: nonEmptyString, cycle: z.enum(["Monthly", "Quarterly", "Yearly"]) });
    const plan = planTableColumns(columnSpecs(["id", "cycle"], withCycle), table([current[0]]));
    expect(plan.changes).toEqual(["add cycle (dropdown: Monthly, Quarterly, Yearly)"]);
    expect(plan.request?.updateTable?.table?.columnProperties?.[1]).toEqual({ columnIndex: 1, columnName: "cycle", columnType: "DROPDOWN", dataValidationRule: dropdown("Monthly", "Quarterly", "Yearly") });
  });

  it("refuses a Table with more columns than the code", () => {
    const extra = [...current, { columnIndex: 4, columnName: "endDate", columnType: "DATE" }, { columnIndex: 5, columnName: "note", columnType: "TEXT" }, { columnIndex: 6, columnName: "colour", columnType: "TEXT" }];
    expect(planTableColumns(specs, table(extra)).refused).toBe('column 7 is "colour" in the Sheet but "nothing" in the code');
  });

  it("sets a dropdown on a column that was plain text", () => {
    const asText = [...current.slice(0, 3), { columnIndex: 3, columnName: "status", columnType: "TEXT" }];
    expect(planTableColumns(specs, table(asText)).changes[0]).toBe("set status's dropdown to Active, Paused, Cancelled");
  });
});
