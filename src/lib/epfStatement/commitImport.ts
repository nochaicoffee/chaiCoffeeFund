import type { EpfAccount, EpfEntry } from "../sheets/types";
import type { ImportPlan } from "./importPlan";

/** What the commit needs of the Sheet layer, so it is tested against an in-memory one. */
export interface EpfImportRepos {
  accounts: {
    create: (input: Omit<EpfAccount, "id">) => Promise<EpfAccount>;
    update: (id: string, patch: Partial<Omit<EpfAccount, "id">>) => Promise<EpfAccount>;
  };
  entries: {
    createMany: (inputs: Omit<EpfEntry, "id">[]) => Promise<EpfEntry[]>;
    updateMany: (changes: { id: string; patch: Partial<Omit<EpfEntry, "id">> }[]) => Promise<EpfEntry[]>;
    removeWhere: (match: (values: Partial<Record<keyof EpfEntry, unknown>>) => boolean) => Promise<number>;
  };
}

export interface CommitResult {
  accountId: string;
  created: number;
  updated: number;
  removed: number;
}

/**
 * Writes a plan that has no blockers. It is not one transaction (Sheets has none), so it is ordered to fail low and visibly
 * rather than high and silently, and the import is idempotent, so running the same file again finishes whatever a failure left:
 * 1. a new account, 2. the opening row an earlier year makes redundant (removed before the rows that replace it are added, so a
 * failure leaves a balance that is too low, never one counted twice), 3. the new rows, 4. the changed rows, 5. the typed credits
 * he chose to remove, 6. the account's `confirmedThrough` last, so a failure before it never marks the account confirmed through a
 * day whose credits aren't all there.
 */
export async function commitEpfImport(plan: ImportPlan, repos: EpfImportRepos): Promise<CommitResult> {
  if (plan.blockers.length > 0) throw new Error(`The import has problems: ${plan.blockers[0]}`);
  const { writes } = plan;
  let accountId = plan.account?.id;
  let patch = writes.patchAccount;
  if (writes.createAccount) {
    // The account is created complete (including how far it is confirmed) only after its rows are written, below.
    const { confirmedThrough, ...bare } = writes.createAccount;
    accountId = (await repos.accounts.create(bare)).id;
    patch = confirmedThrough ? { confirmedThrough } : undefined;
  }
  if (!accountId) throw new Error("The import has no account to write to");

  const superseded = plan.supersededOpening?.id;
  if (superseded) await repos.entries.removeWhere((values) => values.id === superseded);
  const created = await repos.entries.createMany(writes.create.map((draft) => ({ ...draft, epfAccountId: accountId })));
  const updated = await repos.entries.updateMany(writes.update);
  const doomed = new Set(writes.remove.filter((id) => id !== superseded));
  const removed = doomed.size > 0 ? await repos.entries.removeWhere((values) => doomed.has(String(values.id))) : 0;
  if (patch) await repos.accounts.update(accountId, patch);
  return { accountId, created: created.length, updated: updated.length, removed: removed + (superseded ? 1 : 0) };
}
