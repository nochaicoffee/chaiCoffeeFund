import { fillInOrder, fillPartsOf, freePot, moveNotes, savedOwn } from "../aggregate/goals";
import { createGoalContributionSchema } from "../sheets/goalContributions";
import { createGoalSchema, updateGoalSchema } from "../sheets/goals";
import { InvalidRowError, NotFoundError } from "../sheets/repository";
import type { Goal, GoalContribution } from "../sheets/types";
import type { PartFormInput } from "../forms/goalForms";
import type { GoalRepos } from "./goalWrites";

/**
 * A goal and its parts (docs/design/goals.md, "Round 5"): a part is part of its main goal, so money is set aside on the main goal (its pot) and
 * given to the parts by hand. Giving is a move: a take-back from one goal and a set-aside on the other, in the same account, so the ledger, the
 * account earmarks, Undo and the bought and dropped rules stay what they were. Every write here keeps a journal of what it did, so a failure
 * half way puts it back.
 */

type Undo = () => Promise<void>;

/** What a write has done so far, so a failure can undo it, last first. */
export class Journal {
  private steps: Undo[] = [];
  add(step: Undo) {
    this.steps.push(step);
  }
  async rollBack() {
    for (const step of this.steps.reverse()) await step().catch(() => undefined);
    this.steps = [];
  }
}

const NO_ACCOUNT = "";
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** What a goal holds in each account (set-asides less take-backs), the money that has no account under "". */
function heldByAccount(entries: GoalContribution[], goalId: string): Map<string, number> {
  const held = new Map<string, number>();
  for (const entry of entries) {
    if (entry.goalId !== goalId) continue;
    const key = entry.accountId ?? NO_ACCOUNT;
    held.set(key, (held.get(key) ?? 0) + (entry.kind === "Set-aside" ? entry.amount : -entry.amount));
  }
  return held;
}

/** Splits `amount` over the accounts a goal holds, the largest first, so a move leaves each account's earmark right. Null when the goal holds less. */
function allocate(held: Map<string, number>, amount: number): [string, number][] | null {
  const parts: [string, number][] = [];
  let left = amount;
  for (const [key, have] of [...held].filter(([, have]) => have > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (left <= 0) break;
    const take = Math.min(have, left);
    parts.push([key, take]);
    left -= take;
  }
  return left > 0 ? null : parts;
}

/**
 * Moves money from one goal's set-asides to another's, account by account: a take-back on `from` and a set-aside on `to` for each account it
 * sits in. `ledger` is the goal entries as the caller read them (read once per write): the move reads from it and adds what it creates. Returns
 * the ids it created, in order, which is what Undo removes (last first).
 */
export async function moveMoney(repos: GoalRepos, from: Goal, to: Goal, amount: number, date: string, notes: { out: string; in: string }, journal: Journal, ledger: GoalContribution[]): Promise<string[]> {
  if (amount <= 0) return [];
  const held = heldByAccount(ledger, from.id);
  const net = [...held.values()].reduce((total, value) => total + value, 0);
  const split = amount <= net ? allocate(held, amount) : null;
  if (!split) throw new InvalidRowError(`Only ${rupees(Math.max(0, net))} is set aside in ${from.name}, not ${rupees(amount)}`);
  const created: string[] = [];
  for (const [key, part] of split) {
    const account = key === NO_ACCOUNT ? {} : { accountId: key };
    for (const [goalId, kind, note] of [[from.id, "Take-back", notes.out], [to.id, "Set-aside", notes.in]] as const) {
      const row = await repos.contributions.create(createGoalContributionSchema.parse({ goalId, kind, amount: part, date, note, ...account }));
      journal.add(() => repos.contributions.remove(row.id));
      ledger.push(row);
      created.push(row.id);
    }
  }
  return created;
}

/** A part given money from its goal's pot. */
const giveNotes = (part: Goal, main: Goal) => ({ out: moveNotes.given(part.name), in: moveNotes.from(main.name) });
/** A part's money back in its goal's pot. */
const backNotes = (part: Goal, main: Goal) => ({ out: moveNotes.back(main.name), in: moveNotes.backFrom(part.name) });

/** Puts a part's money back into its goal's pot (a part is dropped or removed). Returns the ids it created. */
export async function returnToPot(repos: GoalRepos, part: Goal, main: Goal, date: string, journal: Journal, ledger: GoalContribution[]): Promise<string[]> {
  return moveMoney(repos, part, main, savedOwn({ goals: [], contributions: ledger }, part.id), date, backNotes(part, main), journal, ledger);
}

/** Puts a part's money back in its goal's pot for a caller whose next step may fail: the result's `undo` takes the move out again. */
export async function returnPartToPot(repos: GoalRepos, partId: string, date: string): Promise<{ ids: string[]; undo: () => Promise<void> }> {
  const part = await repos.goals.get(partId);
  const main = part?.parentId ? await repos.goals.get(part.parentId) : null;
  if (!part || !main) return { ids: [], undo: async () => undefined };
  const journal = new Journal();
  try {
    const ids = await returnToPot(repos, part, main, date, journal, await repos.contributions.list());
    return { ids, undo: () => journal.rollBack() };
  } catch (error) {
    await journal.rollBack();
    throw error;
  }
}

// --- Setting money aside on a goal with parts ---

/** Set aside, and give it to the parts in order (the form's choice): what each part still lacks, Fixed dates first, then Needs, then the soonest, then the smaller. What no part can take stays in the pot. */
export async function setAsideAndGive(repos: GoalRepos, input: Omit<GoalContribution, "id">, date: string): Promise<{ entry: GoalContribution; moved: string[] }> {
  const entry = createGoalContributionSchema.parse(input);
  if (entry.kind !== "Set-aside") throw new InvalidRowError("Only a set-aside can be given to the parts");
  const main = await repos.goals.get(entry.goalId);
  if (!main) throw new NotFoundError("This goal isn't in the Goals tab any more. Close this and refresh.");
  if (main.parentId) throw new InvalidRowError(`${main.name} is a part of another goal: set the money aside on that goal`);
  if (main.status !== "Active" && main.status !== "Paused") throw new InvalidRowError(`${main.name} is ${main.status === "Done" ? "bought" : "dropped"}: reopen or restore it before setting money aside`);
  const journal = new Journal();
  try {
    const created = await repos.contributions.create(entry);
    journal.add(() => repos.contributions.remove(created.id));
    const data = { goals: await repos.goals.list(), contributions: [...(await repos.contributions.list())] };
    const additions = fillInOrder(fillPartsOf(data, main), Math.min(entry.amount, freePot(data, main)));
    const moved: string[] = [];
    for (const [partId, amount] of Object.entries(additions)) {
      const part = data.goals.find((g) => g.id === partId) as Goal;
      moved.push(...(await moveMoney(repos, main, part, amount, date, giveNotes(part, main), journal, data.contributions)));
    }
    return { entry: created, moved };
  } catch (error) {
    await journal.rollBack();
    throw error;
  }
}

// --- Saving a goal with its parts ---

export type PartInput = PartFormInput;

export interface GoalWithParts {
  /** The goal's own fields, as Add and Edit goal send them. */
  goal: Omit<Goal, "id" | "status" | "doneOn" | "actualCost" | "paidFromAccountId" | "paidFromCardId">;
  parts: PartInput[];
}

export interface SavedWithParts {
  goal: Goal;
  /** Whether a part or a share of the pot changed, which Undo of the goal's own fields can't put back. */
  touchedParts: boolean;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** The plain-words problems with a form's parts before anything is written. */
export function checkParts(parts: PartInput[], pot: number): string | null {
  const seen = new Set<string>();
  for (const part of parts) {
    if (!part.name.trim()) return "Name each part, or remove it";
    if (!(part.amount > 0)) return `Enter what ${part.name} costs`;
    if (part.given > part.amount) return `${part.name} costs ${rupees(part.amount)}, so it can't be given ${rupees(part.given)}`;
    const key = part.name.trim().toLowerCase();
    if (seen.has(key)) return `Two parts are called ${part.name}`;
    seen.add(key);
  }
  const given = sum(parts.map((part) => part.given));
  if (given > pot) return `You've given the parts ${rupees(given)}, but only ${rupees(pot)} is set aside in this goal`;
  return null;
}

/**
 * Add a goal with its parts, or save an edit to a goal and its parts, as one write: new parts are added, changed ones updated, parts that are
 * gone return their money to the pot and are deleted, and each part's share of the pot is moved to what the form says. A goal with parts can
 * stand at an own part of ₹0. Its parts take its category and horizon. A failure before the deletes puts everything back.
 */
export async function saveGoalWithParts(repos: GoalRepos, id: string | null, input: GoalWithParts, today: string): Promise<SavedWithParts> {
  const journal = new Journal();
  const all = await repos.goals.list();
  const stored = id ? (all.find((g) => g.id === id) ?? null) : null;
  if (id && !stored) throw new NotFoundError("This goal isn't in the Goals tab any more. Close this and refresh.");
  if (stored?.parentId) throw new InvalidRowError(`${stored.name} is a part of another goal: change it from that goal`);
  const openKids = stored ? all.filter((g) => g.parentId === stored.id && (g.status === "Active" || g.status === "Paused")) : [];
  const keptIds = new Set(input.parts.flatMap((part) => (part.id ? [part.id] : [])));
  for (const partId of keptIds) if (!openKids.some((kid) => kid.id === partId)) throw new NotFoundError("A part isn't in the Goals tab any more. Close this and refresh.");
  const removed = openKids.filter((kid) => !keptIds.has(kid.id));
  // A bought or dropped goal can still have its own fields changed, but it takes no parts and holds no pot to give out.
  if (stored && stored.status !== "Active" && stored.status !== "Paused" && input.parts.length > 0) throw new InvalidRowError(`${stored.name} is ${stored.status === "Done" ? "bought" : "dropped"}: reopen or restore it before changing its parts`);
  // An edit is merged over the stored row (which keeps its status and bought details); only a new goal is read whole.
  const patch = stored ? updateGoalSchema.parse(goalFieldsPatch(input.goal)) : null;
  const created = stored ? null : createGoalSchema.parse({ ...input.goal, status: "Active" });
  if (input.goal.amount <= 0 && input.parts.length === 0) throw new InvalidRowError("Enter the amount: only a goal with parts can stand at ₹0");

  const ledger = [...(await repos.contributions.list())];
  const dataNow = { goals: all, contributions: ledger };
  const pot = stored ? sum([stored.id, ...openKids.map((kid) => kid.id)].map((goalId) => savedOwn(dataNow, goalId))) : 0;
  const problem = checkParts(input.parts, pot);
  if (problem) throw new InvalidRowError(problem);
  if (!stored && sum(input.parts.map((part) => part.given)) > 0) throw new InvalidRowError("A new goal has nothing set aside to give its parts yet");

  let main: Goal;
  let touchedParts = removed.length > 0 || input.parts.some((part) => !part.id);
  try {
    // Parts that are going give their money back first, so what's given below comes from the full pot.
    for (const gone of removed) await returnToPot(repos, gone, stored as Goal, today, journal, ledger);
    if (stored && patch) {
      main = await repos.goals.update(stored.id, patch);
      journal.add(async () => void (await repos.goals.update(stored.id, updateGoalSchema.parse(previousFields(stored)))));
    } else {
      main = await repos.goals.create(created as Omit<Goal, "id">);
      journal.add(() => repos.goals.remove(main.id));
    }
    const made = new Map<PartInput, Goal>();
    for (const part of input.parts) {
      const fields = { name: part.name.trim(), amount: part.amount, necessity: part.necessity, ...(part.targetDate ? { targetDate: part.targetDate } : {}) };
      if (part.id) {
        const before = openKids.find((kid) => kid.id === part.id) as Goal;
        const changed = fields.name !== before.name || fields.amount !== before.amount || fields.necessity !== before.necessity || (fields.targetDate ?? "") !== (before.targetDate ?? "");
        if (!changed) {
          made.set(part, before);
          continue;
        }
        touchedParts = true;
        made.set(part, await repos.goals.update(part.id, updateGoalSchema.parse({ ...fields, targetDate: fields.targetDate ?? "" })));
        journal.add(async () => void (await repos.goals.update(before.id, updateGoalSchema.parse(previousFields(before)))));
      } else {
        const row = await repos.goals.create(createGoalSchema.parse({ ...fields, parentId: main.id, category: main.category, scale: main.scale, startDate: main.startDate, status: "Active" }));
        journal.add(() => repos.goals.remove(row.id));
        made.set(part, row);
      }
    }
    // Shares: parts that hold more than they should give back first, then the others take from the pot.
    const fresh = { goals: [], contributions: ledger };
    const deltas = input.parts.map((part) => ({ row: made.get(part) as Goal, delta: part.given - (part.id ? savedOwn(fresh, part.id) : 0) }));
    for (const { row, delta } of deltas.filter((d) => d.delta < 0)) {
      await moveMoney(repos, row, main, -delta, today, backNotes(row, main), journal, ledger);
      touchedParts = true;
    }
    for (const { row, delta } of deltas.filter((d) => d.delta > 0)) {
      await moveMoney(repos, main, row, delta, today, giveNotes(row, main), journal, ledger);
      touchedParts = true;
    }
  } catch (error) {
    await journal.rollBack();
    throw error;
  }
  // A part that's gone is deleted last, with its entries: its money is already back in the pot, so nothing is lost if this stops half way.
  if (removed.length > 0) {
    const ids = new Set(removed.map((kid) => kid.id));
    try {
      await repos.contributions.removeWhere((values) => ids.has(String(values.goalId)));
      for (const gone of removed) await repos.goals.remove(gone.id);
    } catch {
      // Everything else is saved and each part's money is back in the pot, so say so in words instead of reporting a failed save.
      throw new InvalidRowError("Your changes are saved, but a part you took off couldn't be deleted. Its money is back in the pot: open Edit goal and take it off again.");
    }
  }
  return { goal: main, touchedParts };
}

/** The goal's own fields as an update sets them ("" clears an optional one), from what a form sent. */
function goalFieldsPatch(fields: Pick<Goal, "name" | "category" | "necessity" | "scale" | "amount" | "startDate" | "targetDate" | "dateType" | "plannedMonthly" | "color" | "link" | "notes">): Record<string, string | number> {
  return { name: fields.name, category: fields.category, necessity: fields.necessity, scale: fields.scale, amount: fields.amount, startDate: fields.startDate, targetDate: fields.targetDate ?? "", dateType: fields.dateType ?? "", plannedMonthly: fields.plannedMonthly ?? "", color: fields.color ?? "", link: fields.link ?? "", notes: fields.notes ?? "" };
}

/** A goal's editable fields as they were, for putting an update back. */
function previousFields(goal: Goal): Record<string, string | number> {
  return goalFieldsPatch(goal);
}
