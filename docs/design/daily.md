# Daily page (`/daily`)

## Status: built 2026-11-18 (F-DY-01). Round 1 of calendar designs and alternatives drawn the same day; he picked C2; rounds 2 (phone first) and 3 (widgets, a year, categories) are below it. No mockup round: he asked for something simple, so it was built directly in the shared design language

A diary of everyday spending that he writes down by hand, once a day or whenever. He wants a rough picture of a month, split into **UPI** and **credit card**, so he knows where the money is going. No automation, no import, nothing to reconcile.

## Round 6 (2026-11-25): quick entry, cash, category limits, an all-spends page (he picked Q1+Q2, L1 and G1, all built: PRs #458, #459, #460)

Asked for after a gap review against other daily trackers (Wallet, Spendee, Monefy, Walnut, Fold): build the first three gaps, mock any design change first, and add a separate page of all entries like the other dashboards have. Boards `DyQ*`, `DyL*`, `DyG*` on the three "Round 6" pages of the canvas; generator files `data-r6.mjs`, `parts-r6.mjs`, `designs-r6.mjs`, `css-r6.mjs`. Every figure is made up (the Often list, repeats and category limits are invented; the rest is the existing sample November).

| Board | What it is |
|---|---|
| `DyQ1` Often row | An Often row on quick add: one tap adds a regular spend (Chai ₹40, Auto ₹120...) to today as it was. Cash is the third method. |
| `DyQ2` Type-ahead | Typing in What it was offers his own notes with their usual amount, method and category. |
| `DyQ3` Repeats | A Due today strip (chai on weekdays, the gym monthly, the maid monthly): offered, never written until he taps Add, so the diary stays hand-kept. Plus a Repeat choice in the form. |
| `DyQ4` Cash | Cash across the page: a third dot on the calendar, a third tile, How you paid in place of UPI vs credit card. |
| `DyL1` Limits in Where it went | Each category's bar is its limit (80% ticked, red when over), a nudge row above when one is near or over, Latest spends with See all spends beside it. |
| `DyL2` Envelopes | A tile per category with a ring, what's left and last month's figure; no-limit categories invite Set a limit. |
| `DyL3` Setting limits | The monthly limit, then a box and a switch per category, and how much of the monthly limit is not given out. |
| `DyG1` Ledger | `/daily/entries` in Income's Entries layout: back link, period pill, Refresh, Add a spend, four tiles, search, category, how paid, amount, sort, month groups with a day under each. |
| `DyG2` Table | One dense sortable table with a pager. |
| `DyG3` A category's page | Opened from Where it went: this month against the same point last month and the whole month, its limit, the weekday it goes on, a usual spend, then its spends. |
| `DyG4` No results | A search with nothing found and the filters in force. |
| `*Phone` | Phone versions: the pinned bar with the Often row, the suggestion sheet, the repeat sheet, limits, the ledger and a category page. |

**Picked 2026-11-25: Q1+Q2, L1, G1.** Built: Cash and the Often row and type-ahead (#458; no "Recent" tab and no hold-to-change, and a spend has to be written the same way twice before it becomes a chip), the limits inside Where it went with Edit limits (#459), and the Ledger at `/daily/entries` (#460; its rows are reached from the limits card and an All spends button). Not built: Q3 Repeats, G2 Table, G3 a category's own page. The questions below were answered by those picks and the defaults drawn.

**Questions for him (defaults drawn):** (1) Q1, Q2 and Q3 aren't exclusive: which to build (default Q1 with Q2's type-ahead, Q3 later)? (2) Should repeats only offer, never write (drawn: offer only)? (3) Category limits can add up to more than the monthly limit; the monthly one still decides the strip and pace (drawn: yes). (4) A category limit carries on to later months until changed, like the monthly one (drawn: yes). (5) L1 or L2 for the limits? (6) G1 Ledger or G2 Table (default G1, as every other page does)? (7) "vs Oct" compares the same days of last month, not a whole month.

**Data it would need (not built):** `method` gains `Cash` (the `DailySpends.method` dropdown in the Sheet and `DAILY_SPEND_METHODS`); a `DailyCategoryLimits` tab (`id, category, month, limit`, latest row at or before the month, like `DailyBudgets`); optionally a `DailyRepeats` tab. Often and type-ahead need no new data: they read the diary. New math (often spends, category limit rows and states, same-point comparison, weekday split) goes in `lib/aggregate/dailySpends.ts` with tests.

## Built (2026-11-18): round 3, as drawn

`/daily` is the round 3 design. What differs from the boards, and what was decided in the build:

- **Layout:** the strip stays at the top (it shrinks to a line when scrolled), the hero is the calendar with today's details across its top, quick add and the day's panel beside it. Right now (left today, week so far, on track, and a day on average against what the limit allows, a fourth so a phone's two columns end level) sits under the hero; the period widgets follow it with the period picker; then Where it went (a third of the width) and Month by month. On a phone the day's panel sits under the calendar and quick add is a bar pinned at the foot (amount, UPI or Card, a chevron for the full sheet, the add button).
- **Changed 2026-11-19 (rounds 4 and 5, picked H4 and S2):** the hero's top is this month as one big figure with its sentence ("70% of your ₹30,000 limit, about ₹1,166 a day."), Today as a lime pill and the date as a quiet one, the month arrows beside them. The budget strip left the hero: it's one slim row under it in the hero's colour (what's left, the bar with the pace tick and "Pace for the 18th", the pill, left today and days to go), and it scrolls with the page rather than staying at the top. A past month's header reads "Spent in October 2026" with "Month over" for the date pill. The Layout line above is the earlier build.
- **Period:** `?period=` is a year (the default, this year), or `month`; `?month=` is the calendar's month. A month period reads the calendar's month. The picker offers This month and each year from the diary's first spend; "Range" will come later.
- **Left today** is what's left of the limit before today, shared over the days to go counting today, less what's gone today (the boards' default; it moves as he spends). **On track** carries the month so far to its end at the same daily rate. **A week's share** is limit × 7 ÷ the month's days. **A day, on average** is the month's spend over the days the diary was kept, against the limit ÷ the month's days (not Left today's allowance, which moves with what's left). All are `budgetView` in `lib/aggregate/dailySpends.ts`, tested against the boards' numbers.
- **The diary starts on its first spend.** A day before it isn't a quiet day and counts toward no average or run, so a diary begun in November doesn't show three hundred quiet days for the year.
- **The limit** is one row per change in a **DailyBudgets** tab (`month`, `limit`); a month uses the latest row at or before it; saving one for a month that has a row updates it. The "keep it for later months" toggle on the boards was dropped, since a limit already applies until it's changed.
- **Categories.** The eight built-in categories are in code with stable ids (`lib/daily/categories.ts`); a **DailyCategories** tab (`name`, `color`, `status` Active or Hidden, `builtIn`) holds the ones he adds, and a row naming a built-in one in `builtIn` holds a rename, a colour, or Hidden for it, made the first time it changes. (The boards said the built-in ones would be written to the tab first; keeping them in code needs nothing written before the first spend.) A spend keeps its category's **id**, so a rename or a recolour touches no spend and no old month. `+ New` in the chips saves a name and one of twelve colours at once and chooses it for the spend being added; Manage renames, recolours and hides; nothing is deleted; a name already there is refused whatever the capitals. The colours are the app's shared list, so a fuller picker needs no data change. Spends' category column is plain text in the Sheet now (its dropdown was taken off through `/api/dev/sheet-columns`, which only does that for a column it's told to).
- **An add shows at once.** Adding a spend (quick add, the phone bar or the add sheet) puts it on the calendar, in the day's list and in every figure on the page the moment it's tapped, marked "saving…"; the save to the Sheet finishes in the background (about 2.5 s on the day it was timed, against 30 ms to the screen). A save that fails takes the entry out of every total and puts it in a notice at the top of the page, whichever day he is looking at (what was typed, the day, why it failed, Retry and Dismiss), with a toast as well. A reason that says it may have been saved (a Sheets timeout, or a dropped connection) asks him to check the day first, so a retry doesn't add it twice. Moving to another month keeps anything still being saved. An edit or a delete still waits for the Sheet. To do this the page's figures are worked out in the browser (`DailyShell` holds the Sheet's rows plus any spend still being saved and runs `dailyModel` over them), not on the server.
- **Not built:** the Overview tile and the Expenses diary check (the limit shows on Daily only, as decided); a limit per method or category; the Range period; opening Manage from the Where it went card. Opening Manage from the add sheet closes the sheet, so a half-typed spend there is lost.

## Round 5 (2026-11-19): the budget strip moves under the hero

He asked for the strip (Left to spend, the pace bar, Left today, days to go) out of the hero and below it, since the hero's header already carries what he has spent. Boards `DyU1`-`DyU3` and `DyU1Phone`-`DyU3Phone` ("Round 5" page): the hero with round 4's H2 header and no strip, the strip under it, then the Right now widgets. The header pick is separate from this.

- **S1:** the strip as it was, light and full width, nothing dropped.
- **S2:** one slim row with only what the hero doesn't say: what's left, the bar with the pace tick, the pill, Left today and days to go.
- **S3:** a card: what's left with its bar and pill on one side; Left today, the pace and days to go as three figures beside it.
- It no longer pins to the top of a phone (it scrolls with the page; the quick-add bar still pins at the bottom). Left today is now in both the strip and the Right now widgets, so one of them could go.

Not decided yet; nothing built from this round.

## Round 4 (2026-11-19): the top of the hero, four options

He asked to redesign the hero's top section (the date, Spent today, Spent this month on the dark card): it looks plain and flat, the spacing is uneven and it takes too much room. He asked to see all four directions; boards are `DyH1`-`DyH4` (desktop) and `DyH1Phone`-`DyH4Phone`, on the "Round 4" page of the canvas. Each sits in the hero as built (budget strip, this header, calendar, quick add and the day's panel), made-up figures.

- **H1 Compact stat chips:** a date badge with "Wed, Nov 18 / day 18 of 30" and the month nav on one line, then two chips side by side: Spent today with its UPI/card split, Spent this month with a small meter against the limit.
- **H2 Date tile, today and a month ring:** a calendar tile (WED 18 NOV), Spent today with its split, a thin rule, then a small ring (70%) beside Spent this month. The shortest of the four.
- **H3 Two tiles side by side:** a slim date line with the month nav, then Today and This month as equal tiles, each with a bar (UPI/card split; spent against the limit and a daily rate).
- **H4 One big figure with its sentence:** Spent this month as the headline (48px) with "70% of your limit, about a day", Today as a lime pill and the date as a quiet pill.

Not decided yet; nothing built from this round.

## Round 3 (2026-11-18): the widgets leave the hero, a year period, adding categories

Prathik asked for: today's main details across the top of the calendar (the date, spent today, spent this month); quick add where the widgets were (beside the calendar); the widgets outside the hero; more widgets; widgets that **align with their neighbours** and **cover a year** (later a range, so possibly several years); and a way to **add a category that's missing**. His answers: the period picker defaults to **a year** (This month, 2026, Range later); the **live budget widgets stay fixed to now** and the history ones follow the period; a new category is added **inline in the chips**, with **a name and a colour**; categories can be **renamed, recoloured and hidden, never deleted**; the extra widgets are **top category, biggest spend, quiet days and streak, UPI vs credit card**.

| Board | What it is |
|---|---|
| `DyE1` Desktop, year | The pinned strip; the hero with today's details across its top, quick add beside the calendar, the day's panel under it; **Right now** (left today, week so far, on track to end at, a day on average); **In 2026** with the picker: spent, top category, biggest spend, UPI vs credit card, quiet days, months inside the limit; then Where it went (a year) and Month by month (twelve months, each against the limit). |
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
- **Widgets, round 7 (2026-11-25): texture and pointing.** Every filled bar (widgets, Where it went, Month by month, category limits, the strip) wears the app's ring texture: the sheen at the top right and faint rings off the bottom right, as the Cards trend does (`--tx-sheen`, `--tx-rings` in `daily.css`); a day or month still to come is hatched, not filled. Every bar says what it is when pointed at, tapped or tabbed to (`data-tip`, the text built in `views.ts` with the figures, so the two agree); the stacked bars (Top category, How you paid) link a part to its legend entry (`LinkedBar.tsx`); Where it went and the limits rows dim their neighbours; cards lift; bars grow in once, and again when the period changes (the picture is keyed by it). All motion stops under reduced motion. Gotcha: custom properties for the texture must sit in the file's first `.dy` block, and `@keyframes` outside it: in the later nested block the pipeline dropped them.
