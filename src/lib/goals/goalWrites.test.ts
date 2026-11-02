import { describe, expect, it } from "vitest";
import { addContribution, addGoal, deleteGoal, dropGoal, editContribution, editGoal, markBought, pauseGoal, removeContribution, reopenGoal, restoreDeleted, restoreGoal, resumeGoal, snapshotGoal, undoStatus, type GoalRepos } from "./goalWrites";
import { earmarksByAccount, savedOf, targetOf, totals } from "../aggregate/goals";
import { InvalidRowError, NotFoundError } from "../sheets/repository";
import type { Goal, GoalContribution } from "../sheets/types";
import { setup } from "./testRepos";

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
    await dropGoal(repos, car.id, TODAY);
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
    await expect(addContribution(repos, aside(car.id, 1, { kind: "Take-back" }))).rejects.toThrow(/Nothing is free/);
  });
  it("a goal that's gone takes no entry, and a bought or dropped one takes no more set-asides", async () => {
    const { repos } = setup();
    await expect(addContribution(repos, aside("nope", 1))).rejects.toBeInstanceOf(NotFoundError);
    const car = await addGoal(repos, input());
    await dropGoal(repos, car.id, TODAY);
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
    const changes = await dropGoal(repos, car.id, TODAY);
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
    await dropGoal(repos, tyres.id, TODAY);
    expect(targetOf(read(), goals.rows[0])).toBe(100000);
    await restoreGoal(repos, tyres.id);
    expect(targetOf(read(), goals.rows[0])).toBe(138000);
  });
  it("dropping a parent drops its open sub-goals, and restoring it restores only itself", async () => {
    const { repos, goals } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 1 }));
    await dropGoal(repos, car.id, TODAY);
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
    await contributions.create(aside(tyres.id, 1, { accountId: "hdfc" }));
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
    await contributions.create(aside(tyres.id, 20));
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

describe("undoing a delete", () => {
  it("puts the goal, its sub-goals and every entry back, pointed at their new ids", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    const tyres = await addGoal(repos, input({ name: "Tyres", parentId: car.id, amount: 5000 }));
    await addContribution(repos, aside(car.id, 100, { accountId: "hdfc" }));
    await contributions.create(aside(tyres.id, 200, { note: "bonus" }));
    const snapshot = (await snapshotGoal(repos, car.id))!;
    expect(snapshot.goals).toHaveLength(2);
    expect(snapshot.contributions).toHaveLength(2);
    await deleteGoal(repos, car.id);
    expect(goals.rows).toHaveLength(0);
    const newId = await restoreDeleted(repos, snapshot);
    expect(goals.rows.map((g) => g.name)).toEqual(["Car", "Tyres"]);
    expect(goals.rows.find((g) => g.name === "Tyres")?.parentId).toBe(newId);
    expect(goals.rows.some((g) => g.id === car.id)).toBe(false);
    const kid = goals.rows.find((g) => g.name === "Tyres")!;
    expect(contributions.rows.map((c) => [c.goalId === newId ? "car" : c.goalId === kid.id ? "tyres" : "?", c.amount, c.accountId ?? null, c.note ?? null])).toEqual([["car", 100, "hdfc", null], ["tyres", 200, null, "bonus"]]);
  });
  it("takes back what it had made if one row fails", async () => {
    const { repos, goals, contributions } = setup();
    const car = await addGoal(repos, input());
    await addContribution(repos, aside(car.id, 100));
    const snapshot = (await snapshotGoal(repos, car.id))!;
    await deleteGoal(repos, car.id);
    const failing = { goals: repos.goals, contributions: { ...repos.contributions, create: async () => { throw new Error("Sheets is down"); } } } as GoalRepos;
    await expect(restoreDeleted(failing, snapshot)).rejects.toThrow(/Sheets is down/);
    expect(goals.rows).toHaveLength(0);
    expect(contributions.rows).toHaveLength(0);
  });
  it("won't restore from a snapshot with nothing to put back, or a goal that's not valid", async () => {
    const { repos } = setup();
    await expect(restoreDeleted(repos, { goals: [], contributions: [] })).rejects.toBeInstanceOf(InvalidRowError);
    await expect(restoreDeleted(repos, { goals: [{ id: "x", name: "", amount: 1 } as never], contributions: [] })).rejects.toThrow();
  });
  it("snapshots nothing for a goal that's gone", async () => {
    const { repos } = setup();
    expect(await snapshotGoal(repos, "nope")).toBeNull();
  });
});

describe("review findings", () => {
  it("a goal's status can't be set through an edit", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    await expect(editGoal(repos, car.id, { status: "Dropped" })).rejects.toThrow(/Pause, Resume, Drop/);
  });
  it("each status move says where it can start", async () => {
    const { repos } = setup();
    const car = await addGoal(repos, input());
    await markBought(repos, car.id, { doneOn: TODAY, actualCost: 1 });
    await expect(pauseGoal(repos, car.id)).rejects.toThrow(/is bought, so it can't be paused/);
    await expect(dropGoal(repos, car.id, TODAY)).rejects.toThrow(/is bought, so it can't be dropped/);
    await expect(restoreGoal(repos, car.id)).rejects.toThrow(/can't be restored/);
    await reopenGoal(repos, car.id);
    await expect(reopenGoal(repos, car.id)).rejects.toThrow(/is active, so it can't be reopened/);
    await expect(resumeGoal(repos, car.id)).rejects.toThrow(/can't be resumed/);
    await dropGoal(repos, car.id, TODAY);
    await expect(markBought(repos, car.id, { doneOn: TODAY, actualCost: 1 })).rejects.toThrow(/is dropped, so it can't be bought/);
  });
  it("two take-backs that both passed the check can't leave a goal below zero", async () => {
    const { repos, contributions } = setup();
    const car = await addGoal(repos, input());
    await addContribution(repos, aside(car.id, 1000));
    // The second one's check ran before the first was written: simulate it by listing stale entries once.
    const real = repos.contributions.list;
    let calls = 0;
    const racing = { ...repos, contributions: { ...repos.contributions, list: async () => (calls++ === 0 ? [{ id: "old", goalId: car.id, date: TODAY, amount: 1000, kind: "Set-aside" as const }] : real()) } } as GoalRepos;
    await addContribution(racing, aside(car.id, 800, { kind: "Take-back" }));
    calls = 0;
    await expect(addContribution(racing, aside(car.id, 800, { kind: "Take-back" }))).rejects.toThrow(/another take-back came in first/);
    expect(contributions.rows.filter((c) => c.kind === "Take-back")).toHaveLength(1);
  });
});
