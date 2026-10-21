# Bank Accounts page (`/accounts`)

Final design, picked by Prathik on 2026-10-22: Z1's hero, the monogram tile (B1) as the account's object, and All as its own tile with a colour band (A4). Mockups: [`design/accounts/`](../../design/accounts/), canvas page **Final design**:

| Artboard | What it shows |
|---|---|
| `AccountsFinal.dc.html` | Desktop, interactive: pick a bank from the headline dropdown |
| `AccountsFinalPhone.dc.html` | Phone, interactive |
| `AccountsFinalStates.dc.html` | No accounts, one account, fourteen accounts, a stale balance, a closed account, an account with no balance yet, and just after saving |
| `AccountsFinalForms.dc.html` | Add account, Update balance and Close account with the tile as their preview, and the phone sheet |
| `AccountsForms.dc.html` | The other forms (Edit account, the monthly check-in, editing one balance); their previews take the monogram tile in place of the older tile |
| `AccountsZ3.dc.html` | The seven simpler objects B1–B7 in one live hero, B1 picked |
| `AccountsReadme.dc.html` | Every direction explored, how the pick was made, and the open decisions |

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

Each has the default the mockups show; Prathik hasn't answered them yet.

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

## The canvas generator

The `.dc.html` files and `canvas.json` are the source of truth; [`design/accounts/generator/`](../../design/accounts/generator/) builds them so the boards don't have to be retyped. It started as a copy of the Subscriptions generator's infrastructure. See its README: `node build.mjs` rebuilds every board, `./shoot.sh` takes screenshots (tall boards in slices), and `./audit.sh` checks that cards side by side end level, with picks.
