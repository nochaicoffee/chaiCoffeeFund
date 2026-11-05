import { describe, expect, it } from "vitest";
import type { EpfAccount, EpfEntry } from "../sheets/types";
import { commitEpfImport } from "./commitImport";
import type { EpfImportRepos } from "./commitImport";
import { parseDecisions, encodeDecisions } from "./decisions";
import { NO_EDITS, planEpfImport } from "./importPlan";
import type { PlanInput } from "./importPlan";
import { parseEpfPassbookText } from "./parseEpfPassbookText";
import { FAKE, aTypicalYear, syntheticPassbookText } from "./__fixtures__/syntheticPassbook";

/** An in-memory Sheet, with a log of what was done to it and the order. */
function memory(accounts: EpfAccount[] = [], entries: EpfEntry[] = []) {
  const log: string[] = [];
  const state = { accounts: [...accounts], entries: [...entries] };
  let n = 0;
  const repos: EpfImportRepos = {
    accounts: {
      create: async (input) => { log.push("account.create"); const row = { ...input, id: `acc-${++n}` }; state.accounts.push(row); return row; },
      update: async (id, patch) => { log.push("account.update"); const row = state.accounts.find((a) => a.id === id)!; Object.assign(row, patch); return row; },
    },
    entries: {
      createMany: async (inputs) => { log.push("entries.create"); const rows = inputs.map((i) => ({ ...i, id: `ent-${++n}` })); state.entries.push(...rows); return rows; },
      updateMany: async (changes) => { log.push("entries.update"); return changes.map((c) => Object.assign(state.entries.find((e) => e.id === c.id)!, c.patch)); },
      removeWhere: async (match) => { log.push("entries.remove"); const keep = state.entries.filter((e) => !match(e as never)); const gone = state.entries.length - keep.length; state.entries = keep; return gone; },
    },
  };
  return { repos, state, log };
}

const passbook = () => {
  const r = parseEpfPassbookText(syntheticPassbookText(aTypicalYear()));
  if (!r.ok) throw new Error(r.problem);
  return r.passbook;
};
const planFor = (accounts: EpfAccount[], entries: EpfEntry[], over: Partial<PlanInput> = {}) =>
  planEpfImport({ original: passbook(), edits: NO_EDITS, accounts, entries, rates: [], choice: null, resolutions: {}, contradicted: {}, ...over });
const acc: EpfAccount = { id: "acc-0", name: "Example", memberIdLast4: FAKE.memberIdLast4, status: "Active" };

describe("commitEpfImport", () => {
  it("writes the rows, then the account's confirmed-through day last", async () => {
    const m = memory([acc]);
    const result = await commitEpfImport(planFor([acc], []), m.repos);
    expect(result).toMatchObject({ accountId: "acc-0", created: 14, updated: 0, removed: 0 });
    expect(m.log).toEqual(["entries.create", "entries.update", "account.update"]);
    expect(m.state.entries.every((e) => e.epfAccountId === "acc-0")).toBe(true);
    expect(m.state.accounts[0].confirmedThrough).toBe("2026-03-31");
  });
  it("importing the same file again writes no rows", async () => {
    const m = memory([acc]);
    await commitEpfImport(planFor([acc], []), m.repos);
    const before = m.state.entries.length;
    const again = planFor(m.state.accounts, m.state.entries);
    expect(again.nothingNew).toBe(true);
    const result = await commitEpfImport(again, m.repos);
    expect(result).toMatchObject({ created: 0, updated: 0, removed: 0 });
    expect(m.state.entries).toHaveLength(before);
  });
  it("creates a new account first, and its rows belong to it", async () => {
    const m = memory();
    const plan = planFor([], [], { choice: { kind: "new", name: "Example job" } });
    const result = await commitEpfImport(plan, m.repos);
    expect(m.log[0]).toBe("account.create");
    expect(m.state.accounts[0]).toMatchObject({ name: "Example job", memberIdLast4: FAKE.memberIdLast4, confirmedThrough: "2026-03-31" });
    expect(m.state.entries.every((e) => e.epfAccountId === result.accountId)).toBe(true);
  });
  it("replaces a typed credit, removes the ones he said to, and leaves the rest", async () => {
    const typed: EpfEntry = { id: "t1", epfAccountId: "acc-0", kind: "Contribution", wageMonth: "2025-05", date: "2025-06-01", employee: 10000, employer: 10000, pension: 0, source: "Typed" };
    const stray: EpfEntry = { id: "t2", epfAccountId: "acc-0", kind: "Contribution", wageMonth: "2024-01", date: "2025-07-17", employee: 5, employer: 5, pension: 0, source: "Typed" };
    const keep: EpfEntry = { ...stray, id: "t3", wageMonth: "2023-01", date: "2025-08-17" };
    const m = memory([acc], [typed, stray, keep]);
    const plan = planFor([acc], [typed, stray, keep], { contradicted: { t2: "remove" } });
    const result = await commitEpfImport(plan, m.repos);
    expect(result).toMatchObject({ updated: 1, removed: 1 });
    expect(m.state.entries.find((e) => e.id === "t1")?.source).toBe("Passbook");
    expect(m.state.entries.some((e) => e.id === "t2")).toBe(false);
    expect(m.state.entries.some((e) => e.id === "t3")).toBe(true);
  });
  it("removes the opening row an earlier year makes redundant before it adds the rows, so a failure leaves the balance low, never counted twice", async () => {
    const laterOpening: EpfEntry = { id: "o1", epfAccountId: "acc-0", kind: "Opening", date: "2026-03-31", employee: 229000, employer: 229000, pension: 0, source: "Passbook" };
    const m = memory([acc], [laterOpening]);
    const plan = planFor([acc], [laterOpening]);
    expect(plan.supersededOpening?.id).toBe("o1");
    const result = await commitEpfImport(plan, m.repos);
    expect(m.log.slice(0, 2)).toEqual(["entries.remove", "entries.create"]);
    expect(m.state.entries.some((e) => e.id === "o1")).toBe(false);
    expect(result.removed).toBe(1);
    // And a failure while adding the rows leaves the row removed, which importing again repairs.
    const again = memory([acc], [laterOpening]);
    again.repos.entries.createMany = async () => { throw new Error("Sheets said no"); };
    await expect(commitEpfImport(plan, again.repos)).rejects.toThrow();
    expect(again.state.entries).toEqual([]);
  });
  it("refuses a plan with blockers and writes nothing", async () => {
    const m = memory([acc]);
    const bad = planFor([acc], [], { original: { ...passbook(), closing: { employee: 1, employer: 1, pension: 0 } } });
    await expect(commitEpfImport(bad, m.repos)).rejects.toThrow(/problems/);
    expect(m.log).toEqual([]);
  });
});

describe("the decisions sent with a confirm", () => {
  const good = { edits: { changed: { "2025-05": { date: "2025-06-02", employee: 1, employer: 1, pension: 0 } }, added: [{ wageMonth: "2025-08", date: "2025-09-01", employee: 1, employer: 1, pension: 0 }] }, choice: { kind: "existing" as const, id: "acc-0" }, resolutions: { "credit:2025-05": "mine" as const }, contradicted: { t2: "remove" as const } };
  it("round trips", () => {
    expect(parseDecisions(encodeDecisions(good))).toEqual(good);
    expect(parseDecisions(encodeDecisions({ ...good, choice: null }))?.choice).toBeNull();
  });
  it("refuses anything that isn't well formed", () => {
    for (const bad of ["", "not json", "{}", JSON.stringify({ ...good, resolutions: { x: "both" } }), JSON.stringify({ ...good, choice: { kind: "other" } }), JSON.stringify({ ...good, edits: { changed: {}, added: [{ wageMonth: "2025-08" }] } })]) {
      expect(parseDecisions(bad)).toBeNull();
    }
  });
});
