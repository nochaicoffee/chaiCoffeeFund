import { describe, expect, it } from "vitest";
import {
  fillInOrder,
  type GoalsData,
  earmarkProblems,
  earmarksByAccount,
  excessOf,
  expectedProgress,
  fundingOrder,
  fundingPlan,
  fundingUnits,
  hitsEveryDate,
  isFunded,
  leftOf,
  minimumBudget,
  monthsLeft,
  necessitySplit,
  plannedOf,
  progressOf,
  requiredFor,
  requiredMonthly,
  savedOf,
  savedOwn,
  standing,
  targetOf,
  totals,
  unitKey,
  wholeMonthsTo,
  dueOf,
  effectiveDue,
  horizonFor,
  orphanGoals,
  plannedTotal,
} from "./goals";


import { TODAY, goal, sample, set, take } from "./goals.fixture";
const byId = (data: GoalsData, id: string) => data.goals.find((g) => g.id === id)!;

describe("saved, target and the roll-up", () => {
  it("saved is set-asides less take-backs, and a take-back never takes it below 0", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100 })], contributions: [set("a", 30), take("a", 50)] };
    expect(savedOwn(data, "a")).toBe(0);
    // The page never lets a take-back exceed what's saved, so the figure is the net; it just never shows below 0.
    data.contributions.push(set("a", 40));
    expect(savedOwn(data, "a")).toBe(20);
  });

  it("a parent's target and saved are its own part plus its live sub-goals", () => {
    const data = sample();
    const car = byId(data, "car");
    expect(targetOf(data, car)).toBe(150000 + 45000 + 38000 + 52000 + 60000);
    expect(savedOf(data, car)).toBe(21000 + 20000 + 28000 + 7500);
    expect(leftOf(data, car)).toBe(targetOf(data, car) - savedOf(data, car));
  });

  it("a dropped sub-goal leaves the target, and its set-asides leave the saved figure", () => {
    const data = sample();
    const car = byId(data, "car");
    const before = targetOf(data, car);
    expect(before).toBe(345000);
    byId(data, "dash").status = "Active";
    expect(targetOf(data, car)).toBe(before + 9000);
    byId(data, "dash").status = "Dropped";
    expect(targetOf(data, car)).toBe(before);
  });

  it("a bought sub-goal also leaves its parent: its money is spent, not saved", () => {
    const data = sample();
    byId(data, "tyres").status = "Done";
    expect(targetOf(data, byId(data, "car"))).toBe(345000 - 38000);
    expect(savedOf(data, byId(data, "car"))).toBe(21000 + 20000 + 7500);
  });

  it("a parent's figures always equal the sum of the parts", () => {
    const data = sample();
    for (const parent of data.goals.filter((g) => !g.parentId)) {
      const kids = data.goals.filter((g) => g.parentId === parent.id && g.status !== "Dropped" && g.status !== "Done");
      expect(targetOf(data, parent)).toBe(parent.amount + kids.reduce((s, k) => s + k.amount, 0));
      expect(savedOf(data, parent)).toBe(savedOwn(data, parent.id) + kids.reduce((s, k) => s + savedOwn(data, k.id), 0));
    }
  });

  it("the sample adds up to the figures on the design boards", () => {
    const t = totals(sample(), TODAY);
    expect(t.goals).toBe(5);
    expect(t.saved).toBe(314500);
    expect(t.target).toBe(1172800);
  });
});

describe("funded and over-funded", () => {
  const one = (saved: number) => ({ goals: [goal({ id: "a", name: "A", amount: 1000 })], contributions: saved ? [set("a", saved)] : [] });
  it("exactly at target is funded", () => {
    const data = one(1000);
    expect(isFunded(data, data.goals[0])).toBe(true);
    expect(excessOf(data, data.goals[0])).toBe(0);
  });
  it("one rupee short is not", () => {
    const data = one(999);
    expect(isFunded(data, data.goals[0])).toBe(false);
    expect(leftOf(data, data.goals[0])).toBe(1);
  });
  it("over target reports the excess and never a progress above 100%", () => {
    const data = one(1250);
    expect(isFunded(data, data.goals[0])).toBe(true);
    expect(excessOf(data, data.goals[0])).toBe(250);
    expect(progressOf(data, data.goals[0])).toBe(1);
    expect(leftOf(data, data.goals[0])).toBe(0);
  });
  it("a parent with only sub-goals (own part 0) is funded when they are", () => {
    const data: GoalsData = { goals: [goal({ id: "p", name: "P", amount: 0 }), goal({ id: "k", parentId: "p", name: "K", amount: 500 })], contributions: [set("k", 500)] };
    expect(isFunded(data, data.goals[0])).toBe(true);
  });
  it("a goal with no target is never funded", () => {
    const data: GoalsData = { goals: [goal({ id: "p", name: "P", amount: 0 })], contributions: [] };
    expect(isFunded(data, data.goals[0])).toBe(false);
  });
});

describe("months left", () => {
  it("counts whole months, at least 1 while the date is ahead", () => {
    expect(wholeMonthsTo("2026-12-20", TODAY)).toBe(1);
    expect(monthsLeft("2026-12-20", TODAY)).toBe(1);
    expect(monthsLeft("2026-11-05", TODAY)).toBe(1);
    expect(monthsLeft(TODAY, TODAY)).toBe(0);
    expect(monthsLeft("2027-01-29", TODAY)).toBe(3);
    expect(monthsLeft("2027-01-28", TODAY)).toBe(2);
  });
  it("a date that has passed has none left", () => {
    expect(monthsLeft("2026-10-28", TODAY)).toBe(0);
  });
  it("month ends clamp, as Jan 31 + 1 month", () => {
    expect(wholeMonthsTo("2027-02-28", "2027-01-31")).toBe(1);
  });
});

describe("required a month", () => {
  it("is what's left over the months left, rounded up", () => {
    expect(requiredFor(17000, "2026-12-20", TODAY)).toBe(17000);
    expect(requiredFor(10000, "2027-01-29", TODAY)).toBe(3334);
    expect(requiredFor(0, "2027-01-29", TODAY)).toBe(0);
    expect(requiredFor(5000, null, TODAY)).toBe(0);
  });
  it("putting the required amount aside each month reaches the target by the date, and never overshoots by a month's amount", () => {
    for (const [left, date] of [[17000, "2026-12-20"], [38001, "2027-04-15"], [600000, "2029-06-30"], [1, "2027-01-29"], [99999, "2027-02-28"]] as const) {
      const months = monthsLeft(date, TODAY);
      const each = requiredFor(left, date, TODAY);
      expect(each * months).toBeGreaterThanOrEqual(left);
      expect(each * months - left).toBeLessThan(months);
    }
  });
  it("an overdue goal owes everything now, not a negative number", () => {
    expect(requiredFor(17000, "2026-10-20", TODAY)).toBe(17000);
  });
  it("a parent adds its own part and each sub-goal at its own date", () => {
    const data = sample();
    const car = byId(data, "car");
    const own = requiredFor(150000 - 21000, "2028-06-30", TODAY);
    const susp = requiredFor(45000 - 20000, "2027-04-15", TODAY);
    const tyres = requiredFor(38000 - 28000, "2027-01-10", TODAY);
    const alloy = requiredFor(52000 - 7500, "2027-12-31", TODAY);
    const music = requiredFor(60000, "2028-03-31", TODAY);
    expect(requiredMonthly(data, car, TODAY)).toBe(own + susp + tyres + alloy + music);
  });
  it("a Paused sub-goal needs nothing a month", () => {
    const data = sample();
    const before = requiredMonthly(data, byId(data, "car"), TODAY);
    byId(data, "music").status = "Paused";
    expect(requiredMonthly(data, byId(data, "car"), TODAY)).toBe(before - requiredFor(60000, "2028-03-31", TODAY));
  });
});

describe("standing", () => {
  it("reads the sample as the boards do", () => {
    const data = sample();
    const at = (id: string) => standing(data, byId(data, id), TODAY);
    expect(at("car")).toBe("Behind");
    expect(at("ipad")).toBe("Behind");
    expect(at("fridge")).toBe("Behind");
    expect(at("goa")).toBe("Behind");
    expect(at("masters")).toBe("On track");
    expect(at("camera")).toBe("Paused");
    expect(at("phones")).toBe("Done");
    expect(at("dash")).toBe("Dropped");
    expect(at("susp")).toBe("On track");
    expect(at("music")).toBe("No plan");
  });
  it("is Funded when saved reaches target, even if its date has passed", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100, targetDate: "2026-01-01" })], contributions: [set("a", 100)] };
    expect(standing(data, data.goals[0], TODAY)).toBe("Funded");
  });
  it("is Overdue when the date has passed and it isn't funded", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100, targetDate: "2026-10-20", plannedMonthly: 1000 })], contributions: [set("a", 40)] };
    expect(standing(data, data.goals[0], TODAY)).toBe("Overdue");
  });
  it("is Someday with no date, and No plan with a date but nothing planned", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100 }), goal({ id: "b", name: "B", amount: 100, targetDate: "2027-05-01" })], contributions: [] };
    expect(standing(data, data.goals[0], TODAY)).toBe("Someday");
    expect(standing(data, data.goals[1], TODAY)).toBe("No plan");
  });
  it("is On track exactly when planned reaches required", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 12000, targetDate: "2027-10-29", plannedMonthly: 1000 })], contributions: [] };
    expect(standing(data, data.goals[0], TODAY)).toBe("On track");
    data.goals[0].plannedMonthly = 999;
    expect(standing(data, data.goals[0], TODAY)).toBe("Behind");
  });
});

describe("where it should be by now", () => {
  it("is a straight line from the start date to the date", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100, startDate: "2026-10-01", targetDate: "2026-11-30" })], contributions: [] };
    expect(expectedProgress(data, data.goals[0], "2026-10-31")).toBeCloseTo(30 / 60, 5);
    expect(expectedProgress(data, data.goals[0], "2026-09-01")).toBe(0);
    expect(expectedProgress(data, data.goals[0], "2027-01-01")).toBe(1);
  });
  it("is null with no date", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100 })], contributions: [] };
    expect(expectedProgress(data, data.goals[0], TODAY)).toBeNull();
  });
  it("a parent is due when its latest live sub-goal is", () => {
    const data = sample();
    expect(dueOf(data, byId(data, "car"))).toBe("2028-06-30");
    const parent = goal({ id: "p", name: "P", amount: 0 });
    expect(dueOf({ goals: [parent, goal({ id: "x", parentId: "p", name: "X", amount: 1, targetDate: "2027-01-01" }), goal({ id: "y", parentId: "p", name: "Y", amount: 1, targetDate: "2027-05-01" })], contributions: [] }, parent)).toBe("2027-05-01");
  });
});

describe("Need and Want", () => {
  it("splits a parent's target by each part's own label", () => {
    const data = sample();
    expect(necessitySplit(data, byId(data, "car"))).toEqual({ need: 45000 + 38000, want: 345000 - 83000 });
  });
  it("the two always add up to the target", () => {
    const data = sample();
    for (const g of data.goals.filter((x) => !x.parentId && x.status === "Active")) {
      const split = necessitySplit(data, g);
      expect(split.need + split.want).toBe(targetOf(data, g));
    }
  });
});

describe("the funding plan", () => {
  const units = fundingUnits(sample());

  it("has a unit for each piece that still needs money, a parent's own part included", () => {
    expect(units.map((u) => u.name).sort()).toEqual(["Alloy wheels", "Apple Pencil", "Car upgrade", "Goa trip", "Masters course", "Music system", "New fridge", "New tyres", "Suspension", "iPad Pro"]);
    expect(units.find((u) => u.id === "car")?.own).toBe(true);
  });

  it("serves Fixed dates, then Needs, then the soonest, then the smaller", () => {
    const order = fundingOrder(units).map((u) => u.id);
    expect(order.slice(0, 2)).toEqual(["fridge", "tyres"]);
    expect(order.indexOf("susp")).toBe(2);
    expect(order.at(-1)).toBe("masters");
  });

  it("is the same whatever order the goals were entered in", () => {
    const shuffled = [...sample().goals].reverse();
    const again = fundingUnits({ goals: shuffled, contributions: sample().contributions });
    const a = fundingPlan(units, 40000, TODAY);
    const b = fundingPlan(again, 40000, TODAY);
    expect(b.order.map(unitKey)).toEqual(a.order.map(unitKey));
    expect(b.done).toEqual(a.done);
  });

  it("never gives more than the budget in a month, nor anything to a unit once it's funded", () => {
    const plan = fundingPlan(units, 30000, TODAY);
    const funded: Record<string, number> = {};
    for (const month of plan.months) {
      expect(month.spent).toBeLessThanOrEqual(30000);
      expect(Object.values(month.give).reduce((s, v) => s + v, 0)).toBe(month.spent);
      for (const [key, amount] of Object.entries(month.give)) {
        expect(amount).toBeGreaterThan(0);
        funded[key] = (funded[key] ?? 0) + amount;
      }
    }
    for (const unit of plan.order) expect(funded[unitKey(unit)] ?? 0).toBeLessThanOrEqual(unit.left);
  });

  it("accounts for every rupee: given plus what's still left is what was needed", () => {
    for (const budget of [5000, 27000, 90000]) {
      const plan = fundingPlan(units, budget, TODAY);
      const given = plan.months.reduce((s, m) => s + m.spent, 0);
      const stillLeft = Object.values(plan.left).reduce((s, v) => s + v, 0);
      expect(given + stillLeft).toBe(units.reduce((s, u) => s + u.left, 0));
    }
  });

  it("with a big enough budget everything is funded in the first month", () => {
    const plan = fundingPlan(units, 10_000_000, TODAY);
    expect(plan.months).toHaveLength(1);
    expect(Object.values(plan.left).every((v) => v === 0)).toBe(true);
  });

  it("the sample needs ₹27,000 a month to hit every date, and ₹26,500 does not", () => {
    expect(minimumBudget(units, TODAY)).toBe(27000);
    expect(hitsEveryDate(fundingPlan(units, 27000, TODAY), TODAY)).toBe(true);
    expect(hitsEveryDate(fundingPlan(units, 26500, TODAY), TODAY)).toBe(false);
  });

  it("is smaller than paying each piece evenly on its own schedule", () => {
    const t = totals(sample(), TODAY);
    expect(t.requiredTotal).toBe(73690);
    expect(t.minimumMonthly).toBe(27000);
    expect(t.minimumMonthly!).toBeLessThan(t.requiredTotal);
  });

  it("an overdue unit makes the dates impossible to hit, and says so with null", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 100, targetDate: "2026-10-01" })], contributions: [] };
    expect(minimumBudget(fundingUnits(data), TODAY)).toBeNull();
  });

  it("nothing to fund needs nothing", () => {
    expect(minimumBudget([], TODAY)).toBe(0);
  });
});

describe("totals", () => {
  it("reads the sample", () => {
    const t = totals(sample(), TODAY);
    expect(t.plannedTotal).toBe(65000);
    expect(t.next?.id).toBe("fridge");
  });
  it("a paused goal and a paused parent's sub-goals aren't planned for", () => {
    const data = sample();
    byId(data, "car").status = "Paused";
    expect(totals(data, TODAY).plannedTotal).toBe(65000 - 4000 - 5000 - 5000 - 3500);
  });
  it("has no next date with no goals", () => {
    expect(totals({ goals: [], contributions: [] }, TODAY).next).toBeNull();
  });
  it("the planned figure of a goal and its sub-goals", () => {
    const data = sample();
    expect(plannedOf(data, byId(data, "car"))).toBe(4000 + 5000 + 5000 + 3500);
  });
});

describe("earmarks", () => {
  const live = (...goalIds: string[]): GoalsData => ({ goals: goalIds.map((id) => goal({ id, name: id, amount: 1000 })), contributions: [] });
  it("adds set-asides and takes back take-backs per account, and ignores ones with no account", () => {
    const data = live("a");
    data.contributions = [set("a", 100, "2026-09-01", { accountId: "x" }), set("a", 50, "2026-09-02", { accountId: "x" }), take("a", 30), { ...take("a", 20), accountId: "x" }, set("a", 999)];
    expect(earmarksByAccount(data)).toEqual({ x: 130 });
  });
  it("a bought or dropped goal holds nothing, and a paused one still does", () => {
    const data = live("a", "b", "c");
    data.goals[1].status = "Done";
    data.goals[1].doneOn = TODAY;
    data.goals[2].status = "Paused";
    data.contributions = [set("a", 100, "2026-09-01", { accountId: "x" }), set("b", 700, "2026-09-01", { accountId: "x" }), set("c", 50, "2026-09-01", { accountId: "x" })];
    expect(earmarksByAccount(data)).toEqual({ x: 150 });
    data.goals[1].status = "Active";
    data.goals[1].doneOn = undefined;
    expect(earmarksByAccount(data)).toEqual({ x: 850 });
  });
  it("flags only accounts whose earmarks pass their balance, biggest first", () => {
    const problems = earmarkProblems({ a: 100, b: 500, c: 300, d: 10 }, { a: 100, b: 400, c: 100 });
    expect(problems.map((p) => [p.accountId, p.over])).toEqual([["c", 200], ["b", 100]]);
  });
  it("doesn't flag an account whose balance isn't known", () => {
    expect(earmarkProblems({ a: 100 }, {})).toEqual([]);
  });
  it("the sample's HDFC earmarks are the tyres and the fridge", () => {
    expect(earmarksByAccount(sample())["demo-hdfc"]).toBe(28000 + 45000);
  });
  it("the sample's ICICI earmarks leave out the bought headphones", () => {
    expect(earmarksByAccount(sample())["demo-icici"]).toBe(36000 + 130000);
  });
});

describe("review findings", () => {
  it("a parent is due on the latest of its own date and its sub-goals'", () => {
    const parent = goal({ id: "p", name: "P", amount: 100, targetDate: "2027-06-01" });
    const early = goal({ id: "a", parentId: "p", name: "A", amount: 1, targetDate: "2027-01-01" });
    const late = goal({ id: "b", parentId: "p", name: "B", amount: 1, targetDate: "2028-03-01" });
    const data: GoalsData = { goals: [parent, early, late], contributions: [] };
    expect(dueOf(data, parent)).toBe("2028-03-01");
    late.status = "Dropped";
    expect(dueOf(data, parent)).toBe("2027-06-01");
  });
  it("a sub-goal with no date reads as its parent's: due, standing and what it needs a month agree", () => {
    const data = sample();
    const kid = goal({ id: "k", parentId: "fridge", name: "Cover", amount: 3000, plannedMonthly: 100 });
    data.goals.push(kid);
    expect(effectiveDue(data, kid)).toBe("2026-12-20");
    expect(standing(data, kid, TODAY)).toBe("Behind");
    expect(requiredMonthly(data, kid, TODAY)).toBe(3000);
  });
  it("a goal five years out can be funded on schedule: the plan runs long enough, and the minimum is its schedule, not the whole sum", () => {
    const data: GoalsData = { goals: [goal({ id: "r", name: "Retirement", amount: 720000, targetDate: "2032-10-29", plannedMonthly: 10000 })], contributions: [] };
    const units = fundingUnits(data);
    expect(horizonFor(units, TODAY)).toBeGreaterThanOrEqual(74);
    expect(minimumBudget(units, TODAY)).toBe(10000);
    expect(hitsEveryDate(fundingPlan(units, 10000, TODAY), TODAY)).toBe(true);
  });
  it("counts whole months by arithmetic, month ends included, and fast for a far date", () => {
    expect(wholeMonthsTo("2027-01-31", "2026-10-31")).toBe(3);
    expect(wholeMonthsTo("2027-02-27", "2027-01-31")).toBe(0);
    expect(wholeMonthsTo("2027-02-28", "2027-01-31")).toBe(1);
    expect(wholeMonthsTo("2027-03-30", "2027-01-31")).toBe(1);
    expect(wholeMonthsTo("2027-03-31", "2027-01-31")).toBe(2);
    expect(wholeMonthsTo("9999-12-31", "2026-10-29")).toBe((9999 - 2026) * 12 + 2);
  });
  it("finds a sub-goal whose parent has gone", () => {
    const data: GoalsData = { goals: [goal({ id: "a", name: "A", amount: 1 }), goal({ id: "k", parentId: "gone", name: "K", amount: 1 })], contributions: [] };
    expect(orphanGoals(data).map((g) => g.id)).toEqual(["k"]);
    expect(orphanGoals(sample())).toEqual([]);
  });
  it("plannedTotal skips a sub-goal under a paused parent", () => {
    const data = sample();
    expect(plannedTotal(data)).toBe(65000);
    byId(data, "car").status = "Paused";
    expect(plannedTotal(data)).toBe(65000 - 4000 - 5000 - 5000 - 3500);
  });
});

describe("filling a goal's parts from its pot", () => {
  const parts = [
    { id: "alloy", amount: 52000, saved: 0, necessity: "Want" as const, due: "2027-12-31" },
    { id: "susp", amount: 45000, saved: 0, necessity: "Need" as const, due: "2027-04-15" },
    { id: "tyres", amount: 38000, saved: 0, necessity: "Need" as const, due: "2027-01-10" },
    { id: "music", amount: 60000, saved: 0, necessity: "Want" as const, due: "2028-03-31" },
  ];
  it("serves Needs first, then the soonest, however the parts were entered", () => {
    expect(fillInOrder(parts, 200000)).toEqual({ tyres: 38000, susp: 45000, alloy: 52000, music: 60000 });
    expect(fillInOrder(parts, 50000)).toEqual({ tyres: 38000, susp: 12000 });
  });
  it("gives each part only what it still lacks, and keeps what nothing can take", () => {
    expect(fillInOrder(parts.map((p) => (p.id === "tyres" ? { ...p, saved: 30000 } : p)), 10000)).toEqual({ tyres: 8000, susp: 2000 });
    expect(fillInOrder(parts, 1_000_000)).toEqual({ tyres: 38000, susp: 45000, alloy: 52000, music: 60000 });
    expect(fillInOrder(parts, 0)).toEqual({});
  });
  it("a Fixed date comes before a Need", () => {
    const fixed = parts.map((p) => (p.id === "music" ? { ...p, dateType: "Fixed" as const } : p));
    expect(fillInOrder(fixed, 70000)).toEqual({ music: 60000, tyres: 10000 });
  });
});
