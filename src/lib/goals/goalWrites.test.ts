import { describe, expect, it } from "vitest";
import { addContribution, addGoal, deleteGoal, dropGoal, editContribution, editGoal, markBought, pauseGoal, removeContribution, reopenGoal, restoreGoal, resumeGoal, undoStatus, type GoalRepos } from "./goalWrites";
import { checkGoal } from "../sheets/goals";
import { earmarksByAccount, savedOf, targetOf, totals } from "../aggregate/goals";
import { InvalidRowError, NotFoundError } from "../sheets/repository";
import type { Goal, GoalContribution } from "../sheets/types";

/** In-memory repositories that behave as the real one does: an update is merged over the row and the whole row checked before it's kept. */
function memory<T extends { id: string }>(check?: (row: Omit<T, "id">) => string | null) {
  const rows: T[] = [];
  let next = 1;
  return {
    rows,
    list: async () => rows.map((r) => ({ ...r })),
    get: async (id: string) => (rows.find((r) => r.id === id) ? { ...rows.find((r) => r.id === id)! } : null),
    create: async (input: Omit<T, "id">) => {
      const problem = check?.(input);
      if (problem) throw new InvalidRowError(problem);
      const row = { ...input, id: `id-${next++}` } as T;
      rows.push(row);
      return { ...row };
    },
    update: async (id: string, patch: Partial<Omit<T, "id">>) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at < 0) throw new NotFoundError("gone");
      const merged = { ...rows[at], ...patch } as T;
      const problem = check?.(merged);
      if (problem) throw new InvalidRowError(problem);
      rows[at] = merged;
      return { ...merged };
    },
    remove: async (id: string) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at >= 0) rows.splice(at, 1);
    },
    removeWhere: async (match: (values: Partial<Record<keyof T, unknown>>) => boolean) => {
      let n = 0;
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) { rows.splice(i, 1); n++; }
      return n;
    },
  };
}
const setup = () => {
  const goals = memory<Goal>(checkGoal);
  const contributions = memory<GoalContribution>();
  return { repos: { goals, contributions } as GoalRepos, goals, contributions };
};
const input = (over: Partial<Omit<Goal, "id">> = {}): Omit<Goal, "id"> => ({ name: "Car", category: "Vehicle", necessity: "Want", scale: "Major", amount: 100000, startDate: "2026-03-01", status: "Active", ...over });
const aside = (goalId: string, amount: number, extra: Partial<Omit<GoalContribution, "id">> = {}): Omit<GoalContribution, "id"> => ({ goalId, date: "2026-10-01", amount, kind: "Set-aside", ...extra });
const TODAY = "2026-10-29";

describe("adding goals and sub-goals", () => {
  it("adds a goal, and a sub-goal under it", async () => {
    const { repos, goals } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 38000 }));
    expect(goals.rows).toHaveLength(2);
    expect(tyres.parentId).toBe(car.id);
  });
  it("refuses a goal with nothing to save, and one added as already bought", async () => {
    const { repos } = setup();
    await expect(addGoal(repos, input({ amount: 0 }))).rejects.toThrow(/Enter the amount/);
    await expect(addGoal(repos, input({ status: "Done", doneOn: TODAY }))).rejects.toThrow(/mark it bought/);
  });
  it("goes one level deep: a sub-goal can't have sub-goals", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await expect(addGoal(repos, input({ name: "Tread", parentId: tyres.id, amount: 1 }))).rejects.toThrow(/one level deep/);
  });
  it("needs the parent to exist and be open", async () => {
    const { repos } = setup();
    await expect(addGoal(repos, input({ parentId: "nope" }))).rejects.toBeInstanceOf(NotFoundError);
    const car = await addGoal(repos, input());
    await dropGoal(repos, car.id);
    await expect(addGoal(repos, input({ name: "x", parentId: car.id, amount: 1 }))).rejects.toThrow(/dropped/);
  });
});

describe("editing a goal", () => {
  it("can't make a goal its own parent, or give a goal with sub-goals a parent", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    const other = await addGoal(repos, input({ name: "Other" }));
    await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await expect(editGoal(repos, car.id, { parentId: car.id })).rejects.toThrow(/sub-goals, so it can't become one/);
    await expect(editGoal(repos, other.id, { parentId: other.id })).rejects.toThrow(/part of itself/);
  });
  it("only a goal with sub-goals can stand at 0", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    await expect(editGoal(repos, car.id, { amount: 0 })).rejects.toThrow(/only a goal with sub-goals/);
    await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 5 }));
    expect((await editGoal(repos, car.id, { amount: 0 })).amount).toBe(0);
  });
  it("clears the date and the plan with \"\"", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input({ targetDate: "2028-06-30", plannedMonthly: 4000 }));
    const edited = await editGoal(repos, car.id, { targetDate: "", plannedMonthly: "" as unknown as undefined });
    expect(edited.targetDate).toBeFalsy();
    expect(edited.plannedMonthly).toBeUndefined();
  });
});

describe("setting aside and taking back", () => {
  it("a take-back can't be more than what's saved", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    await addContribution(repos, aside(car.id, 5000));
    await expect(addContribution(repos, aside(car.id, 5001, { kind: "Take-back" }))).rejects.toThrow(/Only ₹5,000/);
    await expect(addContribution(repos, aside(car.id, 5000, { kind: "Take-back" }))).resolves.toBeDefined();
    await expect(addContribution(repos, aside(car.id, 1, { kind: "Take-back" }))).rejects.toThrow(/Nothing is set aside/);
  });
  it("a goal that's gone takes no entry, and a bought or dropped one takes no more set-asides", async () => {
    const { repos } = setup();
    await expect(addContribution(repos, aside("nope", 1))).rejects.toBeInstanceOf(NotFoundError);
    const car = await addGoal(repos, input());
    await dropGoal(repos, car.id);
    await expect(addContribution(repos, aside(car.id, 1))).rejects.toThrow(/restore it/);
  });
  it("correcting an entry can't take the goal below 0, nor can deleting one a take-back depends on", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    const a = await addContribution(repos, aside(car.id, 5000));
    await addContribution(repos, aside(car.id, 4000, { kind: "Take-back" }));
    await expect(editContribution(repos, a.id, { amount: 3000 })).rejects.toThrow(/more back than/);
    await expect(removeContribution(repos, a.id)).rejects.toThrow(/Take back the entries/);
    expect((await editContribution(repos, a.id, { amount: 6000, note: "bonus" })).amount).toBe(6000);
  });
  it("an entry can't move to another goal", async () => {
    const { repos } = setup();
    const a = await addGoal(repos, input());
    const b = await addGoal(repos, input({ name: "B" }));
    const entry = await addContribution(repos, aside(a.id, 100));
    await expect(editContribution(repos, entry.id, { goalId: b.id })).rejects.toThrow(/another goal/);
  });
});

describe("pause, drop and bought", () => {
  it("a paused parent takes its active sub-goals, and resume brings them back", async () => {
    const { repos, goals } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await pauseGoal(repos, car.id);
    expect(goals.rows.map((g) => g.status)).toEqual(["Paused", "Paused"]);
    await resumeGoal(repos, car.id);
    expect(goals.rows.find((g) => g.id === tyres.id)?.status).toBe("Active");
  });
  it("dropping releases the money (the earmark goes) and Undo puts it back", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    await addContribution(repos, aside(car.id, 5000, { accountId: "hdfc" }));
    const read = () => ({ goals: goals.rows, contributions: contributions.rows });
    expect(earmarksByAccount(read()).hdfc).toBe(5000);
    const changes = await dropGoal(repos, car.id);
    expect(earmarksByAccount(read()).hdfc ?? 0).toBe(0);
    expect(contributions.rows).toHaveLength(1);
    await undoStatus(repos, changes);
    expect(goals.rows[0].status).toBe("Active");
    expect(earmarksByAccount(read()).hdfc).toBe(5000);
  });
  it("a dropped sub-goal leaves its parent's target and a restore puts it back", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 38000 }));
    const read = () => ({ goals: goals.rows as Goal[], contributions: contributions.rows });
    expect(targetOf(read(), goals.rows[0])).toBe(138000);
    await dropGoal(repos, tyres.id);
    expect(targetOf(read(), goals.rows[0])).toBe(100000);
    await restoreGoal(repos, tyres.id);
    expect(targetOf(read(), goals.rows[0])).toBe(138000);
  });
  it("dropping a parent drops its open sub-goals, and restoring it restores only itself", async () => {
    const { repos, goals } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await dropGoal(repos, car.id);
    expect(goals.rows.map((g) => g.status)).toEqual(["Dropped", "Dropped"]);
    await restoreGoal(repos, car.id);
    expect(goals.rows.find((g) => g.id === car.id)?.status).toBe("Active");
    expect(goals.rows.find((g) => g.id === tyres.id)?.status).toBe("Dropped");
    await expect(restoreGoal(repos, tyres.id)).resolves.toBeDefined();
  });
  it("can't be bought while a sub-goal is open, and records what it cost", async () => {
    const { repos, goals } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await expect(markBought(repos, car.id, { doneOn: TODAY, actualCost: 99000 })).rejects.toThrow(/sub-goals/);
    await markBought(repos, tyres.id, { doneOn: TODAY, actualCost: 900, paidFromAccountId: "hdfc" });
    expect(goals.rows.find((g) => g.id === tyres.id)).toMatchObject({ status: "Done", doneOn: TODAY, actualCost: 900, paidFromAccountId: "hdfc" });
    await markBought(repos, car.id, { doneOn: TODAY, actualCost: 99000 });
    await expect(markBought(repos, car.id, { doneOn: TODAY, actualCost: 1 })).rejects.toThrow(/already bought/);
  });
  it("reopening clears the bought details and earmarks the money again; a sub-goal can't reopen under a bought parent", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await addContribution(repos, aside(tyres.id, 1, { accountId: "hdfc" }));
    await markBought(repos, tyres.id, { doneOn: TODAY, actualCost: 1, paidFromCardId: "c1" });
    expect(earmarksByAccount({ goals: goals.rows as Goal[], contributions: contributions.rows }).hdfc ?? 0).toBe(0);
    await markBought(repos, car.id, { doneOn: TODAY, actualCost: 5 });
    await expect(reopenGoal(repos, tyres.id)).rejects.toThrow(/bought: reopen or restore it first/);
    await reopenGoal(repos, car.id);
    await reopenGoal(repos, tyres.id);
    const row = goals.rows.find((g) => g.id === tyres.id)!;
    expect(row.status).toBe("Active");
    expect(row.doneOn).toBeFalsy();
    expect(row.actualCost).toBeUndefined();
    expect(row.paidFromCardId).toBeFalsy();
    expect(earmarksByAccount({ goals: goals.rows as Goal[], contributions: contributions.rows }).hdfc).toBe(1);
  });
  it("a bought goal's saved money isn't counted in the totals", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    await addContribution(repos, aside(car.id, 5000));
    const read = () => ({ goals: goals.rows as Goal[], contributions: contributions.rows });
    expect(totals(read(), TODAY).saved).toBe(5000);
    await markBought(repos, car.id, { doneOn: TODAY, actualCost: 90000 });
    expect(totals(read(), TODAY).saved).toBe(0);
    expect(savedOf(read(), goals.rows[0])).toBe(5000);
  });
});

describe("deleting", () => {
  it("removes the goal, its sub-goals and every set-aside, and nothing else", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    const other = await addGoal(repos, input({ name: "Other" }));
    await addContribution(repos, aside(car.id, 10));
    await addContribution(repos, aside(tyres.id, 20));
    await addContribution(repos, aside(other.id, 30));
    await deleteGoal(repos, car.id);
    expect(goals.rows.map((g) => g.id)).toEqual([other.id]);
    expect(contributions.rows.map((c) => c.amount)).toEqual([30]);
  });
  it("deleting one that's already gone is not an error", async () => {
    const { repos } = setup();
    await expect(deleteGoal(repos, "nope")).resolves.toBeUndefined();
  });
});
