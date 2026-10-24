import type { IncomeData } from "@/app/income/views";
import { daysBetween } from "../aggregate/cardSpend";
import { addMonthsUTC } from "../aggregate/recurring";
import { addDays } from "../aggregate/subscriptionRenewals";
import type { IncomeEntry, IncomeSource } from "../sheets/types";

/**
 * Sample income from the final design (design/income/IncomeZ1.dc.html, without RSU and ESPP, which aren't income),
 * for previewing the Income page in development with `/income?demo` before any real sources exist. Every name, amount
 * and date is made up, and laid out around `today`: a salary on the 1st with a March bonus and a raise in April, FD
 * interest every quarter on the 5th, dividends every quarter on the 10th with the latest one still owed, and a tax
 * refund that came once. Never used in production (see isDemoAllowed in cardsDemo.ts), and never written to the Sheet.
 */
export function demoIncomeData(today: string): IncomeData {
  const year = Number(today.slice(0, 4));
  const month = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const sources: IncomeSource[] = [
    { id: "demo-salary", name: "NetApp Salary", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 138500, status: "Active", scheduleDate: month(year, 1, 1), color: "Sapphire", icon: "Briefcase", accountId: "demo-hdfc", statementMatch: "NETAPP" },
    { id: "demo-fd", name: "FD interest", alias: "FD interest", category: "Investment", frequency: "Quarterly", expectedAmount: 18400, status: "Active", scheduleDate: month(year, 1, 5), color: "Teal", icon: "Lock", accountId: "demo-kotak" },
    { id: "demo-div", name: "Dividends", alias: "Dividends", category: "Investment", frequency: "Quarterly", expectedAmount: 6200, status: "Active", scheduleDate: month(year, 1, 10), color: "Copper", icon: "Pie", accountId: "demo-icici" },
    { id: "demo-tax", name: "Tax refund", alias: "Tax refund", category: "Other", frequency: "One-Time", expectedAmount: 23400, status: "Inactive", scheduleDate: month(year, 7, 31), color: "Ruby", icon: "Receipt", accountId: "demo-hdfc" },
  ];
  const accounts = [
    { id: "demo-hdfc", name: "HDFC Salary" },
    { id: "demo-kotak", name: "Kotak Savings" },
    { id: "demo-icici", name: "ICICI Invest" },
  ];

  const entries: IncomeEntry[] = [];
  const add = (incomeSourceId: string, expectedDate: string, lateBy: number, amount: number, tag: IncomeEntry["tag"] = "Regular") => {
    const receivedDate = addDays(expectedDate, lateBy);
    if (receivedDate > today) return;
    entries.push({ id: `demo-e${entries.length}`, incomeSourceId, expectedDate, receivedDate, amount, status: "Received", accountId: sources.find((s) => s.id === incomeSourceId)?.accountId, tag, origin: incomeSourceId === "demo-salary" ? "Statement" : "Manual" });
  };
  const late = [0, 1, 0, 0, 3, 0, 0, 2, 0, 0, 1, 0];
  // Two years back to today: the salary (a raise each April, a bonus each March), FD interest and dividends.
  for (let i = 0; i < 24; i++) {
    const first = addMonthsUTC(month(year - 1, 1, 1), i);
    const y = Number(first.slice(0, 4)), m = Number(first.slice(5, 7));
    add("demo-salary", first, late[m - 1], y < year || m < 4 ? 125000 - (year - y) * 13000 : 138500);
    if (m === 3) add("demo-salary", month(y, 3, 20), 8, y === year ? 160000 : 135000, "Bonus");
    if (m % 3 === 1) {
      add("demo-fd", month(y, m, 5), m === 4 ? 1 : 0, y === year ? 18400 : 16200);
      const div = month(y, m, 10);
      // The latest dividend is still owed when it fell due in the last few weeks.
      const owed = div <= today && daysBetween(div, today) <= 45 && daysBetween(div, today) > 0;
      if (!owed) add("demo-div", div, m === 1 ? 2 : 1, [5100, 5900, 6300, 6200][(m - 1) / 3] - (year - y) * 500);
    }
  }
  add("demo-tax", month(year, 7, 31), 6, 23400, "Other");
  return { sources, entries, accounts };
}
