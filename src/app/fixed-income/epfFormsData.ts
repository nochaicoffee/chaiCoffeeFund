import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { creditedInterest, epfBalance, epfRateForYear, financialYearOf, usualCreditDay, type EpfRateKind } from "@/lib/aggregate/epf";
import type { EpfAccount, EpfEntry, EpfRate } from "@/lib/sheets/types";

/**
 * What the EPF forms need, worked out on the server and sent as plain data: the accounts with their prefills and a rate row for
 * each year, and every entry (for the edit and delete rows, and to catch a second credit for a wage month in the form itself).
 */

export interface RateRow {
  financialYear: string;
  /** The rate used for the year, or null when nothing is known. */
  ratePercent: number | null;
  source: EpfRateKind | null;
  /** A year whose interest is credited is read from that interest; only the others can be set. */
  editable: boolean;
  /** The rate a person entered, if any: what the settings form starts with. */
  entered?: { ratePercent: number; source: "Declared" | "Assumed" };
}

export interface EpfAccountForm {
  id: string;
  name: string;
  status: EpfAccount["status"];
  projectionCredit?: number;
  /** The next credit he is likely to add: the month after the latest, on the usual day, for the same amounts. Null until that month has ended. */
  next: { wageMonth: string; date: string; employee: number; employer: number; pension: number } | null;
  /** What the account holds on `today`, to show the balance after an add. */
  balance: number;
  years: RateRow[];
}

export interface EpfFormsData {
  today: string;
  accounts: EpfAccountForm[];
  entries: EpfEntry[];
}

const nextMonth = (month: string): string => addMonthsUTC(`${month}-01`, 1).slice(0, 7);

export function epfFormsData(input: { accounts: EpfAccount[]; entries: EpfEntry[]; rates: EpfRate[] }, today: string): EpfFormsData {
  const currentYear = financialYearOf(today);
  return {
    today,
    entries: [...input.entries].sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)),
    accounts: input.accounts.map((account) => {
      const entries = input.entries.filter((e) => e.epfAccountId === account.id);
      const rates = input.rates.filter((r) => r.epfAccountId === account.id);
      const credits = entries.filter((e) => e.kind === "Contribution" && e.wageMonth).sort((a, b) => (a.wageMonth! < b.wageMonth! ? -1 : 1));
      const last = credits.at(-1);
      let next: EpfAccountForm["next"] = null;
      if (last?.wageMonth) {
        const wageMonth = nextMonth(last.wageMonth);
        const day = String(Math.min(usualCreditDay(entries) ?? 18, 28)).padStart(2, "0");
        const usual = `${nextMonth(wageMonth)}-${day}`;
        // A credit comes after its wage month, so nothing is offered until that month has ended (the earliest it can arrive).
        if (`${nextMonth(wageMonth)}-01` <= today) next = { wageMonth, date: usual > today ? today : usual, employee: last.employee, employer: last.employer, pension: last.pension };
      }
      const firstYear = entries.length ? financialYearOf(entries.map((e) => e.date).sort()[0]) : currentYear;
      const years: RateRow[] = [];
      for (let start = Number(firstYear.slice(0, 4)); start <= Number(currentYear.slice(0, 4)); start++) {
        const fy = `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
        const info = epfRateForYear(entries, rates, fy);
        const stored = rates.find((r) => r.financialYear === fy);
        years.push({
          financialYear: fy,
          ratePercent: info?.ratePercent ?? null,
          source: info?.source ?? null,
          editable: creditedInterest(entries, fy) === null,
          ...(stored && { entered: { ratePercent: stored.ratePercent, source: stored.source } }),
        });
      }
      return { id: account.id, name: account.name, status: account.status, ...(account.projectionCredit !== undefined && { projectionCredit: account.projectionCredit }), next, balance: epfBalance(entries, today).total, years };
    }),
  };
}
