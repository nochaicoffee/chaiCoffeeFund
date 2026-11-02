"use server";

import { updateTag } from "next/cache";
import { goalEditPatch, readBoughtForm, readEntryForm, readGoalForm } from "@/lib/forms/goalForms";
import type { FormState } from "@/lib/forms/formState";
import { goalUndoToken, parseGoalUndo } from "@/lib/goals/goalUndo";
import { addContribution, addGoal, deleteGoal, dropGoal, editGoal, goalEditableFields, markBought, pauseGoal, removeContribution, reopenGoal, restoreDeleted, restoreGoal, resumeGoal, snapshotGoal, undoStatus, type GoalRepos, type StatusChange } from "@/lib/goals/goalWrites";
import { formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { CACHE_TAGS, getCachedAccounts, getCachedCards } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { goalContributionsRepository } from "@/lib/sheets/goalContributions";
import { goalsRepository } from "@/lib/sheets/goals";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { Goal } from "@/lib/sheets/types";

/**
 * The Goals forms' server actions (#243), used with useActionState, as the Insurance and Subscriptions forms' are: each reads the form with
 * lib/forms/goalForms.ts (plain-word errors by field), then writes with lib/goals/goalWrites.ts, which checks the rules that need other rows and
 * undoes a half-finished write. Nothing reaches the Sheet until the form is valid, and a failed write returns { status: "failed" } so the dialog
 * keeps its input for Try again. What was saved gets an Undo token (lib/goals/goalUndo.ts).
 */

const repos: GoalRepos = { goals: goalsRepository, contributions: goalContributionsRepository };
const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const GONE: FormState = { status: "invalid", errors: { form: "This goal isn't in the Goals tab any more. Close this and refresh." } };

/** Logs a failed read or write without the form's values, and says why in words when it's the quota. */
function failed(action: string, error: unknown): FormState {
  console.error(`[goals] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

/** What a thrown write means to the dialog: a gone goal, a row the rules refuse (in words), or a failure. */
function written(action: string, error: unknown): FormState {
  if (error instanceof NotFoundError) return GONE;
  if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
  return failed(action, error);
}

function refreshed(undo?: { id: string; message: string }): FormState {
  updateTag(CACHE_TAGS.goals);
  updateTag(CACHE_TAGS.goalContributions);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}

const statusUndo = (changes: StatusChange[], message: string) => ({ id: goalUndoToken({ undo: "status", changes }), message });

/** Add goal, Add sub-goal (the form carries a `parentId`), or Edit goal when it carries an id. Editing changes the goal's own fields; its parent stays. */
export async function saveGoal(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("id");
  const editing = typeof id === "string" && id !== "";
  let all: Goal[];
  try {
    all = await goalsRepository.list();
  } catch (error) {
    return failed("saveGoal", error);
  }
  const existing = editing ? (all.find((g) => g.id === id) ?? null) : null;
  if (editing && !existing) return GONE;
  const result = readGoalForm(fields(formData), all.filter((g) => !g.parentId).map((g) => g.id));
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    if (existing) {
      await editGoal(repos, existing.id, goalEditPatch(result.input));
      return refreshed({ id: goalUndoToken({ undo: "edit", goalId: existing.id, previous: goalEditableFields(existing) }), message: `${result.input.name} saved` });
    }
    const added = await addGoal(repos, { ...result.input, status: "Active" });
    return refreshed({ id: goalUndoToken({ undo: "add", goalId: added.id }), message: `${added.name} added` });
  } catch (error) {
    return written("saveGoal", error);
  }
}

/** Set aside or Take back (the form says which), with Undo. */
export async function saveEntry(_previous: FormState, formData: FormData): Promise<FormState> {
  let known: { goals: Goal[]; accountIds: string[] };
  try {
    const [goals, accounts] = await Promise.all([goalsRepository.list(), getCachedAccounts()]);
    known = { goals, accountIds: accounts.map((a) => a.id) };
  } catch (error) {
    return failed("saveEntry", error);
  }
  const result = readEntryForm(fields(formData), { goalIds: known.goals.map((g) => g.id), accountIds: known.accountIds });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    const entry = await addContribution(repos, result.input);
    const goal = known.goals.find((g) => g.id === entry.goalId);
    const verb = entry.kind === "Take-back" ? `${formatInr(entry.amount)} taken back from` : `${formatInr(entry.amount)} set aside for`;
    return refreshed({ id: goalUndoToken({ undo: "entry", entryId: entry.id }), message: `${verb} ${goal?.name ?? "the goal"}` });
  } catch (error) {
    return written("saveEntry", error);
  }
}

/** Mark bought, with Undo. */
export async function boughtGoalForm(_previous: FormState, formData: FormData): Promise<FormState> {
  let goals: Goal[], known: { accountIds: string[]; cardIds: string[] };
  try {
    const [list, accounts, cards] = await Promise.all([goalsRepository.list(), getCachedAccounts(), getCachedCards()]);
    goals = list;
    known = { accountIds: accounts.map((a) => a.id), cardIds: cards.map((c) => c.id) };
  } catch (error) {
    return failed("boughtGoalForm", error);
  }
  const result = readBoughtForm(fields(formData), { ...known, goalIds: goals.map((g) => g.id) });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { goalId, ...bought } = result.input;
  try {
    const changes = await markBought(repos, goalId, bought);
    return refreshed(statusUndo(changes, `${goals.find((g) => g.id === goalId)?.name ?? "The goal"} bought for ${formatInr(bought.actualCost)} on ${formatShortDate(bought.doneOn)}`));
  } catch (error) {
    return written("boughtGoalForm", error);
  }
}

/** The small status actions: each takes the goal's id and returns what Undo needs to put the statuses back. */
function statusAction(name: string, run: (goalId: string) => Promise<StatusChange[]>, message: (goal: Goal) => string) {
  return async (_previous: FormState, formData: FormData): Promise<FormState> => {
    const goalId = String(formData.get("goalId") ?? "");
    if (!goalId) return GONE;
    try {
      const goal = await goalsRepository.get(goalId);
      if (!goal) return GONE;
      return refreshed(statusUndo(await run(goalId), message(goal)));
    } catch (error) {
      return written(name, error);
    }
  };
}

export const pauseGoalAction = statusAction("pauseGoal", (id) => pauseGoal(repos, id), (g) => `${g.name} paused`);
export const resumeGoalAction = statusAction("resumeGoal", (id) => resumeGoal(repos, id), (g) => `${g.name} resumed`);
export const dropGoalAction = statusAction("dropGoal", (id) => dropGoal(repos, id), (g) => `${g.name} dropped: its money is released`);
export const restoreGoalAction = statusAction("restoreGoal", (id) => restoreGoal(repos, id), (g) => `${g.name} restored`);
export const reopenGoalAction = statusAction("reopenGoal", (id) => reopenGoal(repos, id), (g) => `${g.name} reopened`);

/** Delete a goal with its sub-goals and every entry, with Undo (the toast carries what was removed). */
export async function deleteGoalAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) return GONE;
  try {
    const snapshot = await snapshotGoal(repos, goalId);
    if (!snapshot) return GONE;
    await deleteGoal(repos, goalId);
    return refreshed({ id: goalUndoToken({ undo: "delete", goals: snapshot.goals as unknown as Record<string, unknown>[], contributions: snapshot.contributions as unknown as Record<string, unknown>[] }), message: `${snapshot.goals[0].name} deleted` });
  } catch (error) {
    return written("deleteGoalAction", error);
  }
}

/** Undo a toast: an added goal goes, a set-aside is taken out, statuses go back, an edit is put back, a delete is restored. */
export async function undoAction(token: string): Promise<{ ok: boolean; message: string }> {
  const change = parseGoalUndo(token);
  if (!change) return { ok: false, message: "That can't be undone any more." };
  try {
    if (change.undo === "add") await deleteGoal(repos, change.goalId);
    else if (change.undo === "entry") await removeContribution(repos, change.entryId);
    else if (change.undo === "status") await undoStatus(repos, change.changes);
    else if (change.undo === "edit") await editGoal(repos, change.goalId, change.previous as Partial<Omit<Goal, "id">>);
    else await restoreDeleted(repos, { goals: change.goals as unknown as Goal[], contributions: change.contributions as never });
  } catch (error) {
    console.error("[goals] undo failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: "Couldn't undo that. Change it from the goal's menu." };
  }
  refreshed();
  return { ok: true, message: { add: "Goal removed", entry: "Entry removed", status: "Put back", edit: "Edit undone", delete: "Goal restored" }[change.undo] };
}
