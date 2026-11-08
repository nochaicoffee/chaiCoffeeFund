import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { BigSpendsCard, MonthsTable, WhereWentCard } from "@/components/expenses/ExpenseWidgets";
import { AddBigSpendButton, ExpenseFormsProvider } from "@/components/expenses/forms/ExpenseForms";
import { GreetingSentence } from "@/components/expenses/GreetingSentence";
import { SplitHero } from "@/components/expenses/SplitHero";
import { HEADER_GHOST_CLASS } from "@/components/shell/FormTriggerButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { greetingFor, todayIso } from "@/lib/format/date";
import { expenseFormsData } from "./formsData";
import { loadExpenseData } from "./loadExpenseData";
import { bigSpendsView, expenseModel, greetingView, heroView, monthsView, summarySentence, whereView } from "./views";

export const metadata: Metadata = { title: "Expenses" };

/**
 * The Expenses page (docs/design/expenses.md, ExF1: E1 Split): the greeting whose figures point, the Split hero with the months along its foot,
 * Where the month went beside Big spends, then Month by month. `?month=YYYY-MM` picks the month; the page opens on the latest worked out.
 */
export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const params = await searchParams;
  const today = todayIso();
  const { data, skipped } = await loadExpenseData();
  const model = expenseModel(data, today, typeof params.month === "string" ? params.month : undefined);
  const forms = expenseFormsData(data, today);

  return (
    <ExpenseFormsProvider forms={forms}>
      <div className="flex flex-col gap-6">
        <PageHeader section="Expenses" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<><RefreshButton iconOnly /><Link href="/expenses/statements" className={HEADER_GHOST_CLASS}>Statements</Link><AddBigSpendButton /></>}>
          <GreetingSentence parts={summarySentence(model)} cards={greetingView(model)} />
          <SkippedRowsNotice tabs={skipped} />
        </PageHeader>
        <SplitHero view={heroView(model)} />
        <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <WhereWentCard view={whereView(model)} />
          </div>
          <div className="xl:col-span-6">
            <BigSpendsCard view={bigSpendsView(model)} />
          </div>
        </div>
        <MonthsTable view={monthsView(model)} />
      </div>
    </ExpenseFormsProvider>
  );
}
