import { describe, expect, it } from "vitest";
import type { sheets_v4 } from "googleapis";
import type { ColumnExpectation } from "./rowReading";
import { columnLetter, compareSpreadsheet, compareTab, type TabExpectation } from "./tableStructure";

/** A cut-down Cards tab: one column of each kind. */
const expectedColumns: ColumnExpectation[] = [
  { name: "id", kind: "text" },
  { name: "issuer", kind: "dropdown", options: ["HDFC-Bank", "Axis-Bank", "Other"] },
  { name: "creditLimit", kind: "number" },
  { name: "openedOn", kind: "date" },
  { name: "last4", kind: "text" },
];
const cards: TabExpectation = { sheetName: "Cards", expectedColumns };

type Column = sheets_v4.Schema$TableColumnProperties;

function dropdown(columnIndex: number, columnName: string, options: string[]): Column {
  return {
    columnIndex,
    columnName,
    columnType: "DROPDOWN",
    dataValidationRule: { condition: { type: "ONE_OF_LIST", values: options.map((userEnteredValue) => ({ userEnteredValue })) } },
  };
}

/** The Cards Table as spreadsheets.get returns it. Like the real API, column A has no columnIndex. */
function matchingColumns(): Column[] {
  return [
    { columnName: "id", columnType: "TEXT" },
    dropdown(1, "issuer", ["HDFC-Bank", "Axis-Bank", "Other"]),
    { columnIndex: 2, columnName: "creditLimit", columnType: "CURRENCY" },
    { columnIndex: 3, columnName: "openedOn", columnType: "DATE" },
    { columnIndex: 4, columnName: "last4", columnType: "TEXT" },
  ];
}

function tab(columns: Column[], range: sheets_v4.Schema$GridRange = { sheetId: 7, endRowIndex: 1, endColumnIndex: columns.length }): sheets_v4.Schema$Sheet {
  return { properties: { sheetId: 7, title: "Cards" }, tables: [{ name: "Cards", range, columnProperties: columns }] };
}

/** Column positions, as the API numbers them, after an edit to the list. */
function renumbered(columns: Column[]): Column[] {
  return columns.map((column, index) => ({ ...column, columnIndex: index }));
}

describe("compareTab", () => {
  it("finds nothing when the Table matches the code", () => {
    expect(compareTab(cards, tab(matchingColumns()))).toEqual([]);
  });

  it("accepts DOUBLE as well as CURRENCY for a number", () => {
    const columns = matchingColumns();
    columns[2] = { ...columns[2], columnType: "DOUBLE" };
    expect(compareTab(cards, tab(columns))).toEqual([]);
  });

  it("orders the columns by their index, not by where they come in the list", () => {
    expect(compareTab(cards, tab([...matchingColumns()].reverse()))).toEqual([]);
  });

  it("reports a missing tab, a tab with no Table, and a tab with two", () => {
    expect(compareTab(cards, undefined)).toEqual(["there's no Cards tab in the Sheet"]);
    expect(compareTab(cards, { properties: { title: "Cards" } })).toEqual(["the Cards tab has no Table"]);
    const twoTables = tab(matchingColumns());
    twoTables.tables = [...twoTables.tables!, ...twoTables.tables!];
    expect(compareTab(cards, twoTables)).toEqual(["the Cards tab has 2 Tables, but the app reads it as one"]);
  });

  it("reports a Table that doesn't start at A1, since reads assume the header is row 1 and id is column A", () => {
    expect(compareTab(cards, tab(matchingColumns(), { startRowIndex: 2, startColumnIndex: 2, endColumnIndex: 7 }))).toEqual([
      "the Table starts at C3, but the app reads it from A1",
    ]);
    expect(compareTab(cards, tab(matchingColumns(), { startColumnIndex: 27 }))).toEqual(["the Table starts at AB1, but the app reads it from A1"]);
  });

  it("reports a column the Sheet doesn't have and one the code doesn't", () => {
    const columns = matchingColumns();
    columns[3] = { columnIndex: 3, columnName: "notes", columnType: "TEXT" };
    expect(compareTab(cards, tab(columns))).toEqual(["openedOn: in the code but not in the Sheet", "notes (column D): in the Sheet but not in the code"]);
  });

  it("says where an extra column is, since one before the code's columns shifts every later value", () => {
    const [id, ...rest] = matchingColumns();
    expect(compareTab(cards, tab(renumbered([id, { columnName: "notes", columnType: "TEXT" }, ...rest])))).toEqual([
      "notes (column B): in the Sheet but not in the code",
    ]);
  });

  it("reports a column with no header", () => {
    expect(compareTab(cards, tab([...matchingColumns(), { columnIndex: 5, columnType: "TEXT" }]))).toEqual(["(no header) (column F): in the Sheet but not in the code"]);
  });

  it("reports columns out of order once, as the stretch that differs", () => {
    const [id, issuer, creditLimit, openedOn, last4] = matchingColumns();
    expect(compareTab(cards, tab(renumbered([id, openedOn, creditLimit, issuer, last4])))).toEqual([
      "columns are out of order: the Sheet has openedOn, creditLimit, issuer where the code has issuer, creditLimit, openedOn",
    ]);
  });

  it("doesn't count the columns after a missing one as moved", () => {
    const [id, , creditLimit, openedOn, last4] = matchingColumns();
    expect(compareTab(cards, tab(renumbered([id, creditLimit, openedOn, last4])))).toEqual(["issuer: in the code but not in the Sheet"]);
  });

  it("reports a column of the wrong type, naming the types that would fit", () => {
    const columns = matchingColumns();
    columns[1] = { columnIndex: 1, columnName: "issuer", columnType: "TEXT" };
    columns[2] = { ...columns[2], columnType: "TEXT" };
    columns[3] = { ...columns[3], columnType: "DATE_TIME" };
    columns[4] = dropdown(4, "last4", ["1234"]);
    expect(compareTab(cards, tab(columns))).toEqual([
      "issuer: the Sheet column is TEXT, but the code expects DROPDOWN",
      "creditLimit: the Sheet column is TEXT, but the code expects DOUBLE or CURRENCY",
      "openedOn: the Sheet column is DATE_TIME, but the code expects DATE",
      "last4: the Sheet column is DROPDOWN, but the code expects TEXT",
    ]);
  });

  it("reports a column with no type, which the API sends with no columnType", () => {
    const columns = matchingColumns();
    delete columns[3].columnType;
    columns[4] = { ...columns[4], columnType: "COLUMN_TYPE_UNSPECIFIED" };
    expect(compareTab(cards, tab(columns))).toEqual([
      "openedOn: the Sheet column has no type, but the code expects DATE",
      "last4: the Sheet column has no type, but the code expects TEXT",
    ]);
  });

  it("reports dropdown values the Sheet is missing and values only the Sheet has", () => {
    const columns = matchingColumns();
    columns[1] = dropdown(1, "issuer", ["HDFC-Bank", "Option 1", "Option 2"]);
    expect(compareTab(cards, tab(columns))).toEqual([
      "issuer: the Sheet's dropdown is missing Axis-Bank, Other, so writing it fails",
      "issuer: the Sheet's dropdown has Option 1, Option 2, which the code doesn't accept, so a row with it is left out",
    ]);
  });

  it("compares dropdown values exactly, and ignores their order", () => {
    const columns = matchingColumns();
    columns[1] = dropdown(1, "issuer", ["Other", "axis-bank", "HDFC-Bank"]);
    expect(compareTab(cards, tab(columns))).toEqual([
      "issuer: the Sheet's dropdown is missing Axis-Bank, so writing it fails",
      "issuer: the Sheet's dropdown has axis-bank, which the code doesn't accept, so a row with it is left out",
    ]);
  });

  it("names a blank dropdown value as blank", () => {
    const columns = matchingColumns();
    columns[1] = dropdown(1, "issuer", ["HDFC-Bank", "Axis-Bank", "Other", ""]);
    expect(compareTab(cards, tab(columns))).toEqual([
      "issuer: the Sheet's dropdown has (blank), which the code doesn't accept, so a row with it is left out",
    ]);
  });

  it("reports a dropdown with no values as missing all of them", () => {
    const columns = matchingColumns();
    columns[1] = { columnIndex: 1, columnName: "issuer", columnType: "DROPDOWN" };
    expect(compareTab(cards, tab(columns))).toEqual(["issuer: the Sheet's dropdown is missing HDFC-Bank, Axis-Bank, Other, so writing it fails"]);
  });
});

describe("columnLetter", () => {
  it("names columns past Z the way Sheets does", () => {
    expect([0, 25, 26, 27, 51, 52, 701, 702].map(columnLetter)).toEqual(["A", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });
});

describe("compareSpreadsheet", () => {
  it("checks every repository's tab and lists the tabs no repository reads", () => {
    const accounts: TabExpectation = { sheetName: "Accounts", expectedColumns: [{ name: "id", kind: "text" }] };
    const sheets = [{ properties: { title: "Prices" } }, tab(matchingColumns())];
    expect(compareSpreadsheet([cards, accounts], sheets)).toEqual({
      tabs: [
        { tab: "Cards", problems: [] },
        { tab: "Accounts", problems: ["there's no Accounts tab in the Sheet"] },
      ],
      otherTabs: ["Prices"],
    });
  });
});
