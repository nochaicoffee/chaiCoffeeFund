import "server-only";
import type { WriteGuards } from "@/lib/api/createCrudRoutes";
import { instrumentsRepository } from "./instruments";
import { priceSnapshotsRepository } from "./priceSnapshots";
import { instrumentConflict, instrumentProblem, snapshotConflict } from "./priceRules";
import type { Instrument, PriceSnapshot } from "./types";

/** What the price routes check before writing: one instrument per symbol and market, and one close per ticker and day. */
export const instrumentGuards: WriteGuards<Instrument> = {
  async beforeCreate(input) {
    return instrumentProblem(input) ?? instrumentConflict(await instrumentsRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const all = await instrumentsRepository.list();
    const stored = all.find((i) => i.id === id);
    if (!stored) return null; // the repository answers a missing row with its own 404
    const merged = { ...stored, ...patch };
    return instrumentProblem(merged) ?? instrumentConflict(all, merged, id);
  },
};

export const priceSnapshotGuards: WriteGuards<PriceSnapshot> = {
  async beforeCreate(input) {
    return snapshotConflict(await priceSnapshotsRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const all = await priceSnapshotsRepository.list();
    const stored = all.find((s) => s.id === id);
    if (!stored) return null;
    return snapshotConflict(all, { ...stored, ...patch }, id);
  },
};
