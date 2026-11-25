import type { DailySpend, DailySpendMethod } from "../sheets/types";

/**
 * What the diary already knows about how he spends (docs/design/daily.md, round 6): the spends he writes again and again, for the Often row's one-tap
 * adds, and the notes he has used, for the type-ahead. Both are worked out from the spends themselves, so there is nothing to keep up and nothing to set.
 */

/** A spend he has written the same way more than once: the same note, amount, method and category. */
export interface OftenSpend {
  note: string;
  amount: number;
  method: DailySpendMethod;
  category?: string;
  /** How many times it's been written. */
  count: number;
  /** The last day it was written. */
  lastDate: string;
}

const norm = (note: string) => note.trim().toLowerCase();

/**
 * The spends written the same way at least `minCount` times, the most written first and, among those, the latest first. Only a spend with a note counts: a
 * habit needs a name to show on a chip. The note keeps the capitals of its latest use.
 */
export function oftenSpends(spends: readonly DailySpend[], { limit = 6, minCount = 2 }: { limit?: number; minCount?: number } = {}): OftenSpend[] {
  const groups = new Map<string, OftenSpend>();
  for (const s of spends) {
    if (!s.note || s.note.trim() === "") continue;
    const key = [norm(s.note), s.amount, s.method, s.category ?? ""].join("|");
    const found = groups.get(key);
    if (!found) groups.set(key, { note: s.note.trim(), amount: s.amount, method: s.method, ...(s.category && { category: s.category }), count: 1, lastDate: s.date });
    else {
      found.count++;
      if (s.date >= found.lastDate) {
        found.lastDate = s.date;
        found.note = s.note.trim();
      }
    }
  }
  return [...groups.values()]
    .filter((g) => g.count >= minCount)
    .sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0) || a.note.localeCompare(b.note))
    .slice(0, limit);
}

/** A note he has used, with how he usually writes it: the amount, method and category he paired with it most often (the latest wins a tie). */
export interface NoteSuggestion {
  note: string;
  amount: number;
  method: DailySpendMethod;
  category?: string;
  /** How many spends carry this note. */
  count: number;
}

/**
 * The notes he has used that start with what he typed, or have a word that does ("ch" finds "Chai" and "Office chai"), the ones starting with it first, then
 * the most used. Nothing for an empty box. Capitals are ignored when matching and kept as last written when showing.
 */
export function suggestNotes(spends: readonly DailySpend[], typed: string, { limit = 5 }: { limit?: number } = {}): NoteSuggestion[] {
  const q = norm(typed);
  if (q === "") return [];
  const byNote = new Map<string, DailySpend[]>();
  for (const s of spends) {
    if (!s.note || s.note.trim() === "") continue;
    const k = norm(s.note);
    byNote.set(k, [...(byNote.get(k) ?? []), s]);
  }
  const rows: { suggestion: NoteSuggestion; starts: boolean; last: string }[] = [];
  for (const [k, list] of byNote) {
    const starts = k.startsWith(q);
    if (!starts && !k.split(/\s+/).some((w) => w.startsWith(q))) continue;
    // The pairing he wrote most, the latest of equals.
    const pairs = new Map<string, { s: DailySpend; n: number }>();
    for (const s of list) {
      const key = [s.amount, s.method, s.category ?? ""].join("|");
      const p = pairs.get(key);
      if (!p) pairs.set(key, { s, n: 1 });
      else {
        p.n++;
        if (s.date >= p.s.date) p.s = s;
      }
    }
    const usual = [...pairs.values()].sort((a, b) => b.n - a.n || (a.s.date < b.s.date ? 1 : a.s.date > b.s.date ? -1 : 0))[0].s;
    const latest = list.reduce((a, b) => (b.date >= a.date ? b : a));
    rows.push({ suggestion: { note: (latest.note as string).trim(), amount: usual.amount, method: usual.method, ...(usual.category && { category: usual.category }), count: list.length }, starts, last: latest.date });
  }
  return rows
    .sort((a, b) => Number(b.starts) - Number(a.starts) || b.suggestion.count - a.suggestion.count || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0) || a.suggestion.note.localeCompare(b.suggestion.note))
    .slice(0, limit)
    .map((r) => r.suggestion);
}
