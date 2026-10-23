import type { Account } from "../sheets/types";
import type { StatementBank } from "./types";

/** What an account's bank or name has to say to be a bank's: Jupiter's accounts are held at Federal Bank. */
const BANK_WORDS: Record<StatementBank, RegExp> = {
  Slice: /\bslice\b/i,
  HDFC: /\bhdfc\b/i,
  Jupiter: /\b(jupiter|federal)\b/i,
};

export type AccountMatch =
  | { kind: "match"; account: Account }
  /** One account of the bank has no last 4 yet and none of the others fit: it is this one, and the statement fills its last 4 in. */
  | { kind: "fill-last4"; account: Account; last4: string }
  | { kind: "none"; reason: string }
  | { kind: "several"; accounts: Account[] };

/**
 * The account a statement belongs to, never guessed: by the bank, then by the last 4 of the
 * number the statement prints. With no last 4 on the statement, only a bank with exactly one
 * account matches. Closed accounts still match (the caller decides what to do with them), so a
 * statement for one is reported as that, not as belonging to nothing.
 */
export function matchAccount(accounts: Account[], bank: StatementBank, last4: string | undefined): AccountMatch {
  const ofBank = accounts.filter((a) => BANK_WORDS[bank].test(a.bank) || BANK_WORDS[bank].test(a.name));
  if (ofBank.length === 0) return { kind: "none", reason: `no account is with ${bank}` };
  if (last4) {
    const same = ofBank.filter((a) => a.last4 === last4);
    if (same.length === 1) return { kind: "match", account: same[0] };
    if (same.length > 1) return { kind: "several", accounts: same };
    // Another account of the bank has a different last 4, so this number is not theirs.
    const unnumbered = ofBank.filter((a) => !a.last4);
    if (unnumbered.length === 1) return { kind: "fill-last4", account: unnumbered[0], last4 };
    if (unnumbered.length > 1) return { kind: "several", accounts: unnumbered };
    return { kind: "none", reason: `a ${bank} statement for an account ending ${last4}, which isn't one of your accounts` };
  }
  return ofBank.length === 1 ? { kind: "match", account: ofBank[0] } : { kind: "several", accounts: ofBank };
}
