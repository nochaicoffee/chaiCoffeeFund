import "server-only";
import type { WriteGuards } from "@/lib/api/createCrudRoutes";
import { investmentTargetsRepository, targetConflict } from "./investmentTargets";
import type { InvestmentTarget } from "./types";

/** What the targets routes check before writing: one row for each kind and name. */
export const investmentTargetGuards: WriteGuards<InvestmentTarget> = {
  async beforeCreate(input) {
    return targetConflict(await investmentTargetsRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const all = await investmentTargetsRepository.list();
    const stored = all.find((t) => t.id === id);
    if (!stored) return null; // the repository answers a missing row with its own 404
    return targetConflict(all, { ...stored, ...patch }, id);
  },
};
