import "server-only";
import type { WriteGuards } from "@/lib/api/createCrudRoutes";
import { balanceDayConflict } from "./balanceRules";
import { balanceSnapshotsRepository } from "./balanceSnapshots";
import type { BalanceSnapshot } from "./types";

/** What the balance routes check before writing: one balance per account and day (the Accounts page's rule, which a route can't do by replacing). */
export const balanceSnapshotGuards: WriteGuards<BalanceSnapshot> = {
  async beforeCreate(input) {
    return balanceDayConflict(await balanceSnapshotsRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const all = await balanceSnapshotsRepository.list();
    const stored = all.find((row) => row.id === id);
    if (!stored) return null; // the repository answers a missing row with its own 404
    return balanceDayConflict(all, { ...stored, ...patch }, id);
  },
};
