import { describe, expect, it } from "vitest";
import { columnSpecs } from "./tableColumns";
import { EPF_ENTRY_COLUMNS, checkEpfEntry, createEpfEntrySchema, epfEntryRowSchema, updateEpfEntrySchema } from "./epfEntries";

const credit = { epfAccountId: "a1", kind: "Contribution", date: "2026-10-18", wageMonth: "2026-09", employee: 19654, employer: 19654, pension: 0, source: "Typed" };
const interest = { epfAccountId: "a1", kind: "Interest", date: "2026-03-31", employee: 20462, employer: 20462, pension: 0, source: "Typed" };
const opening = { epfAccountId: "a1", kind: "Opening", date: "2026-03-31", employee: 360029, employer: 360029, pension: 0, source: "Typed" };

const problems = (input: unknown) => createEpfEntrySchema.safeParse(input).error?.issues.map((i) => `${i.path.join(".")}: ${i.message}`) ?? [];

describe("createEpfEntrySchema", () => {
  it("accepts a credit, a year's interest and an opening balance", () => {
    for (const row of [credit, interest, opening]) expect(createEpfEntrySchema.safeParse(row).success).toBe(true);
  });
  it("needs a wage month on a credit, and refuses one on interest or an opening balance", () => {
    expect(problems({ ...credit, wageMonth: undefined })).toEqual(["wageMonth: A credit needs the wage month it is for"]);
    expect(problems({ ...interest, wageMonth: "2025-03" })).toEqual(["wageMonth: Only a credit has a wage month"]);
    expect(problems({ ...opening, wageMonth: "2025-03" })).toEqual(["wageMonth: Only a credit has a wage month"]);
  });
  it("reads a wage month only as YYYY-MM", () => {
    for (const bad of ["2026-13", "2026-9", "Sep 2026", "2026-09-01"]) expect(createEpfEntrySchema.safeParse({ ...credit, wageMonth: bad }).success).toBe(false);
  });
  it("refuses a credit that arrives before its wage month began", () => {
    expect(problems({ ...credit, date: "2026-08-31" })).toEqual(["date: A credit can't arrive before its wage month"]);
    expect(createEpfEntrySchema.safeParse({ ...credit, date: "2026-09-30" }).success).toBe(true); // credited in the month itself is odd but possible
  });
  it("credits a year's interest on 31 March only", () => {
    expect(problems({ ...interest, date: "2026-03-30" })).toEqual(["date: A year's interest is credited on 31 March"]);
  });
  it("refuses a credit or interest of nothing, but allows an opening balance of nothing to be recorded as one", () => {
    expect(problems({ ...credit, employee: 0, employer: 0 })).toEqual(["employee: Enter an amount: a credit of nothing records nothing"]);
    expect(problems({ ...interest, employee: 0, employer: 0 })).toEqual(["employee: Enter an amount: a credit of nothing records nothing"]);
    expect(createEpfEntrySchema.safeParse({ ...opening, employee: 0, employer: 0 }).success).toBe(true);
  });
  it("refuses a negative amount, an unknown kind and an unknown source", () => {
    expect(createEpfEntrySchema.safeParse({ ...credit, employee: -1 }).success).toBe(false);
    expect(createEpfEntrySchema.safeParse({ ...credit, kind: "Withdrawal" }).success).toBe(false);
    expect(createEpfEntrySchema.safeParse({ ...credit, source: "Email" }).success).toBe(false);
  });
  it("only ever writes Typed: a form can't mark a number as read from a passbook", () => {
    expect(createEpfEntrySchema.safeParse({ ...credit, source: "Passbook" }).success).toBe(false);
    const { source, ...noSource } = credit;
    expect(source).toBe("Typed");
    expect(createEpfEntrySchema.parse(noSource).source).toBe("Typed");
  });
  it("can't have its source changed by an update, so a typed credit can't be promoted to confirmed", () => {
    expect(updateEpfEntrySchema.parse({ source: "Passbook", employee: 1 })).toEqual({ employee: 1 });
  });
  it("allows a credit paid on the employer's side only (an employer share can differ from the employee's)", () => {
    expect(createEpfEntrySchema.safeParse({ ...credit, employee: 0, employer: 5000 }).success).toBe(true);
  });
});

describe("checkEpfEntry (a whole row after an update is merged)", () => {
  it("catches what a partial update can't see: moving the day before the wage month", () => {
    expect(updateEpfEntrySchema.safeParse({ date: "2026-01-01" }).success).toBe(true);
    expect(checkEpfEntry({ ...credit, date: "2026-01-01" } as never)).toBe("A credit can't arrive before its wage month");
    expect(checkEpfEntry(credit as never)).toBeNull();
  });
  it("catches changing a credit's kind to interest while it still has a wage month", () => {
    expect(checkEpfEntry({ ...credit, kind: "Interest", date: "2027-03-31" } as never)).toBe("Only a credit has a wage month");
  });
});

describe("updateEpfEntrySchema", () => {
  it("lets an update clear the wage month, so a credit can become interest", () => {
    expect(updateEpfEntrySchema.parse({ kind: "Interest", wageMonth: "" })).toMatchObject({ kind: "Interest", wageMonth: "" });
    expect(updateEpfEntrySchema.safeParse({ wageMonth: "nonsense" }).success).toBe(false);
  });
});

describe("epfEntryRowSchema", () => {
  it("reads a good row (including one an import marked Passbook) and leaves out one that breaks a rule", () => {
    expect(epfEntryRowSchema.safeParse({ ...credit, id: "e1" }).success).toBe(true);
    expect(epfEntryRowSchema.safeParse({ ...credit, id: "e1", source: "Passbook" }).success).toBe(true);
    expect(epfEntryRowSchema.safeParse({ ...credit, id: "e2", wageMonth: undefined }).success).toBe(false);
  });
});

describe("the EpfEntries tab", () => {
  it("has these columns in this order", () => {
    expect(EPF_ENTRY_COLUMNS).toEqual(["id", "epfAccountId", "kind", "date", "wageMonth", "employee", "employer", "pension", "source"]);
  });
  it("gets its dropdowns and types from the schema", () => {
    const specs = columnSpecs(EPF_ENTRY_COLUMNS as string[], epfEntryRowSchema);
    const get = (name: string) => specs.find((s) => s.name === name);
    expect(get("kind")?.options).toEqual(["Contribution", "Interest", "Opening"]);
    expect(get("source")?.options).toEqual(["Passbook", "Typed"]);
    expect(get("date")?.type).toBe("DATE");
    expect(get("employee")?.type).toBe("DOUBLE");
    expect(get("wageMonth")?.type).toBe("TEXT");
  });
});
