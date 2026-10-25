import { describe, expect, it } from "vitest";
import { readEntryForm, readSourceForm } from "./incomeForms";

const known = { accountIds: ["hdfc", "kotak"], sourceIds: ["sal", "fd"] };
const source = { name: "NetApp Salary", alias: "", category: "Salary", frequency: "Monthly", expectedAmount: "1,38,500", scheduleDate: "2026-11-01", color: "Sapphire", icon: "Briefcase", accountId: "hdfc", statementMatch: "NETAPP" };
const entry = { incomeSourceId: "sal", expectedDate: "2026-10-01", receivedDate: "2026-10-02", amount: "1,38,500", tag: "Regular", accountId: "hdfc" };

describe("readSourceForm", () => {
  it("reads a source, its short name falling back to the name", () => {
    expect(readSourceForm(source, known, false)).toEqual({
      ok: true,
      input: { name: "NetApp Salary", alias: "NetApp Salary", category: "Salary", frequency: "Monthly", expectedAmount: 138500, scheduleDate: "2026-11-01", color: "Sapphire", icon: "Briefcase", accountId: "hdfc", statementMatch: "NETAPP", status: "Active" },
    });
  });

  it("says what's missing in plain words", () => {
    const r = readSourceForm({}, known, false);
    expect(r).toMatchObject({ ok: false, errors: { name: "Enter what pays you, like NetApp Salary", category: "Choose salary, investment or other", frequency: "Choose how often it pays", expectedAmount: "Enter what it usually pays", scheduleDate: "Enter when it's next expected", color: "Pick a colour" } });
  });

  it("asks a one-time source when it's expected, not when it's next expected", () => {
    expect(readSourceForm({ ...source, frequency: "One-Time", scheduleDate: "" }, known, false)).toMatchObject({ ok: false, errors: { scheduleDate: "Enter when it's expected" } });
  });

  it("refuses a ₹0 usual amount, an unknown account, an unknown icon and a statement text too short to be safe", () => {
    const r = readSourceForm({ ...source, expectedAmount: "0", accountId: "nope", icon: "Rocket", statementMatch: "N A" }, known, false);
    expect(r.ok ? {} : r.errors).toEqual({ expectedAmount: "The usual amount has to be more than ₹0", accountId: "Choose one of your accounts", icon: "Pick one of the icons", statementMatch: "Use at least 3 letters, like NETAPP, so it doesn't match other deposits" });
  });

  it("leaves the account, icon and statement text optional", () => {
    const r = readSourceForm({ ...source, accountId: "", icon: "", statementMatch: "  " }, known, false);
    expect(r.ok && r.input).toMatchObject({ accountId: "", statementMatch: "" });
    expect(r.ok && "icon" in r.input).toBe(false);
  });

  it("takes active or inactive when editing", () => {
    expect(readSourceForm({ ...source, status: "Inactive" }, known, true)).toMatchObject({ ok: true, input: { status: "Inactive" } });
    expect(readSourceForm({ ...source, status: "Paused" }, known, true)).toMatchObject({ ok: false, errors: { status: "Choose active or inactive" } });
  });
});

describe("readEntryForm", () => {
  it("reads money that landed", () => {
    expect(readEntryForm(entry, known, "2026-10-24")).toEqual({ ok: true, input: { incomeSourceId: "sal", expectedDate: "2026-10-01", receivedDate: "2026-10-02", amount: 138500, tag: "Regular", accountId: "hdfc" } });
  });

  it("takes the day it landed as expected when that's left blank", () => {
    expect(readEntryForm({ ...entry, expectedDate: "" }, known, "2026-10-24")).toMatchObject({ ok: true, input: { expectedDate: "2026-10-02" } });
  });

  it("refuses a day still to come, a ₹0 amount, an unknown source and an unknown account", () => {
    const r = readEntryForm({ ...entry, receivedDate: "2026-10-25", amount: "0", incomeSourceId: "x", accountId: "y" }, known, "2026-10-24");
    expect(r.ok ? {} : r.errors).toEqual({
      receivedDate: "It can't have landed on a day that hasn't come yet. Pending payments are worked out for you",
      amount: "The amount has to be more than ₹0",
      incomeSourceId: "Choose where it came from",
      accountId: "Choose one of your accounts",
    });
  });

  it("says what's missing", () => {
    expect(readEntryForm({}, known, "2026-10-24")).toMatchObject({ ok: false, errors: { incomeSourceId: "Choose where it came from", receivedDate: "Enter the day it landed", amount: "Enter how much landed", tag: "Choose regular, bonus or one-off" } });
  });
});
