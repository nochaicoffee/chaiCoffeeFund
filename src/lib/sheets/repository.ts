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

export interface RepositoryConfig<T extends { id: string }> {
  sheetName: string;
  columns: (keyof T)[];
  /** Columns whose value is a plain ISO date string (e.g. "2026-08-01"). */
  dateColumns?: (keyof T)[];
  /** What a valid row looks like, id included. Every row read is checked against it (see rowReading.ts). */
  schema: z.ZodType<T>;
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
  const { sheetName, columns, schema } = config;
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
  async function findRow(id: string): Promise<{ rowNumber: number; values: Partial<Record<keyof T, unknown>>; record: T | null; problems: RowProblem[] } | null> {
    const rows = await fetchRows();
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

  async function create(input: Omit<T, "id">): Promise<T> {
    const [record] = await createMany([input]);
    return record;
  }

  async function createMany(inputs: Omit<T, "id">[]): Promise<T[]> {
    if (inputs.length === 0) return [];
    const records = inputs.map((input) => ({ ...input, id: randomUUID() }) as T);
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
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A${found.rowNumber}:${lastCol}${found.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [toRowValues(updated, columns, dateColumns)] },
    });
    return updated;
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

  return { sheetName, expectedColumns, list, readAll, get, create, createMany, update, remove };
}
