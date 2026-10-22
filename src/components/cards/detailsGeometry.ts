/**
 * Geometry for the details card's interactions (#117): where the limit bar's
 * readout lands, how wide each bill is in Next due, where each bill's dot sits
 * on the due-date timeline, and which bills are coming or going. Pure, so
 * DetailsCard's client pieces only measure and draw.
 */

/** What the limit bar's readout (A) shows at a point on the bar. */
export interface LimitReading {
  /** Where the readout sits, 0–1 along the bar: the point itself, or what it snapped to. */
  at: number;
  kind: "used" | "average" | "point";
  amount: number;
  /** The amount as a share of the limit. */
  share: number;
}

export interface LimitBarValues {
  limit: number;
  /** What's used of the limit: the bar's fill. */
  used: number;
  /** The period's monthly average, and where its pill sits on the bar (0–1), if it shows. */
  average: number;
  averageAt: number | null;
}

/** Amounts between the snaps are read to the nearest ₹1,000, which is as precise as a pointer on a bar can be. */
const READ_TO = 1000;

/**
 * The reading at `fraction` along the bar. Within `snap` (a fraction of the
 * bar) of the fill's end or the average's pill, it snaps to that, the nearer
 * one winning; elsewhere it's the amount at that point.
 */
export function readLimitAt(fraction: number, bar: LimitBarValues, snap: number): LimitReading {
  const at = Math.min(1, Math.max(0, fraction));
  const usedAt = bar.limit > 0 ? Math.min(1, bar.used / bar.limit) : 0;
  const share = (amount: number) => (bar.limit > 0 ? amount / bar.limit : 0);
  const toUsed = Math.abs(at - usedAt);
  const toAverage = bar.averageAt === null ? Infinity : Math.abs(at - bar.averageAt);
  if (toUsed <= snap && toUsed <= toAverage) return { at: usedAt, kind: "used", amount: bar.used, share: share(bar.used) };
  if (toAverage <= snap && bar.averageAt !== null) return { at: bar.averageAt, kind: "average", amount: bar.average, share: share(bar.average) };
  const amount = Math.round((at * bar.limit) / READ_TO) * READ_TO;
  return { at, kind: "point", amount, share: share(amount) };
}

/** A bill's place in the Next due bar, as fractions of the bar's width once its gaps are taken out. */
export interface BarSlot {
  left: number;
  width: number;
}

/** How much of the bar a focused bill (E) takes, at least. */
export const FOCUS_SHARE = 0.55;

/**
 * Each bill's slot in the bar, in order, sized by its amount. With a bill in
 * focus (its index) and more than one bill, it widens to at least FOCUS_SHARE
 * and the rest shrink in proportion. The widths always add up to 1; with
 * nothing to share (every amount 0), the bills split the bar evenly.
 */
export function dueBarLayout(amounts: number[], focus: number | null = null): BarSlot[] {
  const total = amounts.reduce((sum, a) => sum + Math.max(0, a), 0);
  let shares = amounts.map((a) => (total > 0 ? Math.max(0, a) / total : 1 / amounts.length));
  if (focus !== null && focus >= 0 && focus < amounts.length && amounts.length > 1) {
    const own = shares[focus];
    const want = Math.max(own, FOCUS_SHARE);
    const rest = 1 - own;
    shares = shares.map((s, i) => (i === focus ? want : rest > 0 ? (s / rest) * (1 - want) : (1 - want) / (amounts.length - 1)));
  }
  let left = 0;
  return shares.map((width) => {
    const slot = { left, width };
    left += width;
    return slot;
  });
}

/** A bill's dot on the due-date timeline (F). */
export interface TimelineDot {
  /** The dot's centre, in px from the timeline's left. */
  center: number;
  /** Its diameter in px. */
  size: number;
  /** Whether its amount label shows; close neighbours hide theirs so labels never overlap. */
  label: boolean;
}

export interface Timeline {
  /** Days from today to the timeline's right end. */
  span: number;
  dots: TimelineDot[];
}

const DOT_MIN = 14;
const DOT_GROWTH = 14;
const FOCUS_GROWTH = 6;
// Room for a label like "₹38.5k" either side of its dot's centre.
const LABEL_ROOM = 44;
// Keep a dot's centre this far from the ends, so a small dot never hangs off them.
const EDGE = 10;

/**
 * The due-date timeline, `width` px wide: today at the left, and the right end
 * three days past the last due date (at least ten days out). Each bill is a dot
 * at its due date, overdue ones at today, sized by the square root of its
 * amount against the largest, so area follows amount. A focused bill's dot is a
 * little bigger, and its label always shows.
 */
export function dueTimeline(bills: { amount: number; days: number }[], width: number, focus: number | null = null): Timeline {
  const span = Math.max(7, ...bills.map((b) => b.days)) + 3;
  const largest = Math.max(0, ...bills.map((b) => b.amount));
  const dots = bills.map((b, i) => ({
    center: Math.min(Math.max(EDGE, width - EDGE), Math.max(EDGE, (Math.max(0, b.days) / span) * width)),
    size: DOT_MIN + (largest > 0 ? DOT_GROWTH * Math.sqrt(Math.max(0, b.amount) / largest) : 0) + (i === focus ? FOCUS_GROWTH : 0),
    label: false,
  }));
  const order = dots.map((_, i) => i).sort((a, b) => dots[a].center - dots[b].center || a - b);
  let last = -Infinity;
  for (const i of order) {
    const near = focus !== null && i !== focus && Math.abs(dots[i].center - dots[focus].center) < LABEL_ROOM;
    if (i === focus || (!near && dots[i].center - last >= LABEL_ROOM)) {
      dots[i].label = true;
      last = dots[i].center;
    }
  }
  return { span, dots };
}

/** An ISO date `days` after another: "2026-10-20" + 13 → "2026-11-02". */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Where a bill in Next due is in its life (G). entering: just arrived, drawn at
 * no width so it grows in. shown: in the bar. paid: gone from the bills on the
 * same card, so it was paid: green, still in the bar for a moment. leaving:
 * folding away to nothing before it's dropped.
 */
export type Phase = "entering" | "shown" | "paid" | "leaving";

export interface Slot<Bill> {
  bill: Bill;
  phase: Phase;
}

/**
 * The slots for a new set of bills, soonest due first. A bill that was there
 * stays (and one still growing in carries on). One that's new grows in. One
 * that's gone stays in place to fold away: as paid (green) when it's still the
 * same card, plainly when another card was selected. A bill that comes back
 * while folding, as after Undo, is shown again.
 */
export function nextSlots<Bill extends { id: string; dueDate: string }>(previous: Slot<Bill>[], bills: Bill[], sameCard: boolean): Slot<Bill>[] {
  const before = new Map(previous.map((s) => [s.bill.id, s]));
  const now = new Set(bills.map((b) => b.id));
  const slots: Slot<Bill>[] = bills.map((bill) => {
    const was = before.get(bill.id);
    return { bill, phase: !was || was.phase === "entering" ? "entering" : "shown" };
  });
  for (const s of previous) {
    if (now.has(s.bill.id)) continue;
    slots.push({ bill: s.bill, phase: s.phase === "leaving" || s.phase === "entering" || !sameCard ? "leaving" : "paid" });
  }
  // Stable, so bills due the same day keep their order.
  return slots.sort((a, b) => a.bill.dueDate.localeCompare(b.bill.dueDate));
}
