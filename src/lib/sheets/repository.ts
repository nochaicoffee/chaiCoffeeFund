import "server-only";
import { randomUUID } from "crypto";
import type { z } from "zod";
import { toUserEnteredCell } from "./cellValues";
import { getSheetsClient, getSpreadsheetId } from "./client";
import { assertColumnsMatchSchema, columnExpectations, columnKinds, readRow, reportInvalidRow, type RowProblem, type SkippedRow } from "./rowReading";
import { columnLetter } from "./tableStructure";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** A write that would leave a row breaking its entity's `check`. Nothing was written. */
export class InvalidRowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRowError";
  }
}

export interface RepositoryConfig<T extends { id: string }> {
  sheetName: string;
  columns: (keyof T)[];
  /** Columns whose value is a plain ISO date string (e.g. "2026-08-01"). */
  dateColumns?: (keyof T)[];
  /** What a valid row looks like, id included. Every row read is checked against it (see rowReading.ts). */
  schema: z.ZodType<T>;
  /**
   * A rule across fields that a whole row must keep, such as "a card or an account, not
   * both", as a message when it's broken. A partial update can't check it from its own
   * fields, so it runs on the row after the update is merged over the stored one (and on
   * each new row). A broken rule writes nothing and throws InvalidRowError.
   */
  check?: (record: T) => string | null;
}

/** A row that failed its schema: left out of list() and get(), but still visible to readAll(). */
export interface InvalidRow<T> extends SkippedRow {
  /** Its cells by column, cleaned up the same way as a valid row's. */
  values: Partial<Record<keyof T, unknown>>;
}

/** What createRepository() returns for an entity. */
export type Repository<T extends { id: string }> = ReturnType<typeof createRepository<T>>;

function toRowValues<T>(record: T, columns: (keyof T)[], dateColumns: Set<keyof T>): unknown[] {
  return columns.map((col) => {
    return toUserEnteredCell(record[col], dateColumns.has(col));
  });
}

/**
 * A generic list/get/create/update/delete repository over one Sheets tab.
 * Assumes row 1 is the header and `id` is always the first column.
 *
 * Reads request UNFORMATTED_VALUE + SERIAL_NUMBER — otherwise the Sheets API
 * returns display-formatted strings (locale dates, currency symbols) instead
 * of the raw values our types expect. Each row is then cleaned up and checked
 * against the entity's schema (rowReading.ts): blank cells become undefined,
 * date serials become ISO strings, numbers typed as text become numbers, and
 * a row that still fails is logged and left out instead of reaching the pages.
 */
export function createRepository<T extends { id: string }>(config: RepositoryConfig<T>) {
  const { sheetName, columns, schema, check } = config;
  assertColumnsMatchSchema(sheetName, columns as string[], (config.dateColumns ?? []) as string[], schema);
  const expectedColumns = columnExpectations(sheetName, columns as string[], schema);
  const dateColumns = new Set(config.dateColumns ?? []);
  const kinds = columnKinds(schema);
  const lastCol = columnLetter(columns.length - 1);
  const dataRange = `${sheetName}!A2:${lastCol}`;

  // A tab's internal sheetId never changes for its lifetime (only deleting
  // and recreating the tab would change it) — safe to cache for the life of
  // the server process instead of re-fetching spreadsheet metadata on every
  // single remove() call.
  let cachedSheetId: number | null = null;

  async function resolveSheetId(): Promise<number> {
    if (cachedSheetId !== null) return cachedSheetId;
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName)?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) {
      throw new Error(`${sheetName}: sheet tab not found`);
    }
    cachedSheetId = sheetId;
    return sheetId;
  }

  async function fetchRows(): Promise<unknown[][]> {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: dataRange,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });
    return res.data.values ?? [];
  }

  /**
   * Every row: the valid records, and the rows that failed their schema (each one
   * logged). Use this instead of list() where skipping a bad row would do harm,
   * like a duplicate check or deleting a loan's installments.
   */
  async function readAll(): Promise<{ records: T[]; invalid: InvalidRow<T>[] }> {
    const rows = await fetchRows();
    const records: T[] = [];
    const invalid: InvalidRow<T>[] = [];
    rows.forEach((row, index) => {
      const result = readRow(row, columns, dateColumns, schema, kinds);
      if (result.kind === "valid") records.push(result.record);
      if (result.kind === "invalid") {
        // +2: skip the header row, and Sheets rows are 1-indexed.
        invalid.push({ rowNumber: index + 2, values: result.values, problems: result.problems });
        reportInvalidRow(sheetName, index + 2, result.values.id, result.problems);
      }
    });
    return { records, invalid };
  }

  /** The valid rows. Rows that fail the schema are left out and logged. */
  async function list(): Promise<T[]> {
    return (await readAll()).records;
  }

  /**
   * One read serving both "does it exist" and "which row" — avoids scanning the sheet twice.
   * Finds invalid rows too, so update() can repair one and remove() can delete one.
   */
  async function findRow(id: string) {
    return locateRow(await fetchRows(), id);
  }

  function locateRow(rows: unknown[][], id: string): { rowNumber: number; values: Partial<Record<keyof T, unknown>>; record: T | null; problems: RowProblem[] } | null {
    // String(): an id typed into the Sheet by hand can come back as a number.
    const index = rows.findIndex((row) => row[0] !== undefined && String(row[0]) === id);
    if (index === -1) return null;
    const rowNumber = index + 2;
    const result = readRow(rows[index], columns, dateColumns, schema, kinds);
    if (result.kind === "valid") return { rowNumber, values: result.record as Partial<Record<keyof T, unknown>>, record: result.record, problems: [] };
    return { rowNumber, values: result.kind === "invalid" ? result.values : {}, record: null, problems: result.kind === "invalid" ? result.problems : [] };
  }

  /** The record with this id, or null when there's none or its row fails the schema (logged). */
  async function get(id: string): Promise<T | null> {
    const found = await findRow(id);
    if (found && !found.record) reportInvalidRow(sheetName, found.rowNumber, id, found.problems);
    return found?.record ?? null;
  }

  function assertValid(record: T) {
    const problem = check?.(record);
    if (problem) throw new InvalidRowError(problem);
  }

  async function create(input: Omit<T, "id">): Promise<T> {
    const [record] = await createMany([input]);
    return record;
  }

  async function createMany(inputs: Omit<T, "id">[]): Promise<T[]> {
    if (inputs.length === 0) return [];
    const records = inputs.map((input) => ({ ...input, id: randomUUID() }) as T);
    records.forEach(assertValid);
    const sheets = getSheetsClient();
    // USER_ENTERED so ISO dates become real dates in the Table's DATE columns;
    // every other text value is marked literal (see cellValues.ts).
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: dataRange,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: records.map((record) => toRowValues(record, columns, dateColumns)) },
    });
    return records;
  }

  async function update(id: string, patch: Partial<Omit<T, "id">>): Promise<T> {
    const found = await findRow(id);
    if (!found) {
      throw new NotFoundError(`${sheetName}: no record found for id ${id}`);
    }
    // Starts from the cleaned cells, so an update also rewrites a number stored as text as a number.
    const updated = { ...found.values, ...patch } as T;
    assertValid(updated);
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A${found.rowNumber}:${lastCol}${found.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [toRowValues(updated, columns, dateColumns)] },
    });
    return updated;
  }

  /**
   * Several updates for one read and one write, where an update() each would
   * cost two requests per row against the Sheets quota (60 a minute), like the
   * statement sync's email log. Writes nothing if any id is missing.
   */
  async function updateMany(changes: { id: string; patch: Partial<Omit<T, "id">> }[]): Promise<T[]> {
    if (changes.length === 0) return [];
    const rows = await fetchRows();
    const found = changes.map(({ id, patch }) => {
      const row = locateRow(rows, id);
      if (!row) throw new NotFoundError(`${sheetName}: no record found for id ${id}`);
      return { rowNumber: row.rowNumber, updated: { ...row.values, ...patch } as T };
    });
    found.forEach(({ updated }) => assertValid(updated));
    await getSheetsClient().spreadsheets.values.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: found.map(({ rowNumber, updated }) => ({
          range: `${sheetName}!A${rowNumber}:${lastCol}${rowNumber}`,
          values: [toRowValues(updated, columns, dateColumns)],
        })),
      },
    });
    return found.map(({ updated }) => updated);
  }

  async function remove(id: string): Promise<void> {
    const found = await findRow(id);
    if (!found) return;

    const sheetId = await resolveSheetId();
    const sheets = getSheetsClient();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: found.rowNumber - 1,
                endIndex: found.rowNumber,
              },
            },
          },
        ],
      },
    });
  }

  /**
   * Deletes every row whose cells match, in one read and one write, where remove() for
   * each would cost two requests a row against the Sheets quota (60 a minute): deleting a
   * subscription's 32 payments one by one would run out. A row that fails validation
   * still counts, by its cleaned cells, so nothing that belongs is left behind. The rows go
   * bottom first, so deleting one doesn't move the next. Returns how many were deleted.
   */
  async function removeWhere(match: (values: Partial<Record<keyof T, unknown>>) => boolean): Promise<number> {
    const rows = await fetchRows();
    const rowNumbers: number[] = [];
    rows.forEach((row, index) => {
      const result = readRow(row, columns, dateColumns, schema, kinds);
      const values = result.kind === "valid" ? (result.record as Partial<Record<keyof T, unknown>>) : result.kind === "invalid" ? result.values : null;
      if (values && match(values)) rowNumbers.push(index + 2);
    });
    if (rowNumbers.length === 0) return 0;
    const sheetId = await resolveSheetId();
    await getSheetsClient().spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: rowNumbers
          .sort((a, b) => b - a)
          .map((rowNumber) => ({ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber } } })),
      },
    });
    return rowNumbers.length;
  }

  return { sheetName, expectedColumns, list, readAll, get, create, createMany, update, updateMany, remove, removeWhere };
}
