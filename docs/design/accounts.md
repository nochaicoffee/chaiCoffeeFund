# Bank Accounts page (`/accounts`)

**FINAL, picked by Prathik on 2026-10-22 (supersedes the earlier "Z1 hero + monogram tile" pick).** The cards are the hero (H4): a row of account cards across the top, the picked one opening into the hero itself. Under it come the mix beside Balance history, this year in and out, Over time with the glow line, and money in and money out beside Coming up, with the ring texture on the marks and a greeting whose figures point. **Read "The final design" (the last big section) first; "The hero", "The monogram tile", "Phone", "States" and "Forms" below describe the earlier pick and are kept for history.** Mockups: [`design/accounts/`](../../design/accounts/), canvas page **Final design**, tab **Newest** in the preview:

| Artboard | What it shows |
|---|---|
| `AccountsFinalPage.dc.html` | **The final page, desktop**, interactive: pick a card, switch the mix (By account / By purpose) and Over time views |
| `AccountsFinalPagePhone.dc.html` | The final page on a phone |
| `AccountsFinalPageStates.dc.html` / `...StatesPhone.dc.html` | The seven states, desktop and phone |
| `AccountsFinalPageForms.dc.html` / `...FormsPhone.dc.html` | The six forms (Add, Update balance, Close, Edit, monthly check-in, editing one balance), the account's card as the live preview; phone sheets |
| `AccountsR13H4.dc.html` | The picked hero on its own (H4), with the other four tried (H1 to H3, H5) |
| `AccountsR11InOut.dc.html`, `AccountsR11Mix.dc.html` | Money in and out (I1 to I5) and the mix (M1 to M5), every variation tried |
| `AccountsR11A.dc.html` to `D`, `AccountsR12Selectors.dc.html` | The other W1 arrangements, and the card-strip selectors tried (S1 to S5) |
| `AccountsFinal*.dc.html` (not `FinalPage`), `AccountsZ3`, `AccountsReadme.dc.html` | The earlier pick (dropdown hero, monogram tile), the objects B1 to B7, and every direction explored with how the pick was made |

Every name, balance, date and account number in the mockups is made up. "Today" is Oct 21, 2026.

## The page, top to bottom

1. **Greeting**, as on the other dashboards: "Bank accounts · Today", "Good morning, Prathik", and one sentence: the active accounts and what they hold, the change since January, the high point, and any account not updated lately. The period pill, Update balances and Add account on the right.
2. **The hero**, on a stage in the picked account's colour (below).
3. **Below the hero**, side by side and ending level: **Balance history** (the pick's recorded balances, with change and gap, each editable) on the left; **Coming up** (salary due, EMIs and card bills from the accounts, with a warning when an account can't cover an EMI) and **Money out** (worked out, marked as such) stacked on the right.

There is one chart on the page: the hero's line. Prathik asked for no other graphs.

## The hero

- **The figure reads as a sentence:** "Your balance ₹11,65,500 in **All accounts ▾**". The account name is the selector: a dropdown in the app's own `Select` style, grouped by purpose (Spending, Investment, Emergency fund, Loan payments, then Closed), with a search field (name, bank or purpose) and Add account at the foot. It holds any number of accounts; the menu scrolls and search narrows it. The picked option is tinted in its account's colour with a bar on its edge.
- **Under the dropdown:** "+₹74,850 since Jan 1 · latest update Oct 20" for All; for an account, when it was updated and its change since the balance before; amber for a stale one. Then the pick's buttons: Update balances and Add account for All; Update balance, Edit and ⋯ (Close) for an account; Reopen and Edit for a closed one. The primary button is white with the pick's deep colour as its text.
- **The stage takes the pick's colour:** All is the emerald green; picking an account fades the stage to that account's card gradient over 650ms (`--card-<colour>-from` → `-to`), like the Cards details header and the Subscriptions hero. The line stays white for every pick.
- **The line:** the pick's balance this year, week by week, carrying each balance forward (decision 1), glowing white, with the months under it. It follows the period pill.
- **Four figures** under the line: for All, This month, High point, Out to bills (worked out) and Up to date (4 of 5, naming the stale one); for an account, Since Jan 1, Share of the total, Out to bills since its last balance, and Updated.

## The monogram tile

Each account is shown as a **monogram tile** (B1), the way a card is a tile on the Cards page and a subscription a cover on the Subscriptions page, but kept quiet and symmetrical:

- A rounded square (176 × 196 at its own size, 44px corners) in the account's card gradient, lit from the top, with the faint ring texture.
- **The bank's initial**, embossed, inside a thin ring; under it **the account's name** and **the last 4** of the account number (decision 12). No balance: the hero's figure already shows it.
- **All** is its own tile in green, with the accounts icon in the ring, "All accounts" and "5 accounts", and a light rim so it reads on the green stage. Under it, **a colour band**: one segment per active account, as wide as its share of the total, with the four biggest named (SBI 56% …) and +N for the rest. It holds any number of accounts.
- **Stale** (decision 3): stamped NOT READ · 73 DAYS in amber across it.
- **Closed**: grey, stamped CLOSED.
- **No balance yet**: the tile shows as soon as the account is added; the figure says No balance yet.
- **Motion**: when the pick changes the tile lifts in (560ms); nothing moves for `prefers-reduced-motion`.
- The filled cheque (C1) was picked first and dropped the same day because it carried too much; it stays on the canvas with the other explorations.

## Phone

The same order. The hero is about half as tall as the desktop one: the tile is a small thumbnail beside the figure (about 84px tall), then the dropdown, the line under it, the buttons, the line and the figures in two columns. Coming up, Balance history and Money out follow.

## States

As `AccountsFinalStates`: no accounts (₹0, "No accounts yet", a dashed place for the first tile, no chart); one account (the hero opens on it and the menu has no All, decision 6); fourteen accounts (the grouped menu, open, and +9 on the band); a stale balance; a closed account; an account added without a balance; and just after saving a balance (the figure and line update, the stale stamp goes, a toast offers Undo for 6 seconds).

## Forms

The forms follow the Cards forms ([`cards-forms.md`](cards-forms.md)): a dialog with the live preview on the left, a full-screen sheet on phone.

- **Add account**: the preview draws the new account's tile as it's filled in. Fields: Name, Bank, Type, Opened on, Purpose, Colour (new), Last 4 digits (new, optional), Balance today (optional, saved as its first balance).
- **Update balance**: the change and the new total show under the tile as you type. A drop of more than a fifth asks you to check it (decision 8), and a second balance on the same day replaces the first (decision 7).
- **Close account**: the tile turns grey and is stamped Closed. Closing adds a ₹0 balance on the day and sets the account Inactive; it warns when money is still in it or a loan pays from it.
- **Update balances** (the monthly check-in), **Edit account** and **editing one balance** are as on the Forms board.

## Numbers (definitions)

- **A total on a date** counts each account at its latest balance on or before that date, and nothing before its first (decision 1). This replaces `balanceTrend`'s grouping by exact date, which undercounts days when only some accounts were updated. It needs a test that proves it.
- **Since Jan 1** is today's balance minus the balance carried on Dec 31.
- **Out to bills** and **Money out** come from records elsewhere in the app: card bills paid from the account (`Statement.paidFromAccountId`), subscriptions charged straight to it (`SubscriptionPayment.paidFromAccountId` and the subscription's default), EMIs (`LoanInstallment.paidFromAccountId`) and trades (`InvestmentTransaction.settlementAccountId`). **Everything else** is the balance change those don't explain (decision 2). All of it is labelled "worked out", never as a statement.
- **Stale**: an active account whose latest balance is more than 30 days old (decision 3).
- New computations go in `lib/aggregate/` as pure functions with tests, per CLAUDE.md.

## What this needs from the Sheet

- **Accounts · `startDate`** has no column type (found by `npm run check-sheet`). Set it to Date in the Sheet; I haven't changed it.
- **Accounts · `color`**: a new dropdown column with the six card colours (decision 4).
- **Accounts · `last4`**: a new text column, optional, so a leading zero survives (decision 12).
- **BalanceSnapshots**: no change.

## Open decisions

**Answered 2026-10-22:** Prathik accepted the default for 1–12 and 19, so the page is built to them (see the PRD's "Accounts, how the numbers are defined"). Decisions 13–18 (the round-10 widgets) were dropped with those widgets when W1-A was picked. Each has the default the mockups show.

1. **Carry forward** each balance for totals and the line (shown), or something else.
2. **Show Everything else**, the change the records don't explain (shown), or show only what's recorded.
3. **Stale after 30 days** (shown), or another number.
4. **Colour**: a new optional `color` column (shown), or colour from purpose only.
5. **Closing**: Inactive shown as Closed, with a ₹0 balance on the day (shown), or a new Closed status.
6. **One account**: All steps aside until there's a second (shown), or All always.
7. **One balance per account per day**: a second replaces the first (shown), or keep both.
8. **A big drop** (more than 20%) asks you to check, without blocking (shown), or no warning.
9. **`startDate`** needs its Date type set in the Sheet.
10. **The period** is Cards' period menu (#113), shown.
11. **Selection colour**: the picked item takes its account's colour; All is white on the green (shown).
12. **Last 4**: a new optional `last4` column shown on the tile (shown), or no number.

**New in round 10** (the widgets below the hero, still to be picked; each has the default the mockups show, and none is answered yet):

13. **Emergency buffer: what "usual bills" means.** Shown: the balance divided by the average month of card bills, subscriptions and EMIs paid from your accounts, over the last three full months (Jul to Sep: ₹96,340 in the sample), so the SBI emergency fund reads 6.8 months and everything you hold 12.1. Investments are left out and no target (like 6 months) is drawn. Or include investments, use another window, or define "usual" some other way. This is money math, so it needs your yes and then a test (balance ÷ the average, to the decimal) before it's built.
14. **Amounts in Coming up and the Runway.** Shown: salary and EMIs at their usual amounts, a card bill as "about" the card's last bill, a quarterly subscription on its usual day, and the same again for the next month. Or use each card's open statement when it has one, or only what's already recorded as due.
15. **How far the Runway looks, and what it ignores.** Shown: 15, 30 or 45 days (30 to start), and it assumes nothing else lands: no top-ups or transfers between your accounts, which aren't recorded, so an account with a bill bigger than its balance (the Axis EMI) goes red. Or one fixed horizon, or a setting for the usual top-up.
16. **Month over month.** Shown: today's balance minus the balance carried at the end of the month before (since Sep 30), and likewise 3 months back and since Dec 31, the same carry-forward as decision 1. An account with no balance this month shows no change and is flagged, not guessed.
17. **What counts as checked in.** Shown: a month counts when any balance is dated in it; the streak is the months in a row ending this month (24 for HDFC, 0 for SBI, which missed Sep and Oct). Or count only a balance recorded on or after the 25th, or a streak that forgives one miss.
18. **One chart, or more.** The earlier rounds kept the hero's line as the page's only chart because you asked for no other graphs. Your round-10 feedback asked for more visual widgets, so these pages add charts (month over month, over time, runway, money out, mix, check-in, trends). Shown: more charts, with the hero's line still the biggest. Or go back to one.

## How it got here

The canvas keeps every round, newest first, so pieces can be borrowed later:

- **Round 1** (A–D): A cover flow, B tiles and details, C money map, D passbooks. A and B were too close to Subscriptions and Cards.
- **Round 2** (E–N): ten directions on their own ideas. Kept F passbook, K money diary, L T-accounts, M balance slips; set aside E G H I J N.
- **Round 3** (O–T): more banking paperwork: statement, khata, receipts, annual report, planner, general ledger.
- **Round 4** (U–Y): A's green stage, with selectors that don't turn; the selection in the pick's colour. Prathik liked **Y's hero** (a giant figure, a glowing line, four figures).
- **Rounds 5–6**: seven, then six more selectors for Y's hero, the second set built to hold any number of banks with no extra graphs. Prathik picked **Z1**, the headline dropdown.
- **Round 7**: the stage takes the bank's colour, and six account objects (passbook, cheque book, debit card, seal, tag, vault door).
- **Round 8**: the cheque with every field filled (C1–C5), passbooks (P1–P5), cards without a gold chip (D1–D4), five inline ways to show All (A1–A5), and a smaller phone hero. Prathik picked **C1 with A4**, then found the cheque too much.
- **Round 9**: seven simpler, symmetrical objects (B1–B7: monogram tile, quiet passbook, envelope, note bundle, nameplate, key card, stamp). Prathik picked **B1, the monogram tile**.
- **Round 10** (2026-10-22): Prathik liked the hero and asked for more widgets, mostly visual, with Balance history on the right as on Cards and Subscriptions. The hero is the final one, unchanged; below it, five pages (`AccountsWidgetsW1`–`W5` and `AccountsWidgetsPhone`, canvas page **Below the hero**, Newest tab on the preview), each its own idea, each a visual on the left, the list of records on the right and a chart that switches views. Not picked yet. Every widget follows the hero's pick and has its own switch, hover card or row that opens; all of it is CSS, no script.
  - **W1 Movers** (what changed): Month over month (a bar either side of zero per account; this month, 3 months, this year; for one account its own columns), Over time (change, stacked, share), The mix (accounts outside, purposes inside), Coming up (filter in or out).
  - **W2 Runway** (what's coming): Runway (each account's balance stepping after each bill, EMI and salary in 15, 30 or 45 days; a short account goes red), Money out month by month (by kind, by item, in and out), Who pays what (amount or share), Coming up.
  - **W3 Check-in** (how current): Check-in rings (a tick a month; this year or 24 months), How fresh (days since each balance, 30-day mark; sort; rows open in place), Coming up, Update rhythm (when you updated, or the days between).
  - **W4 Mix** (what it's made of): Over time (share first), The mix, Emergency buffer (months of bills, an open decision), Who pays what, How fresh.
  - **W5 Scoreboard** (each account's own trend): Each account's trend (twelve columns on the account's own scale, sort, rows open), Month over month, How fresh, then the year's chart with its switch (river, glow line, bridge, flow map).
  - **What it needs:** no new Sheet columns. Everything comes from Accounts, BalanceSnapshots and the card bills, subscriptions, EMIs and trades already recorded elsewhere, and is labelled "worked out" where it is. New open decisions 13–18 above.
  - **Fit:** cards side by side end level, with no empty band inside any of them for All or any one account: a list with few rows fills the rest with a chart of that account's balance, and a closed account gets a plain "it's closed" panel.

## The canvas generator

The `.dc.html` files and `canvas.json` are the source of truth; [`design/accounts/generator/`](../../design/accounts/generator/) builds them so the boards don't have to be retyped. It started as a copy of the Subscriptions generator's infrastructure. See its README: `node build.mjs` rebuilds every board, `./shoot.sh` takes screenshots (tall boards in slices), and `./audit.sh` checks that cards side by side end level, with picks.

## Round 11 (2026-10-22): W1 Movers picked, with changes

Prathik picked **W1 Movers** and asked for: the **Scoreboard's Over time chart with the glow line first** instead of W1's; **Month over month replaced** by a money in vs money out widget that shows what was saved each month and what was spent apart from investing, plus the section above the chart covering it; **more Mix variations**; **Coming up unchanged**; and the **greeting pointing** like Cards and Subscriptions (hover cards on the accounts, the total, up since January, the high point and the stale account).

Built in `design/accounts/generator/r11.mjs` and `r11pages.mjs` (canvas page **Round 11**, tab **Newest**): four full pages W1-A to W1-D, a page with the five money in/out widgets (I1 paired columns, I2 month ledger, I3 where each ₹100 went, I4 mirror, I5 scoreboard tiles, plus the band above the chart and the strip under it) and a page with the five mixes (M1 rings as today, M2 blocks, M3 one bar, M4 bubbles, M5 a hundred squares).

Open decision 19: **what "saved" means.** Shown: saved = came in − expenses (card bills, subscriptions, EMIs), so investing counts as saved; "kept in the bank" is saved minus invested. The other way is to count investing as spending.

## The final design (2026-10-22)

Prathik picked **H4, the cards are the hero** (rounds 12 and 13) and **W1-A** (round 11) with his changes, and asked for the ring texture the other dashboards have. Boards: `AccountsFinalPage*` (generator: `r11.mjs` widgets, `r13.mjs` hero, `r14.mjs` the page, `r15.mjs` phone states and forms, `r16.mjs` desktop states and forms).

**The page, top to bottom (desktop)**
1. **Greeting** that points, like Cards and Subscriptions (`PointingSentence`): hover the account count, the total, up since January, the high-point month and the stale account for a card. The period pill, Update balances and Add account on its right.
2. **The hero: the cards are the hero.** A row of account cards across the stage. The picked one is open: "Your balance · bank", the balance (62px), the name, when it was updated and its change, the buttons, and its **purpose as a chip at its top right**. It uses the dark gradient of the Cards tiles with a white ring. The others fold into dark spines showing only the **initial at the top and the account name at the bottom** (no amount, no bank). Hover a spine to widen it. All is the first card (for All: "5 accounts · 4 up to date"). The stage takes the picked bank's colour; the white line and the four figures under it follow. There is no dropdown any more. Closed accounts are greyed.
3. **The mix beside Balance history** (an equal two-column split; every row below is the same split so edges line up and cards end level). The mix is the Subscriptions **cost map**: a treemap sized by balance with a **By account / By purpose** toggle; By purpose glides the blocks into a tile per purpose in its colour, with the purpose's name and total at the tile top. Clicking a block picks that account. Hovering one steps the rest back.
4. **This year, in and out**: Came in, Expenses, Invested, Saved, and one bar splitting what came in.
5. **Over time**: the Scoreboard chart, **glow line first**, then River, Bridge and Flow map; follows the pick.
6. **Money in and money out beside Coming up** (unchanged). Money in and out is paired columns per month (what came in, then expenses stacked with what was invested) with the saved amount under each month.

**Definitions (open decision 19):** Expenses are card bills, subscriptions and EMIs. Invested is shares bought. **Saved = came in − expenses, so money invested counts as saved**; the other way is to count investing as spending. Everything here is derived from the records already kept elsewhere (IncomeEntries, card bills, subscription payments, loan installments, investment trades): no new Sheet columns, and each is labelled "worked out". Put the math in `lib/aggregate/accounts.ts` as pure functions with tests.

**Ring texture** on every mark that has one on the other dashboards, as `RingTexture` in the app: faint circles from the bottom-right corner, white on dark marks and ink on light ones. On the chart columns, the glow chart's month bars, the split bar, the month tiles and the mix blocks. (Not yet on River, Bridge and Flow map.)

**Phone:** the greeting, then the hero as the picked account's full-width card (balance, name, purpose chip, buttons) with a row of the other accounts under it to switch (it scrolls sideways; the picked one is raised and ringed), the line and four figures two across; then the mix (with the toggle), Balance history (3 rows), this year in and out, Over time, money in and money out (last 6 months), Coming up. No hover cards on a phone. (A folded-card row didn't work on a phone: the open card scrolled out of view.)

**States (7), desktop and phone:** no accounts (dashed card, ₹0, Add your first account, no line); one account (no All card); many accounts (the row scrolls and ends in a +N card, with a colour band); a stale balance (stamped NOT READ · 73 DAYS, Update balance first, an amber line); a closed account (grey, stamped CLOSED, Reopen); added with no balance yet (No balance yet, Add its first balance); just saved (new balance, the stamp gone, a toast with Undo for 6 seconds).

**Forms (6 on a desktop; 7 sheets on a phone):** the account's card is the live preview in each: Add account (also with errors, on the phone), Update balance (also a big drop), Close account (grey card, with the warning that a loan pays from it), Edit account, the monthly check-in (the All card shows the total after the typed balances; the stale one first), editing one balance (a popover on desktop, a bottom sheet on a phone). Phone sheets are full-screen with the primary button pinned.

**What it needs from the Sheet** (unchanged): `purpose` exists; a new optional `color` column (decision 4); an optional `last4` (decision 12); `startDate` needs its Date type (decision 9). The 12 earlier decisions and 19 are still unanswered (defaults shown); ask them, and the Sheet columns, before building.

**Not done / to know:** the date picker and bank menu open on a phone; ring texture on River, Bridge and Flow map; the mix's Axis block is tiny in both views (it shows only its initial). The phone hero is a different layout from the desktop's on purpose.

**Build mapping:** hero cards from the Cards tile styling and `RingTexture`; the mix from the Subscriptions `CostMapCard`/`costMap.ts` treemap with its By category toggle (here By purpose); greeting from `src/components/shell/PointingSentence.tsx`; Over time from the Scoreboard chart; Balance history and Coming up as already specified above.

## Built: the forms (#165)

Add and Edit account (the account's card is the live preview; Add has an optional balance today, saved as its first), Update balance (change and new total as you type; a drop of more than a fifth warns, a same-day balance says it will be replaced), the monthly check-in (stale first, blanks left alone), Close and Reopen (a ₹0 balance on the day, then Inactive; Reopen sets Active), and editing or deleting one balance from Balance history. Pure reading in `lib/forms/accountForms.ts`, server actions in `app/accounts/actions.ts`, dialogs in `components/accounts/forms/`. With `?demo` every button is disabled. **Not built:** the Undo toast after a save, the phone's pinned-button sheets beyond what `FormDialog` already does, and the forms' error and big-drop states as separate boards.

## Built: this year in and out, Over time, Money in and out, Coming up (#164)

`app/accounts/detailView.ts` builds each pick's under-the-hero data from `lib/aggregate/accountFlows.ts` (tested): the four tiles and the one bar splitting what came in by source; Over time with the **glow line** (month-end total, each month's change as bars), **River** (every account stacked, All only) and **Bridge** (start, came in, sold, card bills, subscriptions, EMIs, investments, Everything else, Accounts opened, now; it always ends on what's held); Money in and out as paired columns per month with saved under each; and Coming up (the next 45 days, a card bill not yet billed as "about", an EMI the account can't cover flagged). Everything is labelled worked out. "Accounts opened" is the balance an account first read inside the period arrives with, which isn't money moving. **Not built:** the Flow map, ring texture on River and Bridge (as in the design's own note), and hover cards on the charts beyond the native tooltips.

## Round 17 (2026-10-23): the Balance history page, mocked up (not picked yet)

The Accounts dashboard's Balance history is only a card (the first 8 rows, Show all, an Edit button on each). Cards has a Statements page and Subscriptions a Renewals page, so `/accounts/history` is proposed as the Accounts counterpart. Three directions, desktop and phone, in `design/accounts/` (canvas page **Balance history page (H1–H3)**; generator `r17.mjs`):

| Board | Idea |
|---|---|
| `AccountsHistoryH1.dc.html` (+ `Phone`) | **Ledger**: Renewals' layout. Summary tiles (recorded this year, biggest move, not read lately, days between readings), then filters (All / Rises / Falls / First and closing, account, purpose, search, sort), grouped by month with each month's net change, a row menu (Edit, Update, Delete) and paging |
| `AccountsHistoryH2.dc.html` (+ `Phone`) | **Check-in grid**: account by month, each cell the day it was read and how far it moved, missed months hatched. Click a cell, a row or a column to list just those readings below |
| `AccountsHistoryH3.dc.html` (+ `Phone`) | **Passbook**: the accounts on the left, one account's page on the right with its own line, a Date / Change / Balance / Gap table and its Update and Edit buttons |

Shared: the back link and "Balance history" title, a greeting sentence, the period pill and Update balances, and every edit and delete from the dashboard card. Nothing is built; decisions to make are which direction (or a mix, like H1's list under H2's grid), and whether the dashboard card links to it with "View all".
