import type { InsuranceData } from "@/app/insurance/views";
import { addMonthsUTC } from "../aggregate/recurring";
import { addDays } from "../aggregate/subscriptionRenewals";
import type { Policy, PolicyPayment } from "../sheets/types";

/**
 * Sample policies from the final design (design/insurance/), for previewing the Insurance page in development with
 * `/insurance?demo` before any real policies are entered. The policies are the design's: a health plan and a bike policy each
 * paid once for three years, an accident cover, a car policy, and a home loan with nothing insuring it. Every term is dated
 * from `today`, so the page reads the same on any day. Policy numbers are not stored. Never used in production (isDemoAllowed in
 * cardsDemo.ts), and never written to the Sheet.
 *
 * `?demo=soon` has the accident cover renewing in 12 days, `?demo=lapsed` has the car policy lapsed 9 days ago, and
 * `?demo=empty` has no policies at all.
 */
export type DemoVariant = "" | "soon" | "lapsed" | "empty";

const POLICIES: Policy[] = [
  { id: "demo-health", name: "Lifetime Health", kind: "Health", insurer: "ManipalCigna", covers: "You", sumInsured: 5000000, status: "Active", color: "Teal", addOns: "Health 360 Shield, Health 360 OPD, Cumulative bonus 15%" },
  { id: "demo-accident", name: "Owner-driver cover", kind: "Accident", insurer: "Digit", covers: "You", sumInsured: 1500000, status: "Active", color: "Violet" },
  { id: "demo-car", name: "Comprehensive Platinum", kind: "Motor", insurer: "Acko", covers: "Car", coversDetail: "Honda City", sumInsured: 442000, status: "Active", color: "Copper", addOns: "Consumables, Rat bite" },
  { id: "demo-bike", name: "Long-term package", kind: "Motor", insurer: "Bajaj General", covers: "Bike", coversDetail: "Gixxer SF 250", sumInsured: 73545, status: "Active", color: "Ruby" },
];

export function demoInsuranceData(today: string, variant: DemoVariant = ""): InsuranceData {
  if (variant === "empty") return { policies: [], payments: [], loans: [], accounts: [], cards: [] };
  // A term of `years` that ends the day before it renews in `days` days.
  const startFor = (years: number, renewsInDays: number) => addMonthsUTC(addDays(today, renewsInDays), -12 * years);
  const pay = (policyId: string, years: number, renewsInDays: number, amount: number, extra: Partial<PolicyPayment> = {}): PolicyPayment => ({ id: `${policyId}-t1`, policyId, periodStart: startFor(years, renewsInDays), years, amount, status: "Paid", ...extra });
  const accidentIn = variant === "soon" ? 12 : 143;
  const carIn = variant === "lapsed" ? -9 : 282;
  const payments = [
    pay("demo-health", 3, 1050, 38427.59, { paidOn: startFor(3, 1050), paidFromAccountId: "demo-hdfc" }),
    pay("demo-accident", 1, accidentIn, 451, { paidOn: addDays(startFor(1, accidentIn), -3) }),
    pay("demo-car", 1, carIn, 5504, { ncb: 50 }),
    pay("demo-bike", 3, 870, 5241, { paidOn: addDays(startFor(3, 870), -3), ncb: 0, paidFromCardId: "demo-regalia" }),
  ];
  return {
    policies: POLICIES,
    payments,
    loans: [{ id: "demo-home-loan", name: "Home loan", lenderName: "SBI", category: "Home", status: "Active" }],
    accounts: [{ id: "demo-hdfc", name: "HDFC Salary" }],
    cards: [{ id: "demo-regalia", name: "HDFC Regalia" }],
  };
}
