import { describe, expect, it } from "vitest";
import { demoGoalsData } from "@/lib/demo/goalsDemo";
import { affordView, comingUpView, finishedView, goalsWidgets, monthView, needsWantsView, setAsidesView, stairView, tableRows } from "./widgetsView";

const TODAY = "2026-10-29";
const sample = (variant = "") => demoGoalsData(TODAY, variant);
const rupees = (text: string) => Number(text.replace(/[^\d]/g, ""));

describe("the goals table", () => {
  const rows = tableRows(sample(), TODAY);
  it("lists main goals only, with their parts inside, the settled ones last", () => {
    expect(rows.map((r) => r.id)).toEqual(["car", "ipad", "fridge", "goa", "masters", "camera", "phones"]);
    expect(rows.find((r) => r.id === "car")!.parts.map((p) => [p.n, p.name])).toEqual([[1, "New tyres"], [2, "Suspension"], [3, "Alloy wheels"], [4, "Music system"], [5, "Car upgrade · the rest"]]);
    expect(rows.find((r) => r.id === "ipad")!.parts.map((p) => p.name)).toEqual(["Apple Pencil", "iPad Pro · the rest"]);
    expect(rows.find((r) => r.id === "fridge")!.parts).toEqual([]);
  });
  it("a part with no date reads its goal's: its due date, its tick and its standing agree", () => {
    const data = sample();
    data.goals.find((g) => g.id === "music")!.targetDate = undefined;
    const music = tableRows(data, TODAY).find((r) => r.id === "car")!.parts.find((p) => p.name === "Music system")!;
    expect(music.due).toBe("2028-06-30");
    expect(music.expected).not.toBeNull();
    expect(music.standing).toBe("No plan");
  });
  it("a bought goal shows what it cost and how far under, and a dropped one says it's released and keeps no parts", () => {
    expect(rows.find((r) => r.id === "phones")).toMatchObject({ standing: "Done", off: true, settled: "paid Sep 12 · ₹1,501 under" });
    const data = sample();
    data.goals.find((g) => g.id === "car")!.status = "Dropped";
    expect(tableRows(data, TODAY).find((r) => r.id === "car")).toMatchObject({ standing: "Dropped", settled: "released", parts: [] });
  });
  it("a goal's saved and target are the sums of its parts, and a part's are its own", () => {
    const car = rows.find((r) => r.id === "car")!;
    expect(car).toMatchObject({ target: "₹3,45,000", progress: 76500 / 345000 });
    expect(car.parts.find((p) => p.goalId === "susp")).toMatchObject({ amount: 45000, progress: 20000 / 45000, covered: false });
  });
  it("with the pot given out by hand, the parts it covered read covered and the main goal holds the whole pot", () => {
    const car = tableRows(sample("pot"), TODAY).find((r) => r.id === "car")!;
    expect(car.parts.map((p) => p.covered)).toEqual([true, true, true, true, false]);
    expect(car).toMatchObject({ target: "₹3,45,000", progress: 200000 / 345000 });
  });
});

describe("this month", () => {
  it("what's done counts up to the plan and no further, and the extra is shown apart", () => {
    const data = sample();
    data.contributions.push({ id: "x", goalId: "fridge", date: "2026-10-20", amount: 20000, kind: "Set-aside" });
    const month = monthView(data, TODAY);
    const fridge = month.rows.find((r) => r.key === "fridge")!;
    // ₹15,000 went in on Oct 5 already, so this makes ₹35,000 against a plan of ₹15,000.
    expect(fridge).toMatchObject({ planned: 15000, done: 35000, state: "extra", stateText: "₹20,000 extra", remaining: 0 });
    expect(month.counted).toBe(month.rows.reduce((s, r) => s + Math.min(r.done, r.planned), 0));
    // The fridge's ₹20,000, and the iPad and the Pencil each went over their plan by ₹1,000 and ₹1,500.
    expect(month.extra).toBe(22500);
    expect(month.planned).toBe(65000);
  });
  it("counts the days left, and each row still to do offers what's left of its plan", () => {
    const month = monthView(sample(), TODAY);
    expect(month.daysLeft).toBe(3);
    expect(month.todoCount).toBe(month.rows.filter((r) => r.done < r.planned).length);
    for (const r of month.rows) expect(r.remaining).toBe(Math.max(0, r.planned - r.done));
  });
});

describe("what your money allows", () => {
  it("reads income less obligations and the funding figures", () => {
    const view = affordView(sample(), TODAY);
    expect(view).toMatchObject({ income: "₹1,38,500", obligations: "₹71,000", left: "₹67,500", planned: 65000, required: 73690, minimum: 27000, leftAmount: 67500 });
    expect(view.note).toBe("₹65,000 planned is 96% of what's left. Funded in order, ₹27,000 is enough.");
  });
});

describe("the staircase", () => {
  it("steps up by what's left on each date, to the total still to set aside", () => {
    const view = stairView(sample(), TODAY)!;
    expect(view.total).toBe(858300);
    expect(view.steps.at(-1)!.run).toBe(858300);
    expect(view.steps.map((s) => s.month)).toEqual([...view.steps.map((s) => s.month)].sort((a, b) => a - b));
    expect(view.planned).toBe(65000);
    expect(view.minimumBudget).toBe(27000);
    expect(view.minimum.at(-1)!.cum).toBeGreaterThan(0);
  });
  it("runs long enough for a goal five years out, with labels to match", () => {
    const data = sample("one");
    data.goals[0].targetDate = "2031-10-29";
    const view = stairView(data, TODAY)!;
    expect(view.months).toBeGreaterThanOrEqual(60);
    expect(view.steps[0].month).toBe(60);
    expect(view.labels.at(-1)!.month).toBeGreaterThanOrEqual(54);
  });
  it("has no staircase with nothing dated still to save", () => {
    expect(stairView(sample("empty"), TODAY)).toBeNull();
    expect(stairView(sample("funded"), TODAY)).toBeNull();
  });
});

describe("needs and wants", () => {
  it("splits what's to be saved by why and how long, and adds up", () => {
    const v = needsWantsView(sample());
    expect(v.total).toBe(1172800);
    expect(v.need + v.want).toBe(v.total);
    expect(v.minor + v.major).toBe(v.total);
    expect(v.need).toBe(62000 + 45000 + 38000);
    expect(v.major).toBe(345000 + 600000);
    expect(v.categories.reduce((s, c) => s + c.amount, 0)).toBe(v.total);
    expect(v.categories[0].category).toBe("Education");
  });
});

describe("the other cards", () => {
  it("Coming up is the next dates, soonest first, and marks a Fixed date short of its plan", () => {
    const rows = comingUpView(sample(), TODAY);
    expect(rows.map((r) => r.key)).toEqual(["fridge", "tyres", "pencil", "ipad#own", "susp"]);
    expect(rows[0]).toMatchObject({ fixed: true, risk: true, date: "Dec 20" });
    expect(rows[1].risk).toBe(false);
  });
  it("Set aside lately is the latest entries, a take-back in red with its note", () => {
    const rows = setAsidesView(sample(), TODAY, 30);
    expect(rows[0].date).toBe("Oct 5");
    const take = rows.find((r) => r.take)!;
    expect(take).toMatchObject({ amount: "−₹4,000", note: "Dropped; back to the car pot" });
  });
  it("Finished sets what a bought goal cost against its estimate", () => {
    expect(finishedView(sample())).toEqual([expect.objectContaining({ name: "Noise-cancelling headphones", cost: "₹26,499", estimate: "of ₹28,000", verdict: "Came in ₹1,501 under the estimate", under: true })]);
  });
  it("everything together builds, and an empty page builds with nothing in it", () => {
    expect(Object.keys(goalsWidgets(sample(), TODAY)).sort()).toEqual(["afford", "comingUp", "finished", "month", "needsWants", "setAsides", "stair", "table"]);
    const empty = goalsWidgets(sample("empty"), TODAY);
    expect(empty).toMatchObject({ table: [], comingUp: [], setAsides: [], finished: [], stair: null });
    expect(rupees(empty.afford.income)).toBe(138500);
  });
});
