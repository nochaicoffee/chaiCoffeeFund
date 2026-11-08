import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import { AddBigSpendButton, ExpenseFormsProvider } from "@/components/expenses/forms/ExpenseForms";
import { MonthStatement } from "@/components/expenses/statements/MonthStatement";
import { StatementsLedger } from "@/components/expenses/statements/StatementsLedger";
import { PageHeader } from "@/components/shell/PageHeader";
import { todayIso } from "@/lib/format/date";
import { expenseFormsData } from "../formsData";
import { loadExpenseData } from "../loadExpenseData";
import { expenseModel } from "../views";
import { ledgerView, monthStatementView } from "./statementsView";

export const metadata: Metadata = { title: "Expense statements" };

const BACK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="11 6 5 12 11 18" />
  </svg>
);

/**
 * The Expenses statements (docs/design/expenses.md, round 2): with no `?month=`, Statements (ExS1), every payment month by month, like the Cards
 * and Income statements; with `?month=YYYY-MM`, that month as a statement (ExS2). Both read the same model as the Expenses page.
 */
export default async function ExpenseStatementsPage({ searchParams }: PageProps<"/expenses/statements">) {
  const params = await searchParams;
  const today = todayIso();
  const { data, skipped } = await loadExpenseData();
  const requested = typeof params.month === "string" && params.month !== "" ? params.month : undefined;
  const model = expenseModel(data, today, requested);
  const one = requested !== undefined && model.picked.month === requested ? monthStatementView(model) : null;
  const ledger = one ? null : ledgerView(model);

  return (
    <ExpenseFormsProvider forms={expenseFormsData(data, today)}>
      <div className="flex flex-col gap-5">
        <PageHeader
          section="Expenses"
          eyebrow={
            <Link href={one ? "/expenses/statements" : "/expenses"} className="inline-flex min-h-11 items-center gap-1.5 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:min-h-0">
              {BACK}
              {one ? "Expenses · Statements · One month" : "Expenses · Statements"}
            </Link>
          }
          title={one ? "Monthly statement" : "Statements"}
          actions={
            <>
              <span className="max-md:hidden">
                <RefreshButton iconOnly />
              </span>
              <AddBigSpendButton />
            </>
          }
        >
          <p className="text-[15px] leading-relaxed font-medium text-muted">
            {one
              ? "One month at a time, from what your accounts held at its start to what they held at its end. Every payment sits under its part; cash and UPI is what's left over."
              : ledger?.sentence.map((part, i) => (part.strong ? <span key={i} className="font-bold whitespace-nowrap text-fg tabular-nums">{part.text}</span> : <span key={i}>{part.text}</span>))}
          </p>
          {requested !== undefined && !one && <p className="w-fit rounded-full bg-warning-tint px-3 py-1 text-xs font-bold text-warning-text">That month isn&apos;t one of the last 12, so every month is shown.</p>}
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        <StatementsSummary tiles={(one ?? ledger)!.tiles.map((t) => ({ label: t.label, value: t.value, caption: t.note }))} />
        {one ? <MonthStatement view={one} /> : ledger && <StatementsLedger months={ledger.months} counts={ledger.counts} />}
      </div>
    </ExpenseFormsProvider>
  );
}
