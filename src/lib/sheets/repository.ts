import "server-only";
import { randomUUID } from "crypto";
import { getSheetsClient, getSpreadsheetId } from "./client";

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
}

const SHEETS_DATE_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function serialToIsoDate(serial: number): string {
  return new Date(SHEETS_DATE_EPOCH_UTC_MS + Math.round(serial) * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function isoDateToSerial(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((ms - SHEETS_DATE_EPOCH_UTC_MS) / MS_PER_DAY);
}

function columnLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function toRowValues<T>(record: T, columns: (keyof T)[], dateColumns: Set<keyof T>): unknown[] {
  return columns.map((col) => {
    const value = record[col];
    if (value === undefined || value === null || value === "") return "";
    if (dateColumns.has(col) && typeof value === "string") {
      return isoDateToSerial(value);
    }
    return value;
  });
}

function fromRowValues<T>(row: unknown[], columns: (keyof T)[], dateColumns: Set<keyof T>): T {
  const record = {} as T;
  columns.forEach((col, index) => {
    const raw = row[index] ?? "";
    const value = dateColumns.has(col) && typeof raw === "number" ? serialToIsoDate(raw) : raw;
    (record as Record<string, unknown>)[col as string] = value;
  });
  return record;
}

/**
 * A generic list/get/create/update/delete repository over one Sheets tab.
 * Assumes row 1 is the header and `id` is always the first column.
 *
 * Reads request UNFORMATTED_VALUE + SERIAL_NUMBER — otherwise the Sheets API
 * returns display-formatted strings (locale dates, currency symbols) instead
 * of the raw values our types expect. Date columns get converted back to
 * plain ISO strings; everything else comes through as-is.
 */
export function createRepository<T extends { id: string }>(config: RepositoryConfig<T>) {
  const { sheetName, columns } = config;
  const dateColumns = new Set(config.dateColumns ?? []);
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

  async function list(): Promise<T[]> {
    const rows = await fetchRows();
    return rows
      .filter((row) => row.length > 0 && row[0] !== "")
      .map((row) => fromRowValues<T>(row, columns, dateColumns));
  }

  /** One read serving both "does it exist" and "which row" — avoids scanning the sheet twice. */
  async function findRowAndRecord(id: string): Promise<{ rowNumber: number; record: T } | null> {
    const rows = await fetchRows();
    const index = rows.findIndex((row) => row[0] === id);
    if (index === -1) return null;
    // +2: skip the header row, and Sheets rows are 1-indexed.
    return { rowNumber: index + 2, record: fromRowValues<T>(rows[index], columns, dateColumns) };
  }

  async function get(id: string): Promise<T | null> {
    const found = await findRowAndRecord(id);
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
    const found = await findRowAndRecord(id);
    if (!found) {
      throw new NotFoundError(`${sheetName}: no record found for id ${id}`);
    }
    const updated = { ...found.record, ...patch } as T;
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
    const found = await findRowAndRecord(id);
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

  return { list, get, create, createMany, update, remove };
}
