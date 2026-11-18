# Daily page (`/daily`)

## Status: built 2026-11-18 (F-DY-01). Round 1 of calendar designs and alternatives drawn the same day; he picked C2; rounds 2 (phone first) and 3 (widgets, a year, categories) are below it. No mockup round: he asked for something simple, so it was built directly in the shared design language

A diary of everyday spending that he writes down by hand, once a day or whenever. He wants a rough picture of a month, split into **UPI** and **credit card**, so he knows where the money is going. No automation, no import, nothing to reconcile.

## Built (2026-11-18): round 3, as drawn

`/daily` is the round 3 design. What differs from the boards, and what was decided in the build:

- **Layout:** the strip stays at the top (it shrinks to a line when scrolled), the hero is the calendar with today's details across its top, quick add and the day's panel beside it. Right now (left today, week so far, on track) sits under the hero; the period widgets follow it with the period picker; then Where it went (a third of the width) and Month by month. On a phone the day's panel sits under the calendar and quick add is a bar pinned at the foot (amount, UPI or Card, a chevron for the full sheet, the add button).
- **Period:** `?period=` is a year (the default, this year), or `month`; `?month=` is the calendar's month. A month period reads the calendar's month. The picker offers This month and each year from the diary's first spend; "Range" will come later.
- **Left today** is what's left of the limit before today, shared over the days to go counting today, less what's gone today (the boards' default; it moves as he spends). **On track** carries the month so far to its end at the same daily rate. **A week's share** is limit × 7 ÷ the month's days. All are `budgetView` in `lib/aggregate/dailySpends.ts`, tested against the boards' numbers.
- **The diary starts on its first spend.** A day before it isn't a quiet day and counts toward no average or run, so a diary begun in November doesn't show three hundred quiet days for the year.
- **The limit** is one row per change in a **DailyBudgets** tab (`month`, `limit`); a month uses the latest row at or before it; saving one for a month that has a row updates it. The "keep it for later months" toggle on the boards was dropped, since a limit already applies until it's changed.
- **Categories.** The eight built-in categories are in code with stable ids (`lib/daily/categories.ts`); a **DailyCategories** tab (`name`, `color`, `status` Active or Hidden, `builtIn`) holds the ones he adds, and a row naming a built-in one in `builtIn` holds a rename, a colour, or Hidden for it, made the first time it changes. (The boards said the built-in ones would be written to the tab first; keeping them in code needs nothing written before the first spend.) A spend keeps its category's **id**, so a rename or a recolour touches no spend and no old month. `+ New` in the chips saves a name and one of twelve colours at once and chooses it for the spend being added; Manage renames, recolours and hides; nothing is deleted; a name already there is refused whatever the capitals. The colours are the app's shared list, so a fuller picker needs no data change. Spends' category column is plain text in the Sheet now (its dropdown was taken off through `/api/dev/sheet-columns`, which only does that for a column it's told to).
- **Not built:** the Overview tile and the Expenses diary check (the limit shows on Daily only, as decided); a limit per method or category; the Range period; opening Manage from the Where it went card. Opening Manage from the add sheet closes the sheet, so a half-typed spend there is lost.

## Round 3 (2026-11-18): the widgets leave the hero, a year period, adding categories

Prathik asked for: today's main details across the top of the calendar (the date, spent today, spent this month); quick add where the widgets were (beside the calendar); the widgets outside the hero; more widgets; widgets that **align with their neighbours** and **cover a year** (later a range, so possibly several years); and a way to **add a category that's missing**. His answers: the period picker defaults to **a year** (This month, 2026, Range later); the **live budget widgets stay fixed to now** and the history ones follow the period; a new category is added **inline in the chips**, with **a name and a colour**; categories can be **renamed, recoloured and hidden, never deleted**; the extra widgets are **top category, biggest spend, quiet days and streak, UPI vs credit card**.

| Board | What it is |
|---|---|
| `DyE1` Desktop, year | The pinned strip; the hero with today's details across its top, quick add beside the calendar, the day's panel under it; **Right now** (left today, week so far, on track to end at); **In 2026** with the picker: spent, top category, biggest spend, UPI vs credit card, quiet days, months inside the limit; then Where it went (a year) and Month by month (twelve months, each against the limit). |
| `DyE2` Desktop, month | The same page with the period set to This month and the picker open: the same widgets over November (days under the allowance replaces months inside the limit). A range would build the same widgets over its own months. |
| `DyE3` Categories | A proposal: + New with a name and a colour (in quick add and the add sheet), Manage (rename, recolour, hide), how a new category shows up, where categories are kept, five questions. |
| `DyN1`, `DyN1c`, `DyN2`, `DyN3` | Phone: the top of the page, the whole page, the add sheet with a new category being made, Manage categories. |

Alignment: widgets sit on one 12-column grid, four to a row; every card in a row is the same height with its picture at the same level; Where it went and Month by month sit on the same columns. `audit.sh` passes on `DyE1` and `DyE2`.

### Categories: what it means for the data (not built)

The Spends tab's category column is a fixed Sheet dropdown today. A growing list can't be a dropdown, so a Categories tab (id, name, colour, hidden) would hold the list (the eight built-in ones written to it first), a spend would keep its category's **id** so a rename touches nothing old, and the column would become plain text. The MCP tools would read the list. That changes `lib/sheets/dailySpends.ts`, the form, the Sheet and the tests, so it is its own piece of work.

### Open (his to answer)

1. The categories board's five questions: where Manage opens from, rename by id, the colour picker (twelve colours or the shared 36), duplicate names, chip order.
2. Round 2's: left today (what's left shared over the days to go, as drawn, or a fixed limit ÷ days), on track to end at (a straight-line guide), a week's share of the limit.
3. **Years before 2026**: the diary starts in January 2026, so a "2025" would be empty. The picker offers This month and 2026 now; a range arrives later.

## Round 2 (2026-11-18): the hero calendar picked, phone first

Prathik picked **C2, the hero calendar**, and asked for quick add, how much is left of the budget "at a glance", and a design that works on a phone, where he'll mostly enter spends. His answers: quick add is a **bar pinned at the bottom** of the phone; the budget is a **strip pinned at the top**; the glance widgets are **spent so far, left today, week so far, on track to end at**; the limit is **set on Daily and shown on Daily only** (stored as a Budgets tab; Overview and Expenses get nothing yet).

| Board | What it is |
|---|---|
| `DyM1` Phone, top | The strip pinned under the app bar (left to spend, a bar with the pace marked, left today), four widgets, the start of the hero; the quick-add bar pinned below (amount, UPI or Card, a chevron for more, the add button). |
| `DyM1b` Scrolled | The strip shrinks to one line; the bar stays; the hero's calendar and the day's panel. |
| `DyM1c` Whole page | The phone page unrolled. |
| `DyM2` Add sheet | The chevron opened: which day (Today, Yesterday, Pick a day), category, note. |
| `DyM3` Just added | A toast with Undo, the bar clear, every figure already moved (₹349 more spent, ₹206 left today). |
| `DyM4` Set the limit | A sheet, from tapping the strip. |
| `DyM5` Over the limit | The strip turns red; left today is past its allowance; on track says it's already over. |
| `DyD1` Desktop | The strip under the greeting (pinned), the hero with quick add as a row at its top, the day's panel and the four widgets in a column beside the calendar, then Where it went and Month by month. |

The pointing greeting sentence stays on desktop; the phone drops it for the strip and widgets (nothing to hover).

### Open (his to answer, before building)

1. **Left today.** Drawn as what's left of the limit before today, shared over the days to go counting today (₹705 on 18 Nov), less what's gone today. It moves as he spends. The alternative is fixed: the limit divided by the days in the month (₹1,000), which never moves. Which?
2. **On track to end at** is the month so far carried to the end at the same daily rate (₹34,970). Fine as a rough guide, or smoother (for example leaving out a one-off big spend)?
3. **Week so far** uses a fixed share of the limit (₹7,000 a week), Monday to Sunday.
4. **After adding**, the bar clears and stays for the next one. Should it also stay on the day he picked, or return to today?
5. Left over from round 1: the limit's questions (per month or the same every month, one limit or one per method) are answered as "set on Daily, Daily only"; per-method and per-category limits are not drawn.

## Round 1 designs (2026-11-18): a calendar, and alternatives

Asked for after the page was built: "a calendar sort of section which I can click and add a spend", and a few budget-app-style alternatives where the calendar isn't the main widget. Mockups: [`design/daily/`](../../design/daily/), built by [`design/daily/generator/`](../../design/daily/generator/) (a rebuild overwrites the boards, so change the generator). Every figure is made up; "today" is Wed 18 Nov 2026.

**Decided in the brief (his answers):** a day square shows the day's total with a teal dot for UPI and a red dot for credit card (its shade is the total); clicking a day opens a panel beside the calendar (that day's spends, and add); weeks start on Monday; a monthly limit is wanted too, but where it's set and how it joins the other pages is open (see the Monthly limit board).

| Board | What it is |
|---|---|
| `DyC1` | The calendar takes Day by day's place, the day panel beside it; Where it went and Month by month below. |
| `DyC2` | A dark hero calendar above everything, the day panel inside it. |
| `DyC3` | A Calendar view switched to from a toggle: months down the left, a Week column, the panel. |
| `DyA1` Ring | What's left of the limit as a ring with the pace marked, weeks beside it, an always-open form. |
| `DyA2` Feed | A one-line composer on top, a feed of days under it. |
| `DyA3` Weeks | Each week against its share of the limit, and a strip of days counting the streak under a daily pace. |
| `DyA4` Keypad | A calculator pad to add fast, today beside it. |
| `DyB1` Monthly limit | A proposal: set it from the Left to spend tile; an Overview tile and greeting line; a diary-against-bank check on Expenses; a Budgets tab in the Sheet; five questions. |
| `DyS1` to `DyS3` | States on C1: adding a spend (with a toast), an empty month, a busy month (October, a day with five spends). |
| `*Phone` | A phone layout (390 wide) for each design, the add sheet (`DyS1Phone`) and the limit sheet (`DyB1Phone`). |

### Open (his to answer)

1. **Which design?** Or parts of several (the Week column of C3 and the pace ring of A1 would sit on any of them).
2. **The limit:** where it's set (the Left to spend tile, the Sheet, or both), the same every month or per month, whether Overview shows it, whether Expenses compares the diary to the bank, and one limit or one per method or category. Nothing is built; the Budgets tab shown is only a proposal.
3. **Over-pace days:** C3 and A3 mark a day over a daily allowance (limit divided by days). Wanted, or too strict?

## What it is, and what it is not

- **It is its own record.** The `DailySpends` tab is read only by the Daily page. Expenses (worked out from bank balances), Cards (statements) and Accounts never read it, so nothing is double counted. A card spend written here also appears in that card's bill later; the two are separate on purpose, because this is a rough diary and the statements are the truth.
- **It is not a budget limit.** He said "budget" but described tracking ("how much I spent daily", "where my money is going"), so there is no monthly target, alert or "left to spend". If he wants one, it would be a monthly figure stored once and shown on the Spent tile; ask first.

## An entry

| Field | Notes |
|---|---|
| `date` | The day it was spent. Defaults to today; a day to come is refused. |
| `amount` | Rupees, more than zero, paise allowed. |
| `method` | `UPI` or `Card` (shown as "Credit card"). UPI is chosen to start, since it's the usual one, so the minimum is an amount. |
| `category` | Optional: Food, Groceries, Transport, Shopping, Bills, Health, Fun, Other. "None" in the form clears it. |
| `note` | Optional, up to 80 characters: "Lunch", "Auto to office". |

Add, edit and delete are from the page (a dialog, like Big spends); an edit or delete is also possible in the Sheet, and Claude can add and correct entries over the MCP endpoint (`daily_spends`, no delete).

## The page

Shared shell and greeting: the sentence's figures point (spent, UPI, credit card, a day, the month's pace), with cards from the same month as the sentence.

1. **Month switcher** (`?month=YYYY-MM`, arrows stop at the month today is in, "Back to this month").
2. **Four tiles:** spent (against a usual month), UPI, credit card, a day (with the days nothing was written).
3. **Day by day:** a column per day up to today, UPI and card stacked, each as tall as the day against the month's biggest. **Where it went:** each category as a bar (no category last).
4. **Month by month:** the last six months, UPI and card as the two parts of a bar, each row opens its month. A month with nothing written down is still a row at ₹0, so a gap shows.
5. **Spends:** every entry of the month, a day at a time, newest day first, each row opens Edit.

## The math (`lib/aggregate/dailySpends.ts`, pure and tested)

- Sums are in paise, so ten ₹0.10 spends are exactly ₹1; UPI plus card always equals the total.
- **A day** is the month's total over the days counted: today's date in the current month, all of the month in a past one. Days with nothing written count (as ₹0), which is what a daily average of spending means.
- **Pace** (current month only): the per-day figure carried to the end of the month, rounded to the rupee. Said to be a rough guess in its card; not shown once the month is over.
- **A usual month** is the average of earlier months that have at least one spend. Today's month is left out; months with nothing written are left out (a month he didn't use the diary isn't a ₹0 month).

## Build notes

- Tab created through `/api/dev/sheet-columns?tab=DailySpends` and round-tripped on the real Sheet (add, read back, edit including clearing the category, delete), 2026-11-18.
- Sidebar: **Daily**, after Expenses.
- Dark mode follows the shared tokens; the dark palette itself is still to land (#57).
