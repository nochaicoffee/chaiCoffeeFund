import { describe, expect, it } from "vitest";
import { earmarksByAccount, freePot, isFunded, isPotMove, ownCovered, savedOf, savedOwn, targetOf } from "../aggregate/goals";
import type { Goal } from "../sheets/types";
import { addContribution, deleteGoal, dropGoal, markBought, restoreDeleted, snapshotGoal, undoStatus } from "./goalWrites";
import { goalUndoToken, parseGoalUndo } from "./goalUndo";
import { removeContribution } from "./goalWrites";
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
  it("a take-back comes only from what isn't given to a part, never from a part's share", async () => {
    const w = await carWithPot();
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.amount })) }, TODAY);
    // 200,000 less the three parts (135,000) leaves 65,000 free.
    await expect(addContribution(w.repos, { goalId: w.car.id, kind: "Take-back", amount: 65001, date: TODAY })).rejects.toThrow(/Only ₹65,000 isn't given to a part/);
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

describe("editing a goal that is closed", () => {
  it("a bought goal's own fields can be changed, but it takes no parts", async () => {
    const w = await carWithPot();
    await Promise.all(w.parts.map((p) => w.goals.update(p.id, { status: "Dropped" })));
    await markBought(w.repos, w.car.id, { doneOn: TODAY, actualCost: 140000 });
    await expect(saveGoalWithParts(w.repos, w.car.id, { goal: car({ name: "Car (done)" }), parts: [] }, TODAY)).resolves.toMatchObject({ goal: { name: "Car (done)", status: "Done", doneOn: TODAY } });
    await expect(saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [part({ name: "Late part" })] }, TODAY)).rejects.toThrow(/bought: reopen or restore/);
  });
  it("a dropped goal takes no parts either", async () => {
    const w = await carWithPot();
    await dropGoal(w.repos, w.car.id, TODAY);
    await expect(saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [part({ name: "Late part" })] }, TODAY)).rejects.toThrow(/dropped: reopen or restore/);
  });
});

describe("undoing a set-aside that was given to the parts", () => {
  it("takes the moves out last-first, then the set-aside, and leaves the ledger as it was", async () => {
    const w = await carWithPot();
    const before = JSON.stringify(w.contributions.rows);
    const got = await setAsideAndGive(w.repos, { goalId: w.car.id, kind: "Set-aside", amount: 60000, date: TODAY, accountId: "hdfc" }, TODAY);
    const token = parseGoalUndo(goalUndoToken({ undo: "entry", entryId: got.entry.id, moved: got.moved }));
    expect(token).toMatchObject({ undo: "entry", moved: got.moved });
    for (const id of [...got.moved].reverse()) await removeContribution(w.repos, id);
    await removeContribution(w.repos, got.entry.id);
    expect(JSON.stringify(w.contributions.rows)).toBe(before);
  });
});

describe("dropping a part when the status change fails", () => {
  it("takes the money back out of the pot, so nothing moved", async () => {
    const w = await carWithPot();
    const t = byName(w.parts, "Tyres");
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.id === t.id ? 38000 : 0 })) }, TODAY);
    const before = JSON.stringify(w.contributions.rows);
    const real = w.goals.update;
    w.goals.update = async () => {
      throw new Error("Sheets is down");
    };
    await expect(dropGoal(w.repos, t.id, TODAY)).rejects.toThrow(/Sheets is down/);
    w.goals.update = real;
    expect(JSON.stringify(w.contributions.rows)).toBe(before);
  });
});

describe("buying a part out of its goal's money", () => {
  /** The car with ₹2,00,000 set aside, Tyres given ₹38,000 and Suspension ₹45,000, so ₹1,17,000 is not given to a part. */
  async function given() {
    const w = await carWithPot();
    const [t, s] = [byName(w.parts, "Tyres"), byName(w.parts, "Suspension")];
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: [{ ...tyres, id: t.id, given: 38000 }, { ...susp, id: s.id, given: 45000 }, { ...alloy, id: byName(w.parts, "Alloy wheels").id, given: 0 }] }, TODAY);
    return { ...w, t, s };
  }
  const buy = (repos: Awaited<ReturnType<typeof carWithPot>>["repos"], id: string, actualCost: number, fromGoal?: number) => markBought(repos, id, { doneOn: TODAY, actualCost, paidFromAccountId: "hdfc", ...(fromGoal !== undefined && { fromGoal }) });

  it("the cost paid out of the goal's money is used up; the goal keeps the rest", async () => {
    const w = await given();
    await buy(w.repos, w.t.id, 38000, 38000);
    const data = await w.data();
    expect(savedOf(data, w.car)).toBe(162000);
    expect(freePot(data, w.car)).toBe(117000);
    expect(earmarksByAccount(data)).toEqual({ hdfc: 162000 });
  });
  it("a part given more than it cost sends the extra back to what isn't given to a part", async () => {
    const w = await given();
    await buy(w.repos, w.t.id, 30000, 30000);
    const data = await w.data();
    expect(savedOwn(data, w.t.id)).toBe(30000);
    expect(freePot(data, w.car)).toBe(117000 + 8000);
    expect(savedOf(data, w.car)).toBe(200000 - 30000);
  });
  it("paying from somewhere else (0) returns the whole share and uses nothing up", async () => {
    const w = await given();
    await buy(w.repos, w.t.id, 38000, 0);
    const data = await w.data();
    expect(savedOwn(data, w.t.id)).toBe(0);
    expect(savedOf(data, w.car)).toBe(200000);
    expect(freePot(data, w.car)).toBe(117000 + 38000);
  });
  it("a cost beyond the share is taken from what isn't given to a part, and refused when that isn't enough", async () => {
    const w = await given();
    await buy(w.repos, w.s.id, 50000, 50000);
    const data = await w.data();
    expect(freePot(data, w.car)).toBe(117000 - 5000);
    expect(savedOf(data, w.car)).toBe(200000 - 50000);
    const a = byName(w.parts, "Alloy wheels");
    await expect(buy(w.repos, a.id, 190000, 190000)).rejects.toThrow(/can't come out of/);
  });
  it("can't use more of the goal's money than it cost, and puts the moves back if the status change fails", async () => {
    const w = await given();
    await expect(buy(w.repos, w.t.id, 10000, 12000)).rejects.toThrow(/not more than that/);
    const before = JSON.stringify(w.contributions.rows);
    const real = w.goals.update;
    w.goals.update = async () => {
      throw new Error("Sheets is down");
    };
    await expect(buy(w.repos, w.t.id, 30000, 30000)).rejects.toThrow(/Sheets is down/);
    w.goals.update = real;
    expect(JSON.stringify(w.contributions.rows)).toBe(before);
  });
  it("without the goal's-money amount (the old path) the part's whole share is used up", async () => {
    const w = await given();
    await buy(w.repos, w.t.id, 30000);
    expect(savedOf(await w.data(), w.car)).toBe(200000 - 38000);
  });
});

describe("funded", () => {
  it("a goal with parts is funded only when every piece is covered, however much sits unassigned", async () => {
    const w = await carWithPot();
    expect(isFunded(await w.data(), w.car)).toBe(false);
    // ₹3,00,000 set aside covers the total (₹2,85,000) on paper, but no part has been given anything.
    await w.contributions.create({ goalId: w.car.id, date: TODAY, amount: 100000, kind: "Set-aside" });
    const data = await w.data();
    expect(savedOf(data, w.car)).toBeGreaterThanOrEqual(targetOf(data, w.car));
    expect(isFunded(data, w.car)).toBe(false);
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.amount })) }, TODAY);
    expect(isFunded(await w.data(), w.car)).toBe(true);
  });
});

describe("deleting a part and undoing it", () => {
  it("puts the part back under its goal with its entries, and refuses when the goal is gone", async () => {
    const w = await carWithPot();
    const t = byName(w.parts, "Tyres");
    await saveGoalWithParts(w.repos, w.car.id, { goal: car(), parts: w.parts.map((p) => ({ name: p.name, amount: p.amount, necessity: p.necessity, targetDate: p.targetDate, id: p.id, given: p.id === t.id ? 38000 : 0 })) }, TODAY);
    await markBought(w.repos, t.id, { doneOn: TODAY, actualCost: 38000, fromGoal: 38000 });
    const raw = (await snapshotGoal(w.repos, t.id))!;
    // The in-memory repository keeps "" for a cleared field where the real one reads it back as missing.
    const snapshot = { ...raw, goals: raw.goals.map((g) => Object.fromEntries(Object.entries(g).filter(([, v]) => v !== ""))) as unknown as Goal[] };
    expect(snapshot.goals).toHaveLength(1);
    await deleteGoal(w.repos, t.id);
    expect(w.goals.rows.some((g) => g.id === t.id)).toBe(false);
    const newId = await restoreDeleted(w.repos, snapshot);
    expect(w.goals.rows.find((g) => g.id === newId)).toMatchObject({ name: "Tyres", parentId: w.car.id, status: "Done" });
    expect(w.contributions.rows.filter((c) => c.goalId === newId)).toHaveLength(snapshot.contributions.length);
    await deleteGoal(w.repos, w.car.id);
    await expect(restoreDeleted(w.repos, snapshot)).rejects.toThrow(/isn't in the Goals tab/);
  });
});
