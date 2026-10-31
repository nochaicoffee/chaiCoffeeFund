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

## Built: the Balance history page (#177)

**H1 Ledger was picked (2026-10-23)** and built at `/accounts/history`, reached from the dashboard's Balance history card ("View all balances", carrying the pick and the period) and from the sidebar's Accounts section. A back link to Accounts, the summary sentence, four tiles (recorded, biggest move, not read lately, days between readings), then the filters (All / Rises / Falls / First & closing with counts, account, purpose, search, sort: newest, oldest, biggest move) and the balances grouped by month with each month's net, 12 to a page. Every filter is in the address (`?period= &account= &purpose= &status= &q= &sort= &page=`). A row's ⋯ menu has Edit balance, Update that account (not for a closed one) and Delete balance, through the Accounts forms. Pure logic in `lib/aggregate/accountHistory.ts` (tested), the address in `app/accounts/history/params.ts`, the page's data in `app/accounts/history/views.ts`.

Definitions: a balance's change is against the account's previous balance, even from before the period; only an account's very first balance is "first"; "closing" is a closed account's last ₹0 balance; a month's net is the sum of its changes (so it leaves out first balances) and is the whole month's even when a page shows part of it; a search matches an account's name, bank or last 4, or an amount typed as digits against a balance or its change. H2's check-in grid and H3's passbook weren't built.

## Round 18 (2026-10-23): the cover's motion and layouts, mocked up (not picked yet)

Prathik said the hero's animation didn't match the design and wasn't smooth, and asked for interactions and a few ways to show the accounts. `design/accounts-interactions/AccountsInteractions.html` (a live page like the Cards and Subscriptions ones; tokens copied from `globals.css`; Slow-mo ×4 and Play it for me built in).

**Why it jumps (in `AccountsHero.tsx`):** the open card (`OpenCard`) and a spine (`FoldedCard`) are different components, so a pick unmounts one and mounts the other. Widths snap, the open face appears at once, `RollingNumber` mounts fresh (no roll), and the line and the four figures change instantly. Only the stage colour (`CrossfadeBackground`, 650ms) and a spine's hover width (300ms) ease. Every option's fix is one element per account that never unmounts, with its width, position and face animated.

| Area | Options |
|---|---|
| 1 · Opening a card | 0 as built (for comparison); **A** glide and settle (640ms ease-out width, open face laid out at full width behind the clip so nothing reflows, parts rise in one by one, balance rolls from the previous figure); **B** the label travels (the vertical name swings upright, the monogram slides beside "Your balance"); **C** peek, then open (a hovered spine widens and shows its balance and change; arrow keys) |
| 2 · The stage | **A** the line morphs (or draws, or jumps as today) and the four figures roll; **B** the same, and the new colour spills out of the picked card as a circle |
| 3 · Cover layouts (with 3 / 6 / 12 accounts) | **1** spines with weight (fill = share of the total); **2** a fanned hand (monogram, name, compact balance on each strip); **3** wallet stack (the rest stacked under the open card, line and figures to the right); **4** one card and a magnifying dock of monograms; **5** ledger rows (name, purpose, share bar, balance in line) |

**Added the same day, after "more variations, and redesign the card itself":** motion **D** (spring and ripple: a touch of overshoot, neighbours move in a wave); layouts **6** centred strip (neighbours peek from behind, fades past two away), **7** card and tile grid (the last row's tiles stretch to fill), **8** card and rail (the pick flies up into the big card, the old one drops into the rail); and a new area **4 · The open card itself** with five redesigns on a dock: **A** a bank card you can flip (tilt, shine, details on the back; All is a split-colour card; actions cut to Update balance, Edit and a ⋯ menu), **B** the shape of the year (the account's line inside the card, scrub any week, one labelled button and three icons), **C** figures inside the card (share ring, split by account for All; the figures row under the line could then go), **D** quiet and large (76px balance, one button, bank initial as a watermark, a not-read chip beside the name), **E** a passbook page (its last three recorded balances written out; the three biggest accounts for All). Faces are drawn at 760px, so the hand and the tile grid would need a trimmed one. In the mock, "Out to bills" and the sparkline data are sample figures.

Not mocked: the phone (unchanged: the picked card full width, the rest as chips under it). Decisions to make: which motion (A, B or C, they combine: C's peek on A's glide), line morph / draw / jump, flat fade or spill, and which cover layout, if any, replaces the spines. Reduced motion should turn all of it off in the build, as elsewhere.

## Round 19 (2026-10-24): Prathik's picks (dock, wallet, side pills), taken further

He liked the dock, the wallet stack and the side pills that widen, and asked for variations of each, more ideas for what the open card shows, and for the dock to reveal the bank and balance on hover before anything is picked. `design/accounts-interactions/AccountsInteractions2.html` (the same engine and tokens as round 1; 3 / 6 / 12 accounts switch, Slow-mo, Play it for me).

| Area | Options |
|---|---|
| 1 · Dock (hover reveals bank and balance first) | **1** label chip (glides between items, digits roll); **2** mini card preview (account colour, name, balance, line); **3** share rings with balances written under each monogram, hover adds share and "not read in N days"; **4** vertical dock on the card's side (wraps into columns) |
| 2 · Wallet | **1** lift and reveal (a hovered strip lifts and opens a second line, the others slide down); **2** upside down (pile above, open card below); **3** grouped by purpose with headings; **4** rich strips (line, share, change) |
| 3 · Side pills | **1** spines that open to a 236px peek (share fill kept); **2** pill column (round pills beside the card, hover stretches one over the card; two columns past five); **3** books on a shelf (lift and balance written up the spine); **4** pill bar on top (picked pill open, others open on hover) |
| 4 · Inside the card | **A** money through it (came in / went out, 1 or 3 months); **B** the next 30 days (projected balance, a dot per EMI, bill or salary, "short by ₹X on Nov 1", amber below zero); **C** runway (days or months it lasts, what-if −20% / +20%, six-month goal for the emergency fund); **D** drag back through the year (the balance rolls to any week, Back to now); **E** update where it's written (the balance becomes the field, live difference, Enter saves, Saved · Undo for six seconds; All has none) |

What each would need from the data: B needs the upcoming EMIs, card bills and salary per account (Coming up already works them out, but per account they would need the account on each); A and C need money in and out per account (A from the records already kept; C also a monthly expense figure for the emergency fund, set at ₹60,000 in the mock). D and the line need the recorded balances (already there). E is the existing Update balance form done in place. All the figures in the mock are samples. Not mocked: the phone (unchanged). Decisions to make: which dock tip (1-4), whether the wallet or the dock or the side pills is the cover, and which of A-E go in the card (they combine, but the card should stay to one idea).

## Round 20 (2026-10-24): rich strips, and what goes on the right

Prathik liked the wallet with **rich strips** (round 19, wallet 4) and asked for variations of its right side (the line and the four figures) with interactions. `design/accounts-interactions/AccountsInteractions3.html`. The left side stays as is; the right is one of five, mostly tied to the strips:

| Option | Idea and interactions |
|---|---|
| 0 | As it is now, for comparison |
| A · Time machine | Hover the line and the open card, every strip and the four figures roll back to that day; click to hold it, Back to now; 3M / 6M / 1Y; picking another account keeps the date |
| B · Layers | Every account stacked through the year in its colour; hovering a band lifts its strip and hovering a strip lights its band; click a band to open it; Rupees / Share morph |
| C · Compare | A + on each strip lays its line over the open account's (the + turns into ×); Shape / Share of total; a table under the chart follows the pointer; chips to remove |
| D · Chart tabs and tiles | One chart, three views (the year, money in and out by month, next 30 days), switched from four tiles under it (since Jan 1, this month, coming up, runway) or from tabs |
| E · Peek on the right | Hovering a strip draws its line dashed beside the open account's, tints the chart, switches the figures to its numbers and says how far it is from the open one |

Engine changes in the mock: a panel can be mounted in the right column and gets pick and hover events; the cover can be told to hover an account from outside, and what balance to show for an account (for the time machine). Needs from the data are the same as round 19 (money in and out per account, what's coming up per account); B needs every account's recorded balances week by week, which the Balance history already holds. The figures are samples; the phone is not mocked.

## Round 21 (2026-10-24): other visuals for the rich strip

**Not wanted:** this round varied the left strips, which Prathik had already finalized (the rich strips with the stepped line). He wanted variations of the right section; see Round 22. Kept only as an exploration.

The rich strip's stepped line is accurate but busy; Prathik asked for a smoothed version, a progress bar or other visuals. `design/accounts-interactions/AccountsInteractions4.html`: a live wallet with a switcher for the strip's visual, and a side-by-side of all nine for any one account.

| Style | What the strip shows | Interaction |
|---|---|---|
| Stepped (today) | each balance carried forward | none |
| Smooth line | the year blurred (triangular, 3 weeks) and drawn as a monotone cubic with a soft fill: the trend, not the exact days | move along it: the date and balance replace the line under the name |
| Line behind | the same line across the whole strip, behind the text | crosshair and read-out |
| Ring monogram | the monogram's ring is the share of the total, drawing itself in, plus a small smooth line | scrub as above |
| Share bar | a progress bar of the share of the total (All: split in each account's colour) | hover swaps the % for its rank |
| Year range | a bar from the year's low to its high with a marker for now and a tick for Jan 1 | hover says how far up the range it is |
| Freshness | 30 ticks that dim as the balance ages; amber when not read in a month | hover sweeps the lit ticks |
| Month columns | ten month-end balances, green when up on the month before | move across to read a month |
| Year grid | 44 weekly squares shaded by level, this week outlined | move over to read a week |

The big line on the right can be smoothed the same way (a switch in the mock). Smoothing is a presentation choice: balances are recorded on particular days, so the smooth versions show the trend and the stepped one shows the days. Share, range and freshness need nothing new (balances and when each was read are already kept). Not mocked: the phone.

## Round 22 (2026-10-24): the right section, with the left strips untouched

**The left side is final:** the wallet with rich strips (the open card on top, the others as strips with the stepped line, share and change). Prathik asked for variations of the **right section** (the graph and the information), including a smoothed version and progress bars. `design/accounts-interactions/AccountsInteractions5.html`; every option sits beside the unchanged strips, and most talk to them.

| Option | What it shows | Interactions |
|---|---|---|
| A · Smoothed area | the year as a smooth gradient area (blurred 2 weeks, monotone cubic), a pulsing dot for today | read any week; Smooth / Exact switch; 1Y / 6M / 3M |
| B · Pick a stretch | the same chart with a brush | drag to select, pull the edges, drag the stretch; the figures become change (with %), low, high, average; Month / Quarter / Half / Year presets |
| C · Six progress bars | a short smooth line, then bars for share, place in the year's range, freshness, runway, this month in and out, bills against the balance | bars fill; hover for what each means, click to keep open; amber when it needs attention |
| D · Three rings | share, freshness, runway | point at a ring or its row, the centre says what it is; click to hold |
| E · Month columns | ten month-end balances from zero, average line | Balance / Change slides the bars to monthly change around a zero line; hover a month |
| F · All accounts ranked | a league table of bars for every account | Balance / Growth / Share re-sorts the rows; hovering a row lifts its strip and the other way round; click to open |
| G · How this month got here | a waterfall from a month ago to now (came in, card bills, EMIs, subscriptions, other) | bars build in sequence; hover for amounts; Replay |

Data needed beyond what exists: money in and out per account and a split of what went out (card bills, EMIs, subscriptions) for G, E and C; bills and EMIs due per account for C; the runway target (a month, or six months for the emergency fund) for C and D. Balances, last-read dates and the year's range come from what is already kept. The figures in the mock are samples. At 3 accounts the right side is taller than the left; at 6 and 12 they end level. Not mocked: the phone.

## Round 23 (2026-10-24): a light hero, in the Income dashboards' style

Prathik asked for variations **without the colour background** (the stage that takes the pick's colour), taking inspiration from the Income mockups (`design/income/`, `docs/design/income.md`). What those do: colour belongs to the data (muted fills with the ring texture, a dark rounded tile per source, a very pale tint behind the Payday river), the page and the hero card are white; each widget opens with a small uppercase label, a title, four small facts across the top (value, caption) and chips or a pill switch to light one thing. `design/accounts-interactions/AccountsInteractions6.html`: the **left side is untouched** (the open card and the rich strips, still the coloured cards, now on a light stage); two switchers combine a stage with a right section.

**Stage:** white card (Income's hero card exactly); a pale tint of the pick (12%, gliding to the next on a pick, as the river's green); warm paper; plain white with a tint only behind the cards.

**Right section** (each opens with the label, a title, four facts, and talks to the strips): **Year in columns** (stacked month columns in muted fills with the ring texture, a dashed average month, By account / By purpose, chips that light one account); **Lanes** (Income's Payday river: a tile and a lane per account, a bead a month sized by the balance, an amber dashed run for an account not read); **Accounts table** (Income's Sources list: tile, name and what's next, a year of months in miniature, balance, change since Jan 1 in a pill; sorts by balance, change or name); **This year and last** (ink against dashed, the gap shaded green or amber, a pill with the difference); **Check-in calendar** (Income's Pay calendar: accounts by months, a dot per reading, hatched where never read; click a cell for the readings).

Data: the last year's balances for This year and last (not kept per account today, so it needs the Balance history to reach back a year), money in and out is not used here; the readings come from Balance history. The figures in the mock are samples. Not mocked: the phone.

## Round 24 (2026-10-24): six more right sections on the light hero

Prathik asked for a few more variations of the right section. `design/accounts-interactions/AccountsInteractions7.html` is the round 6 light hero (left cards and strips untouched; four stages) with eleven right sections one press apart: the five from round 6 and six new ones, again borrowed from the Income dashboards:

| New | What it shows | Interactions |
|---|---|---|
| Trend | the year as a smooth gradient area in the account's colour, a pulsing ring at today | hover to read a week; drag to measure a stretch (the rest fades, the four facts become that stretch); 1Y / 6M / 3M; Smooth / Exact |
| Money flow | sources (salary, RSUs, dividends, other) into the accounts, out to card bills, EMIs, subscriptions, invested and stayed (Income's Money flow) | hover a node or ribbon to follow it; click an account to open it; the open account's ribbons are strongest |
| Coming up | the next 30 days as dots sized by amount, and a list with what's left after each payment, amber when it takes the account below zero | Open account / Everyone; hover a row or dot; click a row (Everyone) to open that account |
| Wheel | a spoke a month stacked by account, Nov and Dec dashed, a dashed average ring (Income's wheel) | hover a spoke for the month, click to hold; the list names the accounts |
| Health bars | a short smooth line and six bars (share, place in the year's range, freshness, runway, this month in and out, bills against the balance) | hover for what each means, click to keep open; amber when it needs a look |
| Waterfall | how a month or three got from the balance then to now (came in, card bills, EMIs, subscriptions, other) | bars build in sequence, hover, Replay, This month / 3 months |

Same data needs as rounds 19 to 23: money in and out per account, the split of what went out, and what's due per account. Money flow also needs a source for each deposit (the Income entries and which account they landed in, which Income's own Sheet will hold). The figures in the mock are samples. Not mocked: the phone.

## Built: the light hero (2026-10-24)

Prathik picked the wallet with rich strips for the left (round 19), **Trend on a pale tint of the pick** for the right (rounds 23 and 24), asked for the Trend's range to follow the page's period pill (no picker in the hero), for **Check-ins** in place of the Exact switch, and for the money that moved through the account in the section. Built in `AccountsHero.tsx`, `WalletCards.tsx`, `HeroTrend.tsx` and `CheckInCalendar.tsx`; the old coloured stage, the spines and the white line with its four figures are gone.

- **The stage** is the Income hero card (surface, hairline, soft shadow) with a 12% tint of the pick's colour that glides to the next one (650ms). No gradient, no ring texture on the stage.
- **The wallet** (left): the open card on top, the others as 80px strips overlapping so 62px of each shows (less with many accounts, `stripPitch`), each narrower than the one above. A strip has the monogram, name, share of the total, its period as a step line, its balance and last change; a not-read account says so in amber. One element per account that never unmounts, so a pick glides: the open face is laid out at the card's full width and its parts rise in one after another, and the open card's digits roll from the figure it replaces. Positions come from the pick alone (CSS variable `--open-h`, taller on a phone). On a phone the strips stay under the card and the right section stacks below.
- **Trend** (right): the pick's line over the page's period, smoothed (a 2-week triangular blur and a monotone cubic, `trendChart.ts`), a pulsing ring at the end. Hover reads a week; drag across it to measure a stretch (the rest fades; click to clear). Arrow keys read a week, shift and the arrows measure, Escape clears. The line morphs when the pick changes (not for reduced motion).
- **The four facts** are the money that went through the account over the period, or over the measured stretch: **Came in**, **Spent** (card bills, subscriptions, EMIs), **Invested** (shares bought) and **Left the bank** (spent plus invested). They are worked out from the other pages' records (`flows` over `flowItems`, the period's movements carried to the browser without their labels), never read from the bank. For a stretch, the movements after its first day up to and including its last (`itemsBetween`). The sentence under the title gives the balance's change over the same stretch.
- **Check-ins** (the other button): accounts by months over the last 12 months of the period, a dot per reading, hatched where a month was never read, dashed for the month still going, blank before an account existed or after it closed (`checkInGrid`). Press a cell for the readings; press a name to open the account. Four facts: readings, quiet months, longest gap (counted to the period's end while the account is open) and who is read most.
- **Not changed:** everything under the hero (the mix, Balance history, This year in and out, Over time, Money in and out, Coming up). This year in and out now repeats Came in, Expenses and Invested next to the hero's facts; it could go.

Tests: `accountCheckIns`, `accountTrend` (including a stretch's money in and out), `trendChart` and the page view's new fields. Checked in the browser on the sample data (`/accounts?demo`) at desktop and phone width: hover, drag, both views, picking from a strip and from the calendar. Not checked against the real Sheet.

## Built: Balance history as a table, and the mix as the cost map (2026-10-24)

Prathik pointed out that the dashboard's Balance history was a list while Cards' Statements and Subscriptions' Payments are tables, and that the mix ("Where it sits") was misaligned and didn't look or feel like the Subscriptions cost map.

- **Balance history** (`HistoryCard.tsx`) is now laid out as Payments is: the title with what it covers (Every account, or the account with its mark), a header row (Account when All is open, Read on, Balance, Change, After the one before, Source), six rows on hairlines with the account's mark in the first column for All, Edit at the row's end, a line saying "The 6 most recent of N", and View all balances →. Where a statement disagreed with a balance, the Needs attention chip takes the Source's place. Beside the map it keeps one height whatever's picked (six unseen rows hold it, as Payments does) and says "Pick a block in the map for one account's balances", or offers All accounts.
- **Where it sits** (`MixCard.tsx`) is built the way the cost map is, from the same pieces: its layout (`costMap.ts`), the hover card's shell (`CostMapHover`, which now accepts what to say for a block and a category), the toggle, the ring texture and the rolling digits. A block has the account's name, "Spending · HDFC Bank", its share, the balance large, "Updated Oct 21" or an amber "Not read · 83 days" pill; hovering or focusing a block or a purpose's tile lifts it, steps the rest back and shows the light card (balance, share bar, purpose, updated, last change); the open account has the ring and tick; By purpose glides the blocks into a tile per purpose with a legend under. The map fills the height its card has (360px minimum, 440px from md), which now matches Balance history, so the two end level. A purpose tile too narrow to read stays plain.

## Statement sync: needs attention (built 2026-10-23, no design board)
Built from the existing card, dialog and chip styles after Prathik asked for it to be built directly; a board for it in `design/accounts/` is still to be drawn if he wants one. Where a bank statement disagrees with a recorded balance (ADR 0008): the greeting sentence ends "N balances from your statements need a look" (the figure points, with a card of each day, both balances and the gap); a warm card under the header lists them with a Review button; the balance's row in Balance history (the card and the full page, desktop and phone) carries a "Needs attention" chip; Review opens a dialog with "On your Sheet" beside "On the statement" and **Keep ₹X** or **Use ₹Y**. "Sync statements" sits beside Refresh in the header, its report under the greeting. With `?demo`, one sample review shows and every button is disabled.

