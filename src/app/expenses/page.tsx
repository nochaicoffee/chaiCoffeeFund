import type { Metadata } from "next";
import { RefreshButton } from "@/components/RefreshButton";
import { SkippedRowsNotice } from "@/components/SkippedRowsNotice";
import { BigSpendsCard, MonthsTable, WhereWentCard } from "@/components/expenses/ExpenseWidgets";
import { AddBigSpendButton, ExpenseFormsProvider } from "@/components/expenses/forms/ExpenseForms";
import { GreetingSentence } from "@/components/expenses/GreetingSentence";
import { SplitHero } from "@/components/expenses/SplitHero";
import { PageHeader } from "@/components/shell/PageHeader";
import { appConfig } from "@/lib/appConfig";
import { cardColorKey } from "@/lib/format/colors";
import { greetingFor, todayIso } from "@/lib/format/date";
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
  const used = new Set(data.bigSpends.flatMap((s) => [s.paidFromAccountId, s.paidFromCardId].filter(Boolean)));
  const forms = {
    today,
    spends: data.bigSpends,
    accounts: data.accounts.filter((a) => a.status === "Active" || used.has(a.id)).map((a) => ({ id: a.id, name: a.name, inactive: a.status !== "Active" || undefined })),
    cards: data.cards.filter((c) => c.status === "Active" || used.has(c.id)).map((c) => ({ id: c.id, name: c.alias || c.name, color: cardColorKey(c.color), inactive: c.status !== "Active" || undefined })),
  };

  return (
    <ExpenseFormsProvider forms={forms}>
      <div className="flex flex-col gap-6">
        <PageHeader section="Expenses" title={`${greetingFor()}, ${appConfig.ownerName}`} actions={<><RefreshButton iconOnly /><AddBigSpendButton /></>}>
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
