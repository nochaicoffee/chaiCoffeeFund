# 0014. A lent loan's payouts arrive as Income, and the loan keeps its income source's id

- **Status:** Accepted
- **Date:** 2026-11-06 (Prathik answered yes on 2026-11-06 to an income source per payout loan, and to calling a payout missing after 14 days)

## Context
Prathik has lent money to friends, outside any bank (`LentLoans`, "Lent out" in `system-design.md`). Two kinds exist. An **Accruing** loan earns simple interest that is paid with the principal whenever the borrower pays. A **Paid-out** loan pays a fixed amount every month or quarter and the principal stays out: ₹6,000 a month on ₹3,00,000, ₹18,000 a quarter on ₹1,82,000.

The payouts of a Paid-out loan are money arriving in a bank account on a schedule. The Income page already does exactly that: it works out what is expected, what arrived, what is late and what is pending from a source's schedule and its entries (`lib/aggregate/incomeSchedule.ts`), and matches a bank credit to a source by its statement text. The Lent page also has to say, for each payout loan, what was promised and what came.

## Decision
- A Paid-out loan's interest is **Income**. Each such loan has an **income source** (category Investment, the usual amount, the first payout as its schedule date, and the bank statement text), and the **loan keeps that source's id** in an optional `LentLoans.incomeSourceId` column. Only a Paid-out loan may have one.
- The Lent page reads whether a payout arrived **from that source's entries, with the Income page's own scheduling and matching** (`scheduledDates`, `nearestScheduledDate`), so the two pages can never disagree.
- A payout is promised from **one period after the day the money was lent**, whatever the source's schedule says about earlier days.
- A payout has one of five verdicts: on time (arrived within `LATE_AFTER_DAYS`, 3, of its day, or early), paid late, overdue, missing, or waiting. It is **missing** when it is not here more than 14 days after its day for a monthly payout. A quarterly or yearly payout follows the half-cycle window in which Income still receives a late payment (45 and 182 days), so a quarterly or yearly payout is never called missing while Income would still match it. The monthly figure is deliberately one day inside Income's 15-day window (his choice): a monthly payout that lands on day 15 shows as missing for a day and then as paid late.
- A **missing payout is shown beside what the borrower owes and never added to it.** The maths treats a Paid-out loan's interest as income, not a debt; an Accruing loan's unpaid interest is owed and is part of what is owed.
- A loan with **no income source is "not linked"**, and nothing is called missing for it.
- An **Inactive income source** is not yet decided: until the page tasks settle what pausing a source should mean (stop promising, or keep flagging), the loan reads it as it is and keeps promising its payouts. The question is open and is recorded in `docs/design/lent-out.md`.
- Interest is **simple, never compounded**, counted in **actual days over 365**.
- Adding a payout loan creates its income source and the loan together: both rows or neither. A loan can instead **use an income source that already exists** (his case: he made the sources in Income first): it has to be switched on, not another loan's, and pay as often and as much as the loan says, and linking writes only the loan, never the source.

## Consequences
- A payout is entered once, in Income (typed, or read from a bank statement by the existing import), and the Lent page picks it up. Nothing is typed twice and no payout history is stored on the loan.
- The loan and the source are two rows that must stay together. Deleting an income source that a loan points to leaves the loan "not linked" (it shows the gap instead of inventing missing payouts); deleting the loan leaves the source in Income, because its entries are real money that arrived.
- The Lent page depends on Income's rules. A change to how Income matches a payout changes what the Lent page shows, which is the point.
- A new optional column on the `LentLoans` tab (and a colour), added on the end, so every existing row reads as before.
- The 14-day figure for monthly payouts is a proposal he accepted, not a rule from a bank; it is one constant (`MISSING_AFTER_DAYS` in `lib/aggregate/lentPromises.ts`) to change.

## Alternatives considered
- **Store each promised payout on the loan** (a promised-payouts tab): a second schedule that can drift from the Income page, and two places to enter the same money.
- **Match payouts to bank credits inside the Lent page:** a second matcher with its own rules for what "arrived" means.
- **Count a missing payout as owed:** the borrower owes the principal; a payout that didn't come is income that didn't arrive. Adding it to what is owed would make net worth claim money nobody has promised to repay.
- **Link by the borrower's name:** two loans to one friend, or a rename, would break it silently.
