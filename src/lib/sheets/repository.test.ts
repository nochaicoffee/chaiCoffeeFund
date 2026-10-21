import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { isoDate, nonEmptyString } from "./validation";

/** A fake Sheets client: each tab's rows (below the header) by range, and every write it was asked for. */
const sheet = vi.hoisted(() => ({
  rows: {} as Record<string, unknown[][]>,
  updates: [] as { range: string; values: unknown[][] }[],
  /** Each values.batchUpdate call, as the updates it carried. */
  batches: [] as { range: string; values: unknown[][] }[][],
  deletes: [] as { startIndex: number; endIndex: number }[],
}));

vi.mock("./client", () => ({
  getSpreadsheetId: () => "spreadsheet",
  getSheetsClient: () => ({
    spreadsheets: {
      get: async () => ({ data: { sheets: [{ properties: { title: "Things", sheetId: 7 } }, { properties: { title: "LoanInstallments", sheetId: 8 } }, { properties: { title: "Loans", sheetId: 9 } }] } }),
      values: {
        get: async ({ range }: { range: string }) => ({ data: { values: sheet.rows[range] ?? [] } }),
        update: async ({ range, requestBody }: { range: string; requestBody: { values: unknown[][] } }) => {
          sheet.updates.push({ range, values: requestBody.values });
          return { data: {} };
        },
        batchUpdate: async ({ requestBody }: { requestBody: { data: { range: string; values: unknown[][] }[] } }) => {
          sheet.batches.push(requestBody.data);
          return { data: {} };
        },
      },
      batchUpdate: async ({ requestBody }: { requestBody: { requests: { deleteDimension: { range: { startIndex: number; endIndex: number } } }[] } }) => {
        for (const r of requestBody.requests) sheet.deletes.push({ startIndex: r.deleteDimension.range.startIndex, endIndex: r.deleteDimension.range.endIndex });
        return { data: {} };
      },
    },
  }),
}));

const { createRepository } = await import("./repository");
const { deleteLoanWithSchedule } = await import("./loans");

interface Thing {
  id: string;
  name: string;
  amount: number;
  date: string;
}
const things = createRepository<Thing>({
  sheetName: "Things",
  columns: ["id", "name", "amount", "date"],
  dateColumns: ["date"],
  schema: z.object({ id: nonEmptyString, name: nonEmptyString, amount: z.number(), date: isoDate }),
});

/** 46239 is 2026-08-05 as a Sheets date serial. */
const AUG_5 = 46239;

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  sheet.updates = [];
  sheet.batches = [];
  sheet.deletes = [];
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("reading", () => {
  beforeEach(() => {
    sheet.rows["Things!A2:D"] = [
      ["a", "Alpha", 100, AUG_5],
      ["b", "Bravo", "", AUG_5],
      ["", "", "", ""],
      ["c", "Charlie", "12", AUG_5],
    ];
  });

  it("readAll splits valid records from invalid rows, numbering rows as the Sheet does", async () => {
    const { records, invalid } = await things.readAll();
    expect(records).toEqual([
      { id: "a", name: "Alpha", amount: 100, date: "2026-08-05" },
      { id: "c", name: "Charlie", amount: 12, date: "2026-08-05" },
    ]);
    expect(invalid).toEqual([{ rowNumber: 3, values: { id: "b", name: "Bravo", date: "2026-08-05" }, problems: [{ field: "amount", message: "is blank" }] }]);
    expect(warn).toHaveBeenCalledWith("[sheets] Things row 3 (id b) was left out: amount is blank");
  });

  it("list leaves an invalid row out, logging it once however often it's read", async () => {
    sheet.rows["Things!A2:D"] = [["a", "Alpha", 100, AUG_5], ["d", "Delta", 100, "next week"]];
    expect((await things.list()).map((t) => t.id)).toEqual(["a"]);
    await things.list();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^\[sheets\] Things row 3 \(id d\) was left out: date /);
  });

  it("get finds a valid row, and gives null for an invalid or missing one", async () => {
    expect(await things.get("c")).toEqual({ id: "c", name: "Charlie", amount: 12, date: "2026-08-05" });
    expect(await things.get("b")).toBeNull();
    expect(await things.get("zz")).toBeNull();
  });
});

describe("writing to an invalid row", () => {
  beforeEach(() => {
    sheet.rows["Things!A2:D"] = [
      ["a", "Alpha", "100", AUG_5],
      ["b", "Bravo", "", AUG_5],
    ];
  });

  it("update repairs it in place, starting from the cleaned cells", async () => {
    await things.update("b", { amount: 5 });
    expect(sheet.updates).toEqual([{ range: "Things!A3:D3", values: [["'b", "'Bravo", 5, "2026-08-05"]] }]);
  });

  it("update rewrites a number stored as text as a number", async () => {
    await things.update("a", { name: "Alpha 2" });
    expect(sheet.updates[0].values).toEqual([["'a", "'Alpha 2", 100, "2026-08-05"]]);
  });

  it("remove deletes it", async () => {
    await things.remove("b");
    expect(sheet.deletes).toEqual([{ startIndex: 2, endIndex: 3 }]);
  });

  it("neither update nor remove logs it as left out", async () => {
    await things.update("b", { amount: 5 });
    await things.remove("b");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("updateMany", () => {
  beforeEach(() => {
    sheet.rows["Things!A2:D"] = [
      ["a", "Alpha", 100, AUG_5],
      ["b", "Bravo", "", AUG_5],
      ["c", "Charlie", 12, AUG_5],
    ];
  });

  it("writes every row in one request, invalid ones repaired from their cleaned cells", async () => {
    const updated = await things.updateMany([
      { id: "c", patch: { amount: 13 } },
      { id: "b", patch: { amount: 5 } },
    ]);
    expect(sheet.batches).toEqual([
      [
        { range: "Things!A4:D4", values: [["'c", "'Charlie", 13, "2026-08-05"]] },
        { range: "Things!A3:D3", values: [["'b", "'Bravo", 5, "2026-08-05"]] },
      ],
    ]);
    expect(updated.map((t) => t.amount)).toEqual([13, 5]);
  });

  it("clears a field patched to undefined", async () => {
    await things.updateMany([{ id: "a", patch: { name: undefined } }]);
    expect(sheet.batches[0][0].values).toEqual([["'a", "", 100, "2026-08-05"]]);
  });

  it("writes nothing when an id is missing, or when there's nothing to update", async () => {
    await expect(things.updateMany([{ id: "a", patch: { amount: 1 } }, { id: "zz", patch: { amount: 2 } }])).rejects.toThrow("Things: no record found for id zz");
    await things.updateMany([]);
    expect(sheet.batches).toEqual([]);
  });
});

describe("a whole-row check", () => {
  const checked = createRepository<Thing>({
    sheetName: "Things",
    columns: ["id", "name", "amount", "date"],
    dateColumns: ["date"],
    schema: z.object({ id: nonEmptyString, name: nonEmptyString, amount: z.number(), date: isoDate }),
    check: (row) => (row.name === "Free" && row.amount !== 0 ? "A free thing costs nothing" : null),
  });
  beforeEach(() => {
    sheet.rows["Things!A2:D"] = [["a", "Free", 0, AUG_5]];
  });

  it("runs on the row an update is merged over, and writes nothing when it's broken", async () => {
    await expect(checked.update("a", { amount: 5 })).rejects.toThrow("A free thing costs nothing");
    await expect(checked.updateMany([{ id: "a", patch: { amount: 5 } }])).rejects.toThrow("A free thing costs nothing");
    expect(sheet.updates).toEqual([]);
    expect(sheet.batches).toEqual([]);
  });

  it("lets a merged row that keeps the rule through", async () => {
    await checked.update("a", { name: "Paid", amount: 5 });
    expect(sheet.updates).toHaveLength(1);
  });
});

describe("deleteLoanWithSchedule", () => {
  const installment = (id: string, loanId: string, totalDue: unknown) => [id, loanId, 1, AUG_5, 100000, 8000, 1000, totalDue, "Pending"];

  beforeEach(() => {
    sheet.rows["Loans!A2:M"] = [["L1", "Car loan", "HDFC", "Auto", "Standard-Emi", 100000, 9, 12, "Monthly", 0, AUG_5, "acc", "Active"]];
  });

  it("deletes the loan's invalid installment rows along with the valid ones", async () => {
    sheet.rows["LoanInstallments!A2:N"] = [installment("i1", "L1", 9000), installment("i2", "L1", ""), installment("i3", "L2", 9000)];
    await deleteLoanWithSchedule("L1");
    // i1 (row 2), i2 (row 3), then the loan (row 2 of Loans). The fake Sheet doesn't shift rows after a delete.
    expect(sheet.deletes).toEqual([
      { startIndex: 1, endIndex: 2 },
      { startIndex: 2, endIndex: 3 },
      { startIndex: 1, endIndex: 2 },
    ]);
  });

  it("deletes nothing when one of the loan's rows has no id, and says which row", async () => {
    sheet.rows["LoanInstallments!A2:N"] = [installment("i1", "L1", 9000), installment("", "L1", 9000)];
    await expect(deleteLoanWithSchedule("L1")).rejects.toThrow("LoanInstallments row 3 belong to it but have no id");
    expect(sheet.deletes).toEqual([]);
  });
});
