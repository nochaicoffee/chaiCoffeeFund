import type { IncomeEntry } from "../sheets/types";
import { daysBetween } from "./cardSpend";

/**
 * An income payment whose entries don't add up to what the bank credited. A statement-imported entry's `statementRef`
 * ("<account>:<day>:<paise>:<nth>", lib/aggregate/incomeFromStatements.ts) carries the credit's own amount, so the entries
 * of the same source around that day, however many (a salary split from a bonus is two) must add up to it. When they
 * don't, one is wrong or the payment is counted twice: the importer adds the statement's entry beside a hand-typed one
 * of a different amount, because only an identical amount counts as the same payment (2026-11, ₹1,77,526.26 against
 * ₹1,75,677). Pure and stateless: fixing the entries is the whole resolution.
 */

/** Entries this close to a credit, same source, are the same payment (the importer's own window). */
export const SAME_PAYMENT_DAYS = 3;

export interface IncomeMismatch {
  sourceId: string;
  /** The credit's day, from its statement line. */
  date: string;
  /** What the bank credited. */
  credited: number;
  /** What the entries for it add up to. */
  entered: number;
  entryIds: string[];
}

const REF = /^[^:]+:(\d{4}-\d{2}-\d{2}):(\d+):\d+$/;

/** The day and the rupees a statement ref stands for, or null for a ref in some other shape. */
function creditOf(ref: string | undefined): { date: string; amount: number } | null {
  const m = ref ? REF.exec(ref) : null;
  return m ? { date: m[1], amount: Number(m[2]) / 100 } : null;
}

const paise = (n: number) => Math.round(n * 100);

export function incomeMismatches(entries: Pick<IncomeEntry, "id" | "incomeSourceId" | "amount" | "receivedDate" | "status" | "statementRef">[]): IncomeMismatch[] {
  const received = entries.filter((e) => e.status === "Received" && e.receivedDate);
  // One credit is one ref, read from each entry that carries it (a split can have several entries on one ref).
  const credits = new Map<string, { sourceId: string; date: string; amount: number }>();
  for (const e of received) {
    const credit = creditOf(e.statementRef);
    if (credit) credits.set(`${e.incomeSourceId}|${e.statementRef}`, { sourceId: e.incomeSourceId, ...credit });
  }
  const out: IncomeMismatch[] = [];
  const done = new Set<string>();
  for (const sourceId of new Set([...credits.values()].map((c) => c.sourceId))) {
    // Credits of one source close together are judged as one payment, so two lines that are really one pay day don't each look short.
    const mine = [...credits.values()].filter((c) => c.sourceId === sourceId).sort((a, b) => a.date.localeCompare(b.date));
    const groups: (typeof mine)[] = [];
    for (const c of mine) {
      const last = groups.at(-1);
      if (last && Math.abs(daysBetween(last.at(-1)!.date, c.date)) <= SAME_PAYMENT_DAYS) last.push(c);
      else groups.push([c]);
    }
    for (const group of groups) {
      const from = group[0].date;
      const to = group.at(-1)!.date;
      const near = received.filter((e) => e.incomeSourceId === sourceId && daysBetween(from, e.receivedDate!) >= -SAME_PAYMENT_DAYS && daysBetween(to, e.receivedDate!) <= SAME_PAYMENT_DAYS);
      const credited = group.reduce((t, c) => t + c.amount, 0);
      const entered = near.reduce((t, e) => t + e.amount, 0);
      const key = `${sourceId}|${near.map((e) => e.id).sort().join(",")}`;
      if (paise(credited) === paise(entered) || done.has(key)) continue;
      done.add(key);
      out.push({ sourceId, date: to, credited, entered, entryIds: near.map((e) => e.id) });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
