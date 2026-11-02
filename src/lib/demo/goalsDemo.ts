import type { GoalsPageData } from "@/app/goals/views";
import { daysBetween } from "../aggregate/cardSpend";
import { addDays } from "../aggregate/subscriptionRenewals";
import type { Goal, GoalContribution } from "../sheets/types";

/**
 * Sample goals from the final design (design/goals/, GoalsFinal), for previewing the Goals page in development with `/goals?demo`
 * before any real goals are entered: a car upgrade with four live parts and one dropped, an iPad Pro with a part, a
 * Fixed-date fridge, a trip, a long-term course, a paused camera and a finished pair of headphones. Every goal, amount and date is
 * made up. The sample is dated as of 2026-10-29 and every date is moved by however many days `today` is from that, so the page reads
 * the same on any day. Never used in production (isDemoAllowed in cardsDemo.ts), and never written to the Sheet.
 *
 * `?demo=empty` has no goals, `?demo=one` only the fridge, `?demo=funded` every goal funded, `?demo=overdue` the fridge's Fixed date
 * 9 days gone, `?demo=over` the fridge with ₹3,100 more set aside than it needs, and `?demo=earmark` an account holding less than
 * goals have earmarked in it. `?demo=pot` is the car with ₹2,00,000 set aside on it and given to its parts by hand: tyres, suspension, alloy
 * wheels and the music system covered, ₹5,000 left over for the rest of the car (Prathik's own example).
 */
export const DEMO_VARIANTS = ["", "empty", "one", "funded", "overdue", "over", "earmark", "pot"] as const;
export type DemoVariant = (typeof DEMO_VARIANTS)[number];

const SAMPLE_TODAY = "2026-10-29";

const g = (o: Partial<Goal> & Pick<Goal, "id" | "name" | "category" | "necessity" | "scale" | "amount" | "startDate">): Goal => ({ status: "Active", ...o });

const GOALS: Goal[] = [
  g({ id: "car", name: "Car upgrade", category: "Vehicle", necessity: "Want", scale: "Major", amount: 150000, targetDate: "2028-06-30", startDate: "2026-03-01", plannedMonthly: 4000 }),
  g({ id: "susp", parentId: "car", name: "Suspension", category: "Vehicle", necessity: "Need", scale: "Minor", amount: 45000, targetDate: "2027-04-15", startDate: "2026-03-01", plannedMonthly: 5000 }),
  g({ id: "tyres", parentId: "car", name: "New tyres", category: "Vehicle", necessity: "Need", scale: "Minor", amount: 38000, targetDate: "2027-01-10", startDate: "2026-03-01", plannedMonthly: 5000 }),
  g({ id: "alloy", parentId: "car", name: "Alloy wheels", category: "Vehicle", necessity: "Want", scale: "Minor", amount: 52000, targetDate: "2027-12-31", startDate: "2026-06-01", plannedMonthly: 3500 }),
  g({ id: "music", parentId: "car", name: "Music system", category: "Vehicle", necessity: "Want", scale: "Minor", amount: 60000, targetDate: "2028-03-31", startDate: "2026-10-01" }),
  g({ id: "dash", parentId: "car", name: "Dashcam", category: "Vehicle", necessity: "Want", scale: "Minor", amount: 9000, targetDate: "2026-12-31", startDate: "2026-05-01", status: "Dropped" }),
  g({ id: "ipad", name: "iPad Pro", category: "Gadget", necessity: "Want", scale: "Minor", amount: 68900, targetDate: "2027-02-28", startDate: "2026-07-01", plannedMonthly: 8000 }),
  g({ id: "pencil", parentId: "ipad", name: "Apple Pencil", category: "Gadget", necessity: "Want", scale: "Minor", amount: 11900, targetDate: "2027-02-28", startDate: "2026-09-01", plannedMonthly: 1500 }),
  g({ id: "fridge", name: "New fridge", category: "Appliance", necessity: "Need", scale: "Minor", amount: 62000, targetDate: "2026-12-20", dateType: "Fixed", startDate: "2026-08-15", plannedMonthly: 15000 }),
  g({ id: "goa", name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: 85000, targetDate: "2027-06-10", startDate: "2026-08-01", plannedMonthly: 8000 }),
  g({ id: "masters", name: "Masters course", category: "Education", necessity: "Want", scale: "Major", amount: 600000, targetDate: "2029-06-30", startDate: "2026-01-01", plannedMonthly: 15000 }),
  g({ id: "camera", name: "Mirrorless camera", category: "Gadget", necessity: "Want", scale: "Minor", amount: 75000, startDate: "2026-04-01", status: "Paused" }),
  g({ id: "phones", name: "Noise-cancelling headphones", category: "Gadget", necessity: "Want", scale: "Minor", amount: 28000, targetDate: "2026-09-30", startDate: "2026-06-01", status: "Done", doneOn: "2026-09-12", actualCost: 26499, paidFromCardId: "demo-card" }),
];

let n = 0;
const entry = (goalId: string, date: string, amount: number, extra: Partial<GoalContribution> = {}): GoalContribution => ({ id: `demo-c${++n}`, goalId, date, amount, kind: "Set-aside", ...extra });
/** `count` set-asides of `each`, one a month from `from` (a month, "2026-03"), on the 5th. */
const monthly = (goalId: string, from: string, count: number, each: number, extra: Partial<GoalContribution> = {}) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1 + i, 5));
    return entry(goalId, d.toISOString().slice(0, 10), each, extra);
  });

/** The car's pot gives a part its share: the same two entries the Edit form writes. */
const give = (partId: string, amount: number): GoalContribution[] => [
  entry("car", "2026-10-20", amount, { kind: "Take-back", note: `Given to ${GOALS.find((x) => x.id === partId)?.name}` }),
  entry(partId, "2026-10-20", amount, { note: "From the pot of Car upgrade" }),
];

const contributions = (): GoalContribution[] => [
  ...monthly("car", "2026-03", 7, 3000),
  ...monthly("susp", "2026-03", 4, 5000),
  ...monthly("tyres", "2026-03", 7, 4000, { accountId: "demo-hdfc" }),
  ...monthly("alloy", "2026-06", 3, 2500),
  ...monthly("dash", "2026-05", 2, 2000),
  entry("dash", "2026-08-14", 4000, { kind: "Take-back", note: "Dropped; back to the car pot" }),
  ...monthly("ipad", "2026-07", 4, 9000, { accountId: "demo-icici" }),
  ...monthly("pencil", "2026-09", 2, 3000),
  ...monthly("fridge", "2026-08", 3, 15000, { accountId: "demo-hdfc" }),
  ...monthly("goa", "2026-08", 3, 7000),
  ...monthly("masters", "2026-01", 10, 13000, { accountId: "demo-icici" }),
  ...monthly("camera", "2026-04", 3, 4000),
  ...monthly("phones", "2026-06", 4, 7000),
];

/** The demo page's data, dated from `today`, for a variant. */
export function demoGoalsData(today: string, variant: DemoVariant | string = ""): GoalsPageData {
  const delta = daysBetween(SAMPLE_TODAY, today);
  const shift = (date: string | undefined) => (date ? addDays(date, delta) : date);
  let goals = GOALS.map((goal) => ({ ...goal, targetDate: shift(goal.targetDate), startDate: shift(goal.startDate) as string, doneOn: shift(goal.doneOn) }));
  let entries = contributions().map((c) => ({ ...c, date: shift(c.date) as string }));
  if (variant === "empty") {
    goals = [];
    entries = [];
  } else if (variant === "one") {
    goals = goals.filter((goal) => goal.id === "fridge");
    entries = entries.filter((c) => c.goalId === "fridge");
  } else if (variant === "funded") {
    const have = (id: string) => entries.filter((c) => c.goalId === id).reduce((s, c) => s + (c.kind === "Set-aside" ? c.amount : -c.amount), 0);
    for (const goal of goals.filter((x) => x.status === "Active")) if (have(goal.id) < goal.amount) entries.push(entry(goal.id, today, goal.amount - have(goal.id)));
  } else if (variant === "overdue") {
    goals = goals.map((goal) => (goal.id === "fridge" ? { ...goal, targetDate: addDays(today, -9) } : goal));
  } else if (variant === "over") {
    entries.push(entry("fridge", today, 62000 - 45000 + 3100));
  } else if (variant === "pot") {
    const car = new Set(["car", "susp", "tyres", "alloy", "music", "dash"]);
    const pot = [...monthly("car", "2026-03", 8, 25000), ...give("tyres", 38000), ...give("susp", 45000), ...give("alloy", 52000), ...give("music", 60000)];
    entries = [...entries.filter((c) => !car.has(c.goalId)), ...pot.map((c) => ({ ...c, date: shift(c.date) as string }))];
  }
  return {
    goals,
    contributions: entries,
    accounts: [
      { id: "demo-hdfc", name: "HDFC Salary" },
      { id: "demo-icici", name: "ICICI Invest" },
    ],
    cards: [{ id: "demo-card", name: "HDFC Regalia", color: "ruby" }],
    balances: { "demo-hdfc": 182400, "demo-icici": variant === "earmark" ? 150000 : 260000 },
    income: 138500,
    obligations: 71000,
  };
}
