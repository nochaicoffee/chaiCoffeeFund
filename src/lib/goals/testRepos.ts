import { checkGoal } from "../sheets/goals";
import { InvalidRowError, NotFoundError } from "../sheets/repository";
import type { Goal, GoalContribution } from "../sheets/types";
import type { GoalRepos } from "./goalWrites";

/** In-memory repositories that behave as the real one does: an update is merged over the row and the whole row checked before it's kept. */
export function memory<T extends { id: string }>(check?: (row: Omit<T, "id">) => string | null) {
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
export const setup = () => {
  const goals = memory<Goal>(checkGoal);
  const contributions = memory<GoalContribution>();
  return { repos: { goals, contributions } as GoalRepos, goals, contributions };
};
