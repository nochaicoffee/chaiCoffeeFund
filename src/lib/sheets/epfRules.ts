import { financialYearOf } from "../aggregate/epf";
import type { EpfAccount, EpfEntry, EpfRate } from "./types";

/**
 * The rules about EPF rows that need the other rows (ADR 0011): pure, so they are tested without the Sheet. The write routes ask
 * them before saving (epfGuards.ts), because a duplicate credit would be counted twice in every balance and a row whose account is
 * gone could never be read back with the rest.
 */

/** The row a new or changed entry would collide with, if any, as a sentence for the person saving it. `ignoreId` is the row being changed. */
export function entryConflict(existing: EpfEntry[], row: Omit<EpfEntry, "id">, ignoreId?: string): string | null {
  const others = existing.filter((e) => e.id !== ignoreId && e.epfAccountId === row.epfAccountId);
  if (row.kind === "Contribution" && others.some((e) => e.kind === "Contribution" && e.wageMonth === row.wageMonth)) {
    return `There is already a credit for the wage month ${row.wageMonth}: change that one instead`;
  }
  if (row.kind === "Interest" && others.some((e) => e.kind === "Interest" && financialYearOf(e.date) === financialYearOf(row.date))) {
    return `The interest for ${financialYearOf(row.date)} is already recorded: change that one instead`;
  }
  if (row.kind === "Opening" && others.some((e) => e.kind === "Opening")) {
    return "This account already has an opening balance: change that one instead";
  }
  return null;
}

/** The same, for a year's rate: one row for each account and financial year. */
export function rateConflict(existing: EpfRate[], row: Omit<EpfRate, "id">, ignoreId?: string): string | null {
  return existing.some((r) => r.id !== ignoreId && r.epfAccountId === row.epfAccountId && r.financialYear === row.financialYear)
    ? `There is already a rate for ${row.financialYear}: change that one instead`
    : null;
}

/** An account the entries or rates point at must exist. */
export function missingAccount(accounts: Pick<EpfAccount, "id">[], epfAccountId: string): string | null {
  return accounts.some((a) => a.id === epfAccountId) ? null : "That EPF account doesn't exist";
}

/** An account can only be deleted once nothing points at it: its entries and rates first. */
export function accountInUse(entries: Pick<EpfEntry, "epfAccountId">[], rates: Pick<EpfRate, "epfAccountId">[], accountId: string): string | null {
  const e = entries.filter((x) => x.epfAccountId === accountId).length;
  const r = rates.filter((x) => x.epfAccountId === accountId).length;
  if (e + r === 0) return null;
  const parts = [e ? `${e} ${e === 1 ? "entry" : "entries"}` : "", r ? `${r} ${r === 1 ? "rate" : "rates"}` : ""].filter(Boolean);
  return `This account still has ${parts.join(" and ")}: delete those first`;
}
