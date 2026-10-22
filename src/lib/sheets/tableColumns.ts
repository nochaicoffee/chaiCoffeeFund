import { z } from "zod";
import type { sheets_v4 } from "googleapis";
import { isoDate } from "./validation";

/**
 * Bringing a tab's Table in line with its repository, through the Sheets API rather
 * than by hand (CLAUDE.md: never drive the Sheets UI). It only ever adds: missing
 * columns go on the end, typed from the schema, and each enum column's dropdown is
 * set to the schema's values. It never renames, moves or removes a column, and it
 * leaves other columns' types alone, except one with no type at all, which gets the
 * schema's (the Accounts tab's startDate was never typed, #160); a tab whose existing columns don't match the
 * repository's order is refused, so nothing is written over the wrong column.
 * Pure, so it's tested against fixture metadata; the dev route sends the request.
 */

export interface ColumnSpec {
  name: string;
  type: "TEXT" | "DOUBLE" | "DATE" | "DROPDOWN";
  /** A dropdown's values, exactly as the code writes them. */
  options?: string[];
}

function unwrap(field: z.ZodType): z.ZodType {
  let schema = field;
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodDefault) {
    schema = schema.unwrap() as z.ZodType;
  }
  return schema;
}

/** Each column as the schema describes it: a date, a number, a dropdown (an enum) or text. */
export function columnSpecs(columns: string[], schema: z.ZodType): ColumnSpec[] {
  if (!(schema instanceof z.ZodObject)) throw new Error("A row schema must be a z.object()");
  const shape = schema.shape as Record<string, z.ZodType>;
  return columns.map((name) => {
    const base = unwrap(shape[name]);
    if (base === isoDate) return { name, type: "DATE" };
    if (base instanceof z.ZodNumber) return { name, type: "DOUBLE" };
    if (base instanceof z.ZodEnum) return { name, type: "DROPDOWN", options: base.options.map(String) };
    return { name, type: "TEXT" };
  });
}

export interface TablePlan {
  /** What would change, in plain words. Empty when the Table already matches. */
  changes: string[];
  /** Why nothing can be done safely, when that's the case. */
  refused?: string;
  /** The request to send, when there are changes and nothing is refused. */
  request?: sheets_v4.Schema$Request;
}

const dropdownRule = (options: string[]): sheets_v4.Schema$TableColumnDataValidationRule => ({
  condition: { type: "ONE_OF_LIST", values: options.map((userEnteredValue) => ({ userEnteredValue })) },
});

const sameOptions = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** The updateTable request that adds the missing columns and sets the dropdowns, or why it can't. */
export function planTableColumns(specs: ColumnSpec[], table: sheets_v4.Schema$Table): TablePlan {
  const existing = table.columnProperties ?? [];
  const range = table.range ?? {};
  // A table that doesn't start at A1 would put the new columns somewhere the reads don't look.
  if ((range.startColumnIndex ?? 0) !== 0 || (range.startRowIndex ?? 0) !== 0) return { changes: [], refused: "the Table doesn't start at A1" };
  for (const [index, column] of existing.entries()) {
    if (specs[index]?.name !== column.columnName) {
      return { changes: [], refused: `column ${index + 1} is "${column.columnName}" in the Sheet but "${specs[index]?.name ?? "nothing"}" in the code` };
    }
  }

  const changes: string[] = [];
  let adding = false;
  const columnProperties = specs.map((spec, index): sheets_v4.Schema$TableColumnProperties => {
    const current = existing[index];
    if (!current) {
      adding = true;
      changes.push(`add ${spec.name} (${spec.type.toLowerCase()}${spec.options ? `: ${spec.options.join(", ")}` : ""})`);
      return { columnIndex: index, columnName: spec.name, columnType: spec.type, ...(spec.options ? { dataValidationRule: dropdownRule(spec.options) } : {}) };
    }
    const untyped = !current.columnType || current.columnType === "COLUMN_TYPE_UNSPECIFIED";
    if (untyped && spec.type !== "DROPDOWN") {
      changes.push(`set ${spec.name}'s type to ${spec.type.toLowerCase()}`);
      return { ...current, columnType: spec.type };
    }
    if (spec.type !== "DROPDOWN" || !spec.options) return current;
    const sheetOptions = (current.dataValidationRule?.condition?.values ?? []).map((v) => v.userEnteredValue ?? "");
    if (current.columnType === "DROPDOWN" && sameOptions(sheetOptions, spec.options)) return current;
    changes.push(`set ${spec.name}'s dropdown to ${spec.options.join(", ")}${sheetOptions.length ? ` (was ${sheetOptions.join(", ")})` : ""}`);
    return { ...current, columnType: "DROPDOWN", dataValidationRule: dropdownRule(spec.options) };
  });
  if (changes.length === 0) return { changes };

  // The range is only sent to widen the Table for new columns. It carries the row count
  // read a moment ago, so sending it otherwise could drop a row appended since.
  const endColumnIndex = Math.max(range.endColumnIndex ?? 0, specs.length);
  return {
    changes,
    request: {
      updateTable: adding
        ? { table: { tableId: table.tableId, range: { ...range, endColumnIndex }, columnProperties }, fields: "range,columnProperties" }
        : { table: { tableId: table.tableId, columnProperties }, fields: "columnProperties" },
    },
  };
}
