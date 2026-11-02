import { savedOwn } from "../aggregate/goals";
import { createGoalContributionSchema, updateGoalContributionSchema } from "../sheets/goalContributions";
import { createGoalSchema, updateGoalSchema } from "../sheets/goals";
import { InvalidRowError, NotFoundError, type WriteRepo } from "../sheets/repository";
import type { Goal, GoalContribution, GoalStatus } from "../sheets/types";

/**
 * What the Goals forms write to the Sheet (#240), apart from the server actions that read a form and refresh the cache. Each is a
 * few writes that have to stay together, so a failure half way undoes what it did. They take the two repositories as arguments, so
 * they're tested against in-memory ones; the real ones are passed by the routes and actions. The rules that need other rows live
 * here (the repository's `check` only sees the one row): one level of sub-goals, a take-back never takes a goal below zero, and a
 * goal isn't bought while a sub-goal is open.
 */

export interface GoalRepos {
  goals: WriteRepo<Goal>;
  contributions: WriteRepo<GoalContribution>;
}

const GONE = "This goal isn't in the Goals tab any more. Close this and refresh.";

const open = (goal: Goal) => goal.status === "Active" || goal.status === "Paused";

async function mustGet(repos: GoalRepos, id: string): Promise<Goal> {
  const goal = await repos.goals.get(id);
  if (!goal) throw new NotFoundError(GONE);
  return goal;
}

/** Throws the plain-words problem if a goal can't sit under that parent. */
function assertCanBeKid(parent: Goal | null, id: string | null, parentId: string) {
  if (id && parentId === id) throw new InvalidRowError("A goal can't be a part of itself");
  if (!parent) throw new NotFoundError("The goal this belongs to isn't in the Goals tab any more. Close this and refresh.");
  if (parent.parentId) throw new InvalidRowError("A sub-goal can't have sub-goals: goals go one level deep");
  if (!open(parent)) throw new InvalidRowError(`${parent.name} is ${parent.status === "Done" ? "bought" : "dropped"}: reopen or restore it first`);
}

/**
 * Add a goal or a sub-goal (POST /api/goals). A sub-goal's parent must exist, be a top-level goal and still be open. A goal needs an amount
 * above 0 (only a parent that has sub-goals can stand at 0, and that's set by editing it).
 */
export async function addGoal(repos: GoalRepos, input: Omit<Goal, "id">): Promise<Goal> {
  const goal = createGoalSchema.parse(input);
  if (goal.status === "Done") throw new InvalidRowError("Add a goal as active, then mark it bought");
  if (goal.amount <= 0) throw new InvalidRowError("Enter the amount: a goal needs something to save");
  if (goal.parentId) assertCanBeKid(await repos.goals.get(goal.parentId), null, goal.parentId);
  return repos.goals.create(goal);
}

/**
 * Change a goal (PATCH /api/goals/[id], and Edit): what it would be once merged must still hold. A goal that has sub-goals can't be given a
 * parent; a goal can't be its own parent; the parent must be a top-level, open goal; and an amount of 0 is only for a parent with sub-goals.
 */
export async function editGoal(repos: GoalRepos, id: string, patch: Partial<Omit<Goal, "id">>): Promise<Goal> {
  const parsed = updateGoalSchema.parse(patch);
  if (parsed.status !== undefined) throw new InvalidRowError("Change a goal's status with Pause, Resume, Drop, Restore, Mark bought or Reopen");
  const stored = await mustGet(repos, id);
  const merged = { ...stored, ...parsed };
  const all = await repos.goals.list();
  const kids = all.filter((g) => g.parentId === id);
  if (parsed.parentId) {
    if (kids.length) throw new InvalidRowError(`${stored.name} has sub-goals, so it can't become one`);
    assertCanBeKid(all.find((g) => g.id === parsed.parentId) ?? null, id, parsed.parentId);
  }
  if (merged.amount <= 0 && !kids.some(open)) throw new InvalidRowError("Enter the amount: only a goal with sub-goals can stand at ₹0");
  return repos.goals.update(id, parsed);
}

/** Set aside or take back money (POST /api/goal-contributions). A take-back can't be more than what's saved in that goal. */
export async function addContribution(repos: GoalRepos, input: Omit<GoalContribution, "id">): Promise<GoalContribution> {
  const entry = createGoalContributionSchema.parse(input);
  const goal = await mustGet(repos, entry.goalId);
  if (entry.kind === "Set-aside" && !open(goal)) throw new InvalidRowError(`${goal.name} is ${goal.status === "Done" ? "bought" : "dropped"}: reopen or restore it before setting money aside`);
  if (entry.kind === "Take-back") {
    const saved = savedOwn({ goals: [], contributions: await repos.contributions.list() }, goal.id);
    if (entry.amount > saved) throw new InvalidRowError(saved > 0 ? `Only ₹${saved.toLocaleString("en-IN")} is set aside in ${goal.name}` : `Nothing is set aside in ${goal.name} to take back`);
  }
  const created = await repos.contributions.create(entry);
  if (entry.kind === "Take-back") {
    // Two take-backs sent together can each pass the check above (the Sheet has no transaction), so check again once it's written and take it back out.
    const net = (await repos.contributions.list()).filter((c) => c.goalId === goal.id).reduce((total, c) => total + (c.kind === "Set-aside" ? c.amount : -c.amount), 0);
    if (net < 0) {
      await repos.contributions.remove(created.id);
      throw new InvalidRowError(`Only part of that is set aside in ${goal.name}: another take-back came in first`);
    }
  }
  return created;
}

/** Correct an entry (PATCH /api/goal-contributions/[id]): the goal's saved amount must stay at or above 0 once the change is made. */
export async function editContribution(repos: GoalRepos, id: string, patch: Partial<Omit<GoalContribution, "id">>): Promise<GoalContribution> {
  const parsed = updateGoalContributionSchema.parse(patch);
  const stored = await repos.contributions.get(id);
  if (!stored) throw new NotFoundError("This entry isn't in the GoalContributions tab any more.");
  const merged = { ...stored, ...parsed };
  if (merged.goalId !== stored.goalId) throw new InvalidRowError("An entry can't be moved to another goal: delete it and add it again");
  const others = (await repos.contributions.list()).filter((c) => c.id !== id);
  const net = [...others, merged].filter((c) => c.goalId === merged.goalId).reduce((total, c) => total + (c.kind === "Set-aside" ? c.amount : -c.amount), 0);
  if (net < 0) throw new InvalidRowError("That takes more back than is set aside");
  return repos.contributions.update(id, parsed);
}

/** Delete an entry (DELETE /api/goal-contributions/[id]): removing a set-aside that a take-back depends on would take the goal below 0. */
export async function removeContribution(repos: GoalRepos, id: string): Promise<void> {
  const stored = await repos.contributions.get(id);
  if (!stored) return;
  if (stored.kind === "Set-aside") {
    const rest = (await repos.contributions.list()).filter((c) => c.id !== id && c.goalId === stored.goalId);
    const net = rest.reduce((total, c) => total + (c.kind === "Set-aside" ? c.amount : -c.amount), 0);
    if (net < 0) throw new InvalidRowError("Take back the entries that came after it first: removing it would leave less than nothing set aside");
  }
  await repos.contributions.remove(id);
}

/** What a goal that isn't bought carries none of: the day, the cost and where it was paid from. "" clears each. */
const CLEAR_BOUGHT = { doneOn: "", actualCost: "", paidFromAccountId: "", paidFromCardId: "" } as const;

export interface StatusChange {
  id: string;
  was: GoalStatus;
}

/** Change a goal's status, and the statuses of any sub-goals that move with it. Returns what changed so Undo can put it back. */
const STATUS_WORD: Record<GoalStatus, string> = { Active: "active", Paused: "paused", Done: "bought", Dropped: "dropped" };

/**
 * Change a goal's status, and the statuses of any sub-goals that move with it. `from` is where the move may start: pausing a bought goal, or
 * restoring one that's active, is refused in words, since the bought-on day and the cost belong to the status they were set with. Returns what
 * changed so Undo can put it back.
 */
async function setStatus(repos: GoalRepos, id: string, status: GoalStatus, withKids: GoalStatus[], from: GoalStatus[], verb: string, extra: Partial<Omit<Goal, "id">> = {}): Promise<StatusChange[]> {
  const goal = await mustGet(repos, id);
  if (!from.includes(goal.status)) throw new InvalidRowError(`${goal.name} is ${STATUS_WORD[goal.status]}, so it can't be ${verb}`);
  const kids = withKids.length ? (await repos.goals.list()).filter((g) => g.parentId === id && withKids.includes(g.status)) : [];
  const changed: StatusChange[] = [];
  try {
    for (const g of [goal, ...kids]) {
      await repos.goals.update(g.id, g.id === id ? { ...extra, status } : { status });
      changed.push({ id: g.id, was: g.status });
    }
  } catch (error) {
    await undoStatus(repos, changed).catch(() => undefined);
    throw error;
  }
  return changed;
}

/** Put statuses back as they were (Undo). Bought-on and cost fields set by marking bought are cleared when the goal returns to active. */
export async function undoStatus(repos: GoalRepos, changes: StatusChange[]): Promise<void> {
  for (const { id, was } of [...changes].reverse()) {
    if (!(await repos.goals.get(id))) continue;
    await repos.goals.update(id, updateGoalSchema.parse(was === "Done" ? { status: was } : { status: was, ...CLEAR_BOUGHT }));
  }
}

/** Pause a goal: it leaves the plan and keeps what's set aside. A paused parent takes its active sub-goals with it. */
export const pauseGoal = (repos: GoalRepos, id: string) => setStatus(repos, id, "Paused", ["Active"], ["Active"], "paused");

/** Resume a paused goal and the sub-goals that were paused with it. */
export const resumeGoal = (repos: GoalRepos, id: string) => setStatus(repos, id, "Active", ["Paused"], ["Paused"], "resumed");

/** Drop a goal: you won't buy it. Its money is released (a bought or dropped goal is no longer earmarked), and a parent takes its open sub-goals with it. */
export const dropGoal = (repos: GoalRepos, id: string) => setStatus(repos, id, "Dropped", ["Active", "Paused"], ["Active", "Paused"], "dropped");

/** Bring a dropped goal back. Only the goal itself: a parent's sub-goals are restored one by one. */
export const restoreGoal = async (repos: GoalRepos, id: string) => {
  const goal = await mustGet(repos, id);
  if (goal.parentId) assertCanBeKid(await repos.goals.get(goal.parentId), id, goal.parentId);
  return setStatus(repos, id, "Active", [], ["Dropped"], "restored");
};

export interface BoughtInput {
  doneOn: string;
  actualCost: number;
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

/** Mark a goal bought: what it cost and where it was paid from. It can't be bought while a sub-goal is open. Its money is released. */
export async function markBought(repos: GoalRepos, id: string, input: BoughtInput): Promise<StatusChange[]> {
  const goal = await mustGet(repos, id);
  if ((await repos.goals.list()).some((g) => g.parentId === id && open(g))) throw new InvalidRowError("Finish or drop its sub-goals before marking it bought");
  if (goal.status === "Done") throw new InvalidRowError(`${goal.name} is already bought`);
  const patch = updateGoalSchema.parse({ status: "Done", doneOn: input.doneOn, actualCost: input.actualCost, paidFromAccountId: input.paidFromAccountId ?? "", paidFromCardId: input.paidFromCardId ?? "" });
  return setStatus(repos, id, "Done", [], ["Active", "Paused"], "bought", patch);
}

/** Reopen a bought goal: it's active again and its money is earmarked again. A sub-goal can't reopen under a parent that's still bought. */
export async function reopenGoal(repos: GoalRepos, id: string): Promise<StatusChange[]> {
  const goal = await mustGet(repos, id);
  if (goal.parentId) assertCanBeKid(await repos.goals.get(goal.parentId), id, goal.parentId);
  return setStatus(repos, id, "Active", [], ["Done"], "reopened", updateGoalSchema.parse(CLEAR_BOUGHT));
}

/**
 * Delete a goal with its sub-goals and every set-aside, contributions first (as Subscriptions does), so a failure half way leaves the goal
 * there to delete again and nothing points at a missing goal.
 */
export async function deleteGoal(repos: GoalRepos, id: string): Promise<void> {
  const goal = await repos.goals.get(id);
  if (!goal) return;
  const kids = (await repos.goals.list()).filter((g) => g.parentId === id).map((g) => g.id);
  const ids = new Set([id, ...kids]);
  await repos.contributions.removeWhere((values) => ids.has(String(values.goalId)));
  await repos.goals.removeWhere((values) => values.parentId !== undefined && String(values.parentId) === id);
  await repos.goals.remove(id);
}


// --- Undoing a delete ---

/** A deleted goal as it was: the goal, its sub-goals and every entry, so Undo can put them back. */
export interface GoalSnapshot {
  goals: Goal[];
  contributions: GoalContribution[];
}

/** What deleting a goal would remove, read before it goes. */
export async function snapshotGoal(repos: GoalRepos, id: string): Promise<GoalSnapshot | null> {
  const goal = await repos.goals.get(id);
  if (!goal) return null;
  const all = await repos.goals.list();
  const goals = [goal, ...all.filter((g) => g.parentId === id)];
  const ids = new Set(goals.map((g) => g.id));
  return { goals, contributions: (await repos.contributions.list()).filter((c) => ids.has(c.goalId)) };
}

/**
 * Put a deleted goal back. The Sheet gives every row a new id, so the goals are created parent first and each sub-goal and entry is pointed
 * at its new parent. Returns the new id of the top-level goal. A failure half way removes what it had created.
 */
export async function restoreDeleted(repos: GoalRepos, snapshot: GoalSnapshot): Promise<string> {
  const top = snapshot.goals.find((g) => !g.parentId);
  if (!top) throw new InvalidRowError("There's nothing to put back");
  const made = new Map<string, string>();
  const createdGoals: string[] = [];
  const createdEntries: string[] = [];
  try {
    for (const old of [top, ...snapshot.goals.filter((g) => g.id !== top.id)]) {
      const { id, parentId, ...rest } = old;
      const row = createGoalSchema.parse({ ...rest, ...(parentId && { parentId: made.get(parentId) }) });
      const created = await repos.goals.create(row);
      made.set(id, created.id);
      createdGoals.push(created.id);
    }
    for (const entry of snapshot.contributions) {
      const { goalId, ...rest } = entry;
      delete (rest as { id?: string }).id;
      const target = made.get(goalId);
      if (!target) continue;
      createdEntries.push((await repos.contributions.create(createGoalContributionSchema.parse({ ...rest, goalId: target }))).id);
    }
  } catch (error) {
    for (const id of createdEntries) await repos.contributions.remove(id).catch(() => undefined);
    for (const id of [...createdGoals].reverse()) await repos.goals.remove(id).catch(() => undefined);
    throw error;
  }
  return made.get(top.id) as string;
}

/** A goal's editable fields as an update would set them back: what Undo of an edit restores. "" is how an update clears an optional field. */
export function goalEditableFields(goal: Goal): Record<string, string | number> {
  return { name: goal.name, category: goal.category, necessity: goal.necessity, scale: goal.scale, amount: goal.amount, startDate: goal.startDate, targetDate: goal.targetDate ?? "", dateType: goal.dateType ?? "", plannedMonthly: goal.plannedMonthly ?? "", color: goal.color ?? "", link: goal.link ?? "", notes: goal.notes ?? "" };
}
