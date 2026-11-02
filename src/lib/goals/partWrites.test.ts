import { describe, expect, it } from "vitest";
import { earmarksByAccount, freePot, isPotMove, ownCovered, savedOf, savedOwn, targetOf } from "../aggregate/goals";
import type { Goal } from "../sheets/types";
import { addContribution, dropGoal, markBought, undoStatus } from "./goalWrites";
import { checkParts, saveGoalWithParts, setAsideAndGive, type GoalWithParts, type PartInput } from "./partWrites";
import { setup } from "./testRepos";

const TODAY = "2026-10-29";
const car = (over: Partial<GoalWithParts["goal"]> = {}): GoalWithParts["goal"] => ({ name: "Car upgrade", category: "Vehicle", necessity: "Want", scale: "Major", amount: 150000, targetDate: "2028-06-30", startDate: "2026-03-01", ...over });
const part = (over: Partial<PartInput> = {}): PartInput => ({ name: "Tyres", amount: 38000, necessity: "Need", targetDate: "2027-01-10", given: 0, ...over });
const tyres = part();
const susp = part({ name: "Suspension", amount: 45000, targetDate: "2027-04-15" });
const alloy = part({ name: "Alloy wheels", amount: 52000, necessity: "Want", targetDate: "2027-12-31" });

/** The goal with its parts, and ₹2,00,000 set aside on it, none yet given. */
async function carWithPot() {
  const world = setup();
  const saved = await saveGoalWithParts(world.repos, null, { goal: car(), parts: [tyres, susp, alloy] }, TODAY);
  await world.contributions.create({ goalId: saved.goal.id, date: "2026-10-01", amount: 200000, kind: "Set-aside", accountId: "hdfc" });
  const data = async () => ({ goals: (await world.goals.list()) as Goal[], contributions: await world.contributions.list() });
  const parts = world.goals.rows.filter((g) => g.parentId === saved.goal.id);
  return { ...world, car: saved.goal, parts, data };
}
const byName = (parts: Goal[], name: string) => parts.find((p) => p.name === name) as Goal;

describe("saving a goal with its parts", () => {
  it("adds a goal and its parts as one write; the parts take its category and horizon", async () => {
    const { repos, goals } = setup();
    const saved = await saveGoalWithParts(repos, null, { goal: car(), parts: [tyres, susp] }, TODAY);
    expect(goals.rows).toHaveLength(3);
    expect(goals.rows.filter((g) => g.parentId === saved.goal.id)).toMatchObject([{ name: "Tyres", category: "Vehicle", scale: "Major", status: "Active" }, { name: "Suspension" }]);
  });
  it("a goal can stand at an own part of ₹0 only with parts to hold the cost", async () => {
    const { repos } = setup();
    await expect(saveGoalWithParts(repos, null, { goal: car({ amount: 0 }), parts: [] }, TODAY)).rejects.toThrow(/only a goal with parts/);
    await expect(saveGoalWithParts(repos, null, { goal: car({ amount: 0 }), parts: [tyres] }, TODAY)).resolves.toBeDefined();
  });
  it("a new goal has nothing to give its parts yet", async () => {
    const { repos } = setup();
    await expect(saveGoalWithParts(repos, null, { goal: car(), parts: [part({ given: 100 })] }, TODAY)).rejects.toThrow(/only ₹0 is set aside/);
  });
  it("giving each part its share moves it out of the pot, in the account the pot sits in, and nothing about the goal's total changes", async () => {
    const w = await carWithPot();
    const before = await w.data();
    expect(savedOf(before, w.car)).toBe(200000);
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [{ ...tyres, id: byName(w.parts, "Tyres").id, given: 38000 }, { ...susp, id: byName(w.parts, "Suspension").id, given: 45000 }, { ...alloy, id: byName(w.parts, "Alloy wheels").id, given: 10000 }] }, TODAY);
    const after = await w.data();
    expect(savedOwn(after, byName(w.parts, "Tyres").id)).toBe(38000);
    expect(savedOwn(after, byName(w.parts, "Suspension").id)).toBe(45000);
    expect(savedOwn(after, byName(w.parts, "Alloy wheels").id)).toBe(10000);
    expect(freePot(after, w.car)).toBe(200000 - 93000);
    expect(ownCovered(after, w.car)).toBe(107000);
    expect(savedOf(after, w.car)).toBe(200000);
    expect(targetOf(after, w.car)).toBe(150000 + 38000 + 45000 + 52000);
    expect(earmarksByAccount(after)).toEqual({ hdfc: 200000 });
    expect(after.contributions.filter(isPotMove)).toHaveLength(6);
  });
  it("can't give more than a part costs, or more than the goal holds", async () => {
    const w = await carWithPot();
    const id = byName(w.parts, "Tyres").id;
    await expect(saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [{ ...tyres, id, given: 40000 }] }, TODAY)).rejects.toThrow(/costs ₹38,000/);
    expect(checkParts([part({ given: 38000 }), part({ name: "Other", given: 38000 })], 50000)).toMatch(/only ₹50,000 is set aside/);
  });
  it("a share given back goes to the pot first, so another part can take it in the same save", async () => {
    const w = await carWithPot();
    const [t, s] = [byName(w.parts, "Tyres").id, byName(w.parts, "Suspension").id];
    const withShares = (tg: number, sg: number) => ({ goal: car(), parts: [{ ...tyres, id: t, given: tg }, { ...susp, id: s, given: sg }] });
    await saveGoalWithParts(w.repos, w.car.id, withShares(38000, 0), TODAY);
    await saveGoalWithParts(w.repos, w.car.id, withShares(0, 45000), TODAY);
    const data = await w.data();
    expect([savedOwn(data, t), savedOwn(data, s), freePot(data, w.car)]).toEqual([0, 45000, 155000]);
  });
  it("changing a part's cost or date updates it; a part taken off returns its money to the pot and is deleted with its entries", async () => {
    const w = await carWithPot();
    const [t, s] = [byName(w.parts, "Tyres"), byName(w.parts, "Suspension")];
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [{ ...tyres, id: t.id, given: 38000 }, { ...susp, id: s.id, given: 20000 }] }, TODAY);
    const saved = await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [{ ...tyres, id: t.id, amount: 40000, given: 38000 }] }, TODAY);
    expect(saved.touchedParts).toBe(true);
    const data = await w.data();
    expect(data.goals.find((g) => g.id === t.id)?.amount).toBe(40000);
    expect(data.goals.some((g) => g.id === s.id)).toBe(false);
    expect(data.contributions.some((c) => c.goalId === s.id)).toBe(false);
    expect(freePot(data, w.car)).toBe(200000 - 38000);
    expect(savedOf(data, w.car)).toBe(200000);
  });
  it("editing only the goal's own fields doesn't touch the parts, so its Undo can put them back", async () => {
    const w = await carWithPot();
    const rows = w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: 0 }));
    const saved = await saveGoalWithParts(w.repos, w.car.id, { goal: car({ name: "Car" }), parts: rows }, TODAY);
    expect(saved).toMatchObject({ touchedParts: false, goal: { name: "Car" } });
  });
  it("puts everything back when a write fails half way", async () => {
    const w = await carWithPot();
    const view = (rows: Goal[]) => rows.map((g) => [g.id, g.name, g.amount, g.targetDate, g.status]);
    const goalsBefore = view(w.goals.rows);
    const entriesBefore = JSON.stringify(w.contributions.rows);
    const t = byName(w.parts, "Tyres").id;
    let calls = 0;
    const real = w.contributions.create;
    w.contributions.create = async (row) => {
      if (++calls === 3) throw new Error("Sheets is down");
      return real(row);
    };
    await expect(saveGoalWithParts(w.repos, w.car.id, { goal: car({ name: "Renamed" }), parts: [{ ...tyres, id: t, given: 38000 }, { ...susp, id: byName(w.parts, "Suspension").id, given: 45000 }] }, TODAY)).rejects.toThrow(/Sheets is down/);
    expect(view(w.goals.rows)).toEqual(goalsBefore);
    expect(JSON.stringify(w.contributions.rows)).toBe(entriesBefore);
  });
});

describe("setting money aside on a goal with parts", () => {
  it("goes into the pot; ticked, it's also given to the parts in order: Needs first, then the soonest", async () => {
    const w = await carWithPot();
    const got = await setAsideAndGive(w.repos, { goalId: w.car.id, kind: "Set-aside", amount: 60000, date: TODAY, accountId: "hdfc" }, TODAY);
    const data = await w.data();
    // Tyres (Need, Jan) then Suspension (Need, Apr) are filled before the wheels; 60,000 covers tyres and ₹22,000 of the suspension.
    expect([38000, 22000, 0].map((n, i) => [n, savedOwn(data, ["Tyres", "Suspension", "Alloy wheels"].map((name) => byName(w.parts, name).id)[i])])).toEqual([[38000, 38000], [22000, 22000], [0, 0]]);
    expect(freePot(data, w.car)).toBe(200000);
    expect(got.moved).toHaveLength(4);
    expect(savedOf(data, w.car)).toBe(260000);
  });
  it("what no part can take stays in the pot", async () => {
    const w = await carWithPot();
    await setAsideAndGive(w.repos, { goalId: w.car.id, kind: "Set-aside", amount: 200000, date: TODAY }, TODAY);
    const data = await w.data();
    expect(w.parts.map((p) => savedOwn(data, p.id))).toEqual([38000, 45000, 52000]);
    expect(freePot(data, w.car)).toBe(400000 - 135000);
  });
  it("a part takes no set-aside of its own, only its goal does", async () => {
    const w = await carWithPot();
    await expect(addContribution(w.repos, { goalId: w.parts[0].id, kind: "Set-aside", amount: 100, date: TODAY })).rejects.toThrow(/part of Car upgrade/);
    await expect(setAsideAndGive(w.repos, { goalId: w.parts[0].id, kind: "Set-aside", amount: 100, date: TODAY }, TODAY)).rejects.toThrow(/part of another goal/);
  });
  it("a take-back comes only from what's free in the pot, never from a part's share", async () => {
    const w = await carWithPot();
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.amount })) }, TODAY);
    // 200,000 less the three parts (135,000) leaves 65,000 free.
    await expect(addContribution(w.repos, { goalId: w.car.id, kind: "Take-back", amount: 65001, date: TODAY })).rejects.toThrow(/Only ₹65,000 is free/);
    await expect(addContribution(w.repos, { goalId: w.car.id, kind: "Take-back", amount: 65000, date: TODAY })).resolves.toBeDefined();
  });
});

describe("dropping and buying a part", () => {
  it("a dropped part's money goes back to its goal's pot, and the goal's total shrinks by its cost", async () => {
    const w = await carWithPot();
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.id === byName(w.parts, "Tyres").id ? 38000 : 0 })) }, TODAY);
    const t = byName(w.parts, "Tyres");
    const changes = await dropGoal(w.repos, t.id, TODAY);
    const data = await w.data();
    expect(data.goals.find((g) => g.id === t.id)?.status).toBe("Dropped");
    expect(freePot(data, w.car)).toBe(200000);
    expect(savedOf(data, w.car)).toBe(200000);
    expect(targetOf(data, w.car)).toBe(150000 + 45000 + 52000);
    await undoStatus(w.repos, changes);
    expect((await w.data()).goals.find((g) => g.id === t.id)?.status).toBe("Active");
  });
  it("a bought part leaves the goal's total and its money is spent: the goal's pot is what's left", async () => {
    const w = await carWithPot();
    const t = byName(w.parts, "Tyres");
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.id === t.id ? 38000 : 0 })) }, TODAY);
    await markBought(w.repos, t.id, { doneOn: TODAY, actualCost: 36000, paidFromAccountId: "hdfc" });
    const data = await w.data();
    expect(savedOf(data, w.car)).toBe(162000);
    expect(targetOf(data, w.car)).toBe(150000 + 45000 + 52000);
    expect(earmarksByAccount(data)).toEqual({ hdfc: 162000 });
  });
});
