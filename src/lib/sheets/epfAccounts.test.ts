import { describe, expect, it } from "vitest";
import { columnSpecs } from "./tableColumns";
import { EPF_ACCOUNT_COLUMNS, createEpfAccountSchema, epfAccountRowSchema, updateEpfAccountSchema } from "./epfAccounts";

const account = { name: "NetApp India", establishment: "NetApp India Private Limited", memberIdLast4: "0386", status: "Active" };

describe("createEpfAccountSchema", () => {
  it("accepts an account with its member ID's last four, leading zero kept", () => {
    const parsed = createEpfAccountSchema.parse(account);
    expect(parsed.memberIdLast4).toBe("0386");
  });
  it("needs only a name and a status", () => {
    expect(createEpfAccountSchema.safeParse({ name: "Old employer", status: "Closed" }).success).toBe(true);
  });
  it("refuses a member ID that is not exactly four characters, so the whole ID can't be saved by mistake", () => {
    for (const bad of ["386", "10386", "BGBNG00258150000020386", "03 6"]) expect(createEpfAccountSchema.safeParse({ ...account, memberIdLast4: bad }).success).toBe(false);
  });
  it("refuses a status outside Active and Closed, and a projection credit of nothing", () => {
    expect(createEpfAccountSchema.safeParse({ ...account, status: "Paused" }).success).toBe(false);
    expect(createEpfAccountSchema.safeParse({ ...account, projectionCredit: 0 }).success).toBe(false);
  });
  it("leaves confirmedThrough out: only an import sets it, never a form", () => {
    expect(createEpfAccountSchema.parse({ ...account, confirmedThrough: "2026-11-04" })).not.toHaveProperty("confirmedThrough");
    expect(updateEpfAccountSchema.parse({ confirmedThrough: "2026-11-04" })).not.toHaveProperty("confirmedThrough");
  });
});

describe("updateEpfAccountSchema", () => {
  it("lets an update clear the establishment, the member ID and the projection credit", () => {
    const patch = updateEpfAccountSchema.parse({ establishment: "", memberIdLast4: "", projectionCredit: "" });
    expect(patch.establishment).toBe("");
    expect(patch.memberIdLast4).toBe("");
    expect(patch.projectionCredit).toBeUndefined();
  });
  it("still checks what it is given", () => {
    expect(updateEpfAccountSchema.safeParse({ memberIdLast4: "12" }).success).toBe(false);
    expect(updateEpfAccountSchema.safeParse({ status: "Closed" }).success).toBe(true);
  });
});

describe("epfAccountRowSchema", () => {
  it("reads a row including the day it is confirmed through", () => {
    expect(epfAccountRowSchema.safeParse({ ...account, id: "a1", confirmedThrough: "2026-11-04" }).success).toBe(true);
  });
});

describe("the EpfAccounts tab", () => {
  it("has these columns in this order", () => {
    expect(EPF_ACCOUNT_COLUMNS).toEqual(["id", "name", "establishment", "memberIdLast4", "status", "projectionCredit", "confirmedThrough"]);
  });
  it("gets its dropdown and types from the schema", () => {
    const specs = columnSpecs(EPF_ACCOUNT_COLUMNS as string[], epfAccountRowSchema);
    expect(specs.find((s) => s.name === "status")?.options).toEqual(["Active", "Closed"]);
    expect(specs.find((s) => s.name === "confirmedThrough")?.type).toBe("DATE");
    expect(specs.find((s) => s.name === "projectionCredit")?.type).toBe("DOUBLE");
    expect(specs.find((s) => s.name === "memberIdLast4")?.type).toBe("TEXT");
  });
});
