import { z } from "zod";
import { parseAmountText } from "../format/money";
import { isoDate } from "./validation";

/**
 * Turning a raw Sheet row into a typed record (see "Reading from Sheets" in
 * docs/system-design.md). Reads use UNFORMATTED_VALUE, so cells arrive as the
 * Sheet stores them: a blank cell is "", a date is a serial number, and a number
 * typed as text is a string. Each cell is first cleaned up according to what the
 * entity's schema expects for that column, then the whole row is checked against
 * the schema. Rows that fail are reported rather than passed on half-valid.
 */

export interface RowProblem {
  field: string;
  message: string;
}

export type RowResult<T> =
  /** Every cell is blank: an empty row in the Table, skipped without a report. */
  | { kind: "blank" }
  | { kind: "valid"; record: T }
  /** `values` are the cleaned cells by column, for code that must still see every row. */
  | { kind: "invalid"; values: Partial<Record<keyof T, unknown>>; problems: RowProblem[] };

type ColumnKind = "number" | "text" | "other";

const SHEETS_DATE_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A Sheets date serial (days since 30 Dec 1899) as an ISO date: 46239 → "2026-08-05".
 * The fraction is a time of day, so it's dropped rather than rounded: an
 * evening time mustn't move the date to the next day.
 */
export function serialToIsoDate(serial: number): string {
  return new Date(SHEETS_DATE_EPOCH_UTC_MS + Math.floor(serial) * MS_PER_DAY).toISOString().slice(0, 10);
}

function unwrap(field: z.ZodType): z.ZodType {
  let schema = field;
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodDefault) {
    schema = schema.unwrap() as z.ZodType;
  }
  return schema;
}

function shapeOf(schema: z.ZodType): Record<string, z.ZodType> {
  if (!(schema instanceof z.ZodObject)) throw new Error("A row schema must be a z.object()");
  return schema.shape as Record<string, z.ZodType>;
}

/** What each column's schema expects, read from the schema itself so it can't drift from it. */
export function columnKinds(schema: z.ZodType): Record<string, ColumnKind> {
  return Object.fromEntries(
    Object.entries(shapeOf(schema)).map(([key, field]) => {
      const base = unwrap(field);
      const kind: ColumnKind = base instanceof z.ZodNumber ? "number" : base instanceof z.ZodString || base instanceof z.ZodEnum ? "text" : "other";
      return [key, kind];
    }),
  );
}

/**
 * Throws when a repository's columns don't match its row schema: a schema field
 * with no column, a column the schema doesn't know, or a date field (isoDate)
 * that isn't a date column, or the reverse. Any of these would fail every row
 * of the tab, so it fails when the repository is created instead.
 */
export function assertColumnsMatchSchema(sheetName: string, columns: string[], dateColumns: string[], schema: z.ZodType): void {
  const shape = shapeOf(schema);
  const fields = Object.keys(shape);
  const dateFields = fields.filter((field) => unwrap(shape[field]) === isoDate);
  const problems = [
    ...fields.filter((f) => !columns.includes(f)).map((f) => `${f} is in the schema but has no column`),
    ...columns.filter((c) => !fields.includes(c)).map((c) => `column ${c} isn't in the schema`),
    ...dateFields.filter((f) => !dateColumns.includes(f)).map((f) => `${f} is a date but not a date column`),
    ...dateColumns.filter((c) => !dateFields.includes(c)).map((c) => `date column ${c} isn't an isoDate in the schema`),
  ];
  if (problems.length > 0) throw new Error(`${sheetName}: the columns don't match the row schema: ${problems.join("; ")}`);
}

/**
 * One cell, cleaned up for its column:
 * - a blank cell (or only spaces) is undefined, so an optional field is simply absent;
 * - a date column's serial number becomes an ISO date;
 * - a number column's text becomes a number when it reads as one ("38500", "₹38,500.50", parseAmountText);
 * - a text column's number becomes text (an alias typed as 2024). A number that lost
 *   a leading zero (0425 typed without an apostrophe) still fails its own rule.
 * Anything else is left as it is for the schema to judge.
 */
function cleanCell(raw: unknown, kind: ColumnKind | undefined, isDate: boolean): unknown {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (text === "") return undefined;
    if (isDate) return text;
    if (kind === "number") return parseAmountText(text) ?? raw;
    return raw;
  }
  if (typeof raw === "number") {
    if (isDate) return serialToIsoDate(raw);
    if (kind === "text") return String(raw);
  }
  return raw;
}

/** Reads one row: its cells by column, cleaned up, then checked against the entity's row schema. */
export function readRow<T>(row: unknown[], columns: (keyof T)[], dateColumns: Set<keyof T>, schema: z.ZodType<T>, kinds: Record<string, ColumnKind>): RowResult<T> {
  const values: Partial<Record<keyof T, unknown>> = {};
  let blank = true;
  columns.forEach((column, index) => {
    const value = cleanCell(row[index], kinds[column as string], dateColumns.has(column));
    if (value === undefined) return;
    blank = false;
    values[column] = value;
  });
  if (blank) return { kind: "blank" };

  const parsed = schema.safeParse(values);
  if (parsed.success) return { kind: "valid", record: parsed.data };
  const problems = parsed.error.issues.map((issue) => {
    const field = issue.path.map(String).join(".") || "row";
    const isBlank = issue.path.length > 0 && values[issue.path[0] as keyof T] === undefined;
    return { field, message: isBlank ? "is blank" : issue.message };
  });
  return { kind: "invalid", values, problems };
}

const reported = new Set<string>();

/**
 * Logs a row that was left out, once per distinct problem for the life of the
 * server, so a bad row is never skipped silently but doesn't repeat on every read.
 * Only field names and rule messages are logged, never cell values: a row can
 * hold a statement PDF password.
 */
export function reportInvalidRow(sheetName: string, rowNumber: number, id: unknown, problems: RowProblem[]): void {
  const message = `[sheets] ${sheetName} row ${rowNumber}${typeof id === "string" ? ` (id ${id})` : ""} was left out: ${problems
    .map((p) => `${p.field} ${p.message}`)
    .join("; ")}`;
  if (reported.has(message)) return;
  reported.add(message);
  console.warn(message);
}
