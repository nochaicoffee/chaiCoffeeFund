import "server-only";
import type { WriteGuards } from "@/lib/api/createCrudRoutes";
import { accountInUse, entryConflict, missingAccount, rateConflict } from "./epfRules";
import { epfAccountsRepository } from "./epfAccounts";
import { epfEntriesRepository } from "./epfEntries";
import { epfRatesRepository } from "./epfRates";
import type { EpfAccount, EpfEntry, EpfRate } from "./types";

/** What the EPF routes check before writing: the account exists, nothing is counted twice, and an account in use isn't deleted. */
export const epfEntryGuards: WriteGuards<EpfEntry> = {
  async beforeCreate(input) {
    return missingAccount(await epfAccountsRepository.list(), input.epfAccountId) ?? entryConflict(await epfEntriesRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const all = await epfEntriesRepository.list();
    const stored = all.find((e) => e.id === id);
    if (!stored) return null; // the repository answers a missing row with its own 404
    const merged = { ...stored, ...patch };
    const accountMissing = patch.epfAccountId ? missingAccount(await epfAccountsRepository.list(), merged.epfAccountId) : null;
    return accountMissing ?? entryConflict(all, merged, id);
  },
};

export const epfRateGuards: WriteGuards<EpfRate> = {
  async beforeCreate(input) {
    return missingAccount(await epfAccountsRepository.list(), input.epfAccountId) ?? rateConflict(await epfRatesRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const all = await epfRatesRepository.list();
    const stored = all.find((r) => r.id === id);
    if (!stored) return null;
    const merged = { ...stored, ...patch };
    const accountMissing = patch.epfAccountId ? missingAccount(await epfAccountsRepository.list(), merged.epfAccountId) : null;
    return accountMissing ?? rateConflict(all, merged, id);
  },
};

export const epfAccountGuards: WriteGuards<EpfAccount> = {
  async beforeDelete(id) {
    return accountInUse(await epfEntriesRepository.list(), await epfRatesRepository.list(), id);
  },
};
