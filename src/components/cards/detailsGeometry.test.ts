import { describe, expect, it } from "vitest";
import { addDays, dueBarLayout, dueTimeline, FOCUS_SHARE, nextSlots, readLimitAt, type Slot } from "./detailsGeometry";

const bar = { limit: 1_000_000, used: 80_000, average: 400_000, averageAt: 0.4 };

describe("readLimitAt", () => {
  it("reads the amount at a point, to the nearest ₹1,000", () => {
    expect(readLimitAt(0.2534, bar, 0.01)).toEqual({ at: 0.2534, kind: "point", amount: 253_000, share: 0.253 });
  });

  it("snaps to the fill's end and to the average's pill", () => {
    expect(readLimitAt(0.085, bar, 0.01)).toEqual({ at: 0.08, kind: "used", amount: 80_000, share: 0.08 });
    expect(readLimitAt(0.395, bar, 0.01)).toEqual({ at: 0.4, kind: "average", amount: 400_000, share: 0.4 });
  });

  it("picks the nearer snap when both are in reach", () => {
    const close = { ...bar, averageAt: 0.1 };
    expect(readLimitAt(0.084, close, 0.05).kind).toBe("used");
    expect(readLimitAt(0.096, close, 0.05).kind).toBe("average");
  });

  it("keeps the readout on the bar, and snaps to the pill where the pill is drawn, not where the average falls", () => {
    expect(readLimitAt(-0.3, bar, 0.01)).toMatchObject({ at: 0, amount: 0 });
    expect(readLimitAt(1.4, bar, 0.01)).toMatchObject({ at: 1, amount: 1_000_000 });
    // The pill is kept off the bar's ends (8%), so a small average snaps at 8% but still reads its own amount.
    expect(readLimitAt(0.081, { ...bar, used: 500_000, average: 20_000, averageAt: 0.08 }, 0.01)).toEqual({ at: 0.08, kind: "average", amount: 20_000, share: 0.02 });
  });

  it("puts the fill's end at the bar's end when more than the limit is used, and never snaps to a hidden pill", () => {
    expect(readLimitAt(0.995, { ...bar, used: 1_200_000 }, 0.01)).toMatchObject({ at: 1, kind: "used", amount: 1_200_000 });
    expect(readLimitAt(0.4, { ...bar, averageAt: null }, 0.01).kind).toBe("point");
  });
});

describe("dueBarLayout", () => {
  const sum = (slots: { width: number }[]) => slots.reduce((s, x) => s + x.width, 0);

  it("sizes bills by amount, left to right, filling the bar", () => {
    const slots = dueBarLayout([10, 30, 60]);
    expect(slots.map((s) => s.width)).toEqual([0.1, 0.3, 0.6]);
    expect(slots.map((s) => s.left)).toEqual([0, 0.1, 0.4]);
    expect(sum(slots)).toBeCloseTo(1);
  });

  it("widens a focused bill to at least FOCUS_SHARE, and shrinks the rest in proportion", () => {
    const slots = dueBarLayout([10, 30, 60], 0);
    expect(slots[0].width).toBeCloseTo(FOCUS_SHARE);
    expect(slots[1].width / slots[2].width).toBeCloseTo(30 / 60);
    expect(sum(slots)).toBeCloseTo(1);
    expect(slots[1].left).toBeCloseTo(FOCUS_SHARE);
  });

  it("leaves a bill already wider than FOCUS_SHARE as it is", () => {
    const focused = dueBarLayout([10, 30, 60], 2);
    [0.1, 0.3, 0.6].forEach((width, i) => expect(focused[i].width).toBeCloseTo(width));
  });

  it("gives one bill the whole bar, focused or not, and splits ₹0 bills evenly", () => {
    expect(dueBarLayout([500], 0)).toEqual([{ left: 0, width: 1 }]);
    expect(dueBarLayout([0, 0]).map((s) => s.width)).toEqual([0.5, 0.5]);
  });

  it("ignores a focus that isn't one of the bills", () => {
    expect(dueBarLayout([10, 30], 5)).toEqual(dueBarLayout([10, 30]));
  });
});

describe("dueTimeline", () => {
  it("runs from today to three days past the last bill, at least ten days out", () => {
    expect(dueTimeline([{ amount: 100, days: 15 }], 600).span).toBe(18);
    expect(dueTimeline([{ amount: 100, days: 2 }], 600).span).toBe(10);
  });

  it("places each dot at its due date, overdue ones at today, kept off the ends", () => {
    const { dots } = dueTimeline([{ amount: 100, days: 9 }, { amount: 100, days: -4 }, { amount: 100, days: 12 }], 600);
    expect(dots[0].center).toBeCloseTo((9 / 15) * 600);
    expect(dots[1].center).toBe(10);
    expect(dots[2].center).toBeCloseTo((12 / 15) * 600);
  });

  it("sizes dots so their area follows the amount, and grows a focused one", () => {
    const { dots } = dueTimeline([{ amount: 400, days: 3 }, { amount: 100, days: 9 }], 600);
    expect(dots[0].size).toBe(28);
    expect(dots[1].size).toBe(21);
    expect(dueTimeline([{ amount: 400, days: 3 }, { amount: 100, days: 9 }], 600, 1).dots[1].size).toBe(27);
  });

  it("hides a label that would overlap the one before it, unless its bill is in focus", () => {
    const bills = [{ amount: 100, days: 13 }, { amount: 100, days: 15 }, { amount: 100, days: 18 }];
    // 21 days over 360px: the dots sit at 223, 257 and 309px.
    expect(dueTimeline(bills, 360).dots.map((d) => d.label)).toEqual([true, false, true]);
    expect(dueTimeline(bills, 360, 1).dots.map((d) => d.label)).toEqual([false, true, true]);
  });
});

describe("addDays", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-20", 13)).toBe("2026-11-02");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("nextSlots", () => {
  const bill = (id: string, dueDate: string) => ({ id, dueDate });
  const amazon = bill("amazon", "2026-10-22");
  const flipkart = bill("flipkart", "2026-11-02");
  const regalia = bill("regalia", "2026-11-04");
  const shown = (...bills: { id: string; dueDate: string }[]): Slot<{ id: string; dueDate: string }>[] => bills.map((b) => ({ bill: b, phase: "shown" }));
  const phases = (slots: Slot<{ id: string; dueDate: string }>[]) => slots.map((s) => `${s.bill.id}:${s.phase}`);

  it("keeps a paid bill in its place, green, when it's gone on the same card", () => {
    expect(phases(nextSlots(shown(amazon, flipkart, regalia), [flipkart, regalia], true))).toEqual(["amazon:paid", "flipkart:shown", "regalia:shown"]);
  });

  it("folds bills away plainly when another card was selected, and keeps one both views share", () => {
    expect(phases(nextSlots(shown(amazon, flipkart, regalia), [regalia], false))).toEqual(["amazon:leaving", "flipkart:leaving", "regalia:shown"]);
  });

  it("grows in a new bill, and shows again one that comes back while folding, as after Undo", () => {
    const paid = nextSlots(shown(amazon, regalia), [regalia], true);
    expect(phases(nextSlots(paid, [amazon, regalia], true))).toEqual(["amazon:shown", "regalia:shown"]);
    expect(phases(nextSlots(shown(regalia), [flipkart, regalia], true))).toEqual(["flipkart:entering", "regalia:shown"]);
  });

  it("never turns a bill green that was still growing in or already folding", () => {
    const slots: Slot<{ id: string; dueDate: string }>[] = [
      { bill: amazon, phase: "entering" },
      { bill: flipkart, phase: "leaving" },
      { bill: regalia, phase: "shown" },
    ];
    expect(phases(nextSlots(slots, [regalia], true))).toEqual(["amazon:leaving", "flipkart:leaving", "regalia:shown"]);
  });
});
