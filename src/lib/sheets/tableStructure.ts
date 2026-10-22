import type { sheets_v4 } from "googleapis";
import type { ColumnExpectation } from "./rowReading";

/**
 * Comparing the real Sheet's structure with what the repositories expect (see
 * "Verifying the Sheet" in docs/system-design.md). The real Sheet is ground
 * truth, but nothing else checks it: a dropdown missing a value the code can
 * write, or a renamed or moved column, only shows up when a write fails at the
 * Sheet or a read puts values in the wrong fields. Pure, so it's tested
 * against fixture metadata; checkSheet.ts fetches the real one.
 */

/** A repository as the check sees it: its tab, and what it expects of each column in order. */
export interface TabExpectation {
  sheetName: string;
  expectedColumns: ColumnExpectation[];
}

/** One tab's result. No problems means the tab matches the code. */
export interface TabCheck {
  tab: string;
  problems: string[];
}

/** The Table column types each kind of field may be stored in. */
const SHEET_COLUMN_TYPES: Record<ColumnExpectation["kind"], string[]> = {
  text: ["TEXT"],
  number: ["DOUBLE", "CURRENCY"],
  date: ["DATE"],
  dropdown: ["DROPDOWN"],
};

/** A 0-based column index as its letter: 0 → A, 26 → AA. */
export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

function listed(values: readonly string[]): string {
  return values.map((value) => value || "(blank)").join(", ");
}

/** Problems with one column that's in both the code and the Sheet: its type, and a dropdown's values. */
function columnProblems(expected: ColumnExpectation, actual: sheets_v4.Schema$TableColumnProperties): string[] {
  const allowed = SHEET_COLUMN_TYPES[expected.kind];
  const type = actual.columnType && actual.columnType !== "COLUMN_TYPE_UNSPECIFIED" ? actual.columnType : null;
  if (!type || !allowed.includes(type)) {
    const found = type ? `is ${type}` : "has no type";
    return [`${expected.name}: the Sheet column ${found}, but the code expects ${allowed.join(" or ")}`];
  }
  if (expected.kind !== "dropdown") return [];

  // userEnteredValue is the option's literal text, which is what a write must match.
  const sheetOptions = (actual.dataValidationRule?.condition?.values ?? []).map((value) => value.userEnteredValue ?? "");
  const notInSheet = expected.options.filter((option) => !sheetOptions.includes(option));
  const notInCode = sheetOptions.filter((option) => !expected.options.includes(option));
  return [
    ...(notInSheet.length > 0 ? [`${expected.name}: the Sheet's dropdown is missing ${listed(notInSheet)}, so writing it fails`] : []),
    ...(notInCode.length > 0 ? [`${expected.name}: the Sheet's dropdown has ${listed(notInCode)}, which the code doesn't accept, so a row with it is left out`] : []),
  ];
}

/**
 * Every way one tab of the real Sheet differs from what its repository expects:
 * a missing tab or Table, a Table that doesn't start at A1 (reads assume it),
 * columns missing, extra or out of order, a column of the wrong type, and a
 * dropdown with values added or removed. Column headers must match the field
 * names exactly.
 */
export function compareTab(expected: TabExpectation, sheet: sheets_v4.Schema$Sheet | undefined): string[] {
  const { sheetName, expectedColumns } = expected;
  if (!sheet) return [`there's no ${sheetName} tab in the Sheet`];
  const tables = sheet.tables ?? [];
  if (tables.length === 0) return [`the ${sheetName} tab has no Table`];
  if (tables.length > 1) return [`the ${sheetName} tab has ${tables.length} Tables, but the app reads it as one`];

  const [table] = tables;
  const problems: string[] = [];
  // The API leaves out fields at their default, so a Table at A1 has no start indexes and column A no columnIndex.
  const startRow = table.range?.startRowIndex ?? 0;
  const startColumn = table.range?.startColumnIndex ?? 0;
  if (startRow !== 0 || startColumn !== 0) {
    problems.push(`the Table starts at ${columnLetter(startColumn)}${startRow + 1}, but the app reads it from A1`);
  }

  const actualColumns = [...(table.columnProperties ?? [])].sort((a, b) => (a.columnIndex ?? 0) - (b.columnIndex ?? 0));
  const actualNames = actualColumns.map((column) => column.columnName ?? "");
  const expectedNames = expectedColumns.map((column) => column.name);
  problems.push(...expectedNames.filter((name) => !actualNames.includes(name)).map((name) => `${name}: in the code but not in the Sheet`));
  // With its column, since reads go by position: an extra column before the code's columns shifts every later value.
  for (const column of actualColumns) {
    const name = column.columnName ?? "";
    if (expectedNames.includes(name)) continue;
    problems.push(`${name || "(no header)"} (column ${columnLetter(startColumn + (column.columnIndex ?? 0))}): in the Sheet but not in the code`);
  }

  // Order among the columns both sides have, so one missing column isn't also reported as every later one moving.
  const sheetOrder = actualNames.filter((name) => expectedNames.includes(name));
  const codeOrder = expectedNames.filter((name) => actualNames.includes(name));
  const first = codeOrder.findIndex((name, index) => sheetOrder[index] !== name);
  if (first !== -1) {
    const last = codeOrder.findLastIndex((name, index) => sheetOrder[index] !== name);
    problems.push(`columns are out of order: the Sheet has ${listed(sheetOrder.slice(first, last + 1))} where the code has ${listed(codeOrder.slice(first, last + 1))}`);
  }

  for (const column of expectedColumns) {
    const actual = actualColumns.find((candidate) => candidate.columnName === column.name);
    if (actual) problems.push(...columnProblems(column, actual));
  }
  return problems;
}

/** Every repository's tab checked against the Sheet, plus the Sheet's tabs no repository reads (like Prices). */
export function compareSpreadsheet(expected: TabExpectation[], sheets: sheets_v4.Schema$Sheet[]): { tabs: TabCheck[]; otherTabs: string[] } {
  const byTitle = new Map(sheets.map((sheet) => [sheet.properties?.title ?? "", sheet]));
  const known = new Set(expected.map((tab) => tab.sheetName));
  return {
    tabs: expected.map((tab) => ({ tab: tab.sheetName, problems: compareTab(tab, byTitle.get(tab.sheetName)) })),
    otherTabs: [...byTitle.keys()].filter((title) => !known.has(title)),
  };
}
