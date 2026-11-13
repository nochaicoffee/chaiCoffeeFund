# Expenses page (`/expenses`)

## Status: E1 Split picked (2026-11-08); round 2 adds the Statements pages (`ExS1`, `ExS2`); both kept (2026-11-08). Built 2026-11-09 with the defaults below (epic #396: #397 design, #398 math, #399 BigSpends tab, #400 page, #402 statements, and the Overview tile)

Mockups: [`design/expenses/`](../../design/expenses/), built by [`design/expenses/generator/`](../../design/expenses/generator/) (a rebuild overwrites the artboards, so change the generator). Every figure is made up, shaped like his money; "today" is Sun Nov 8, 2026, so October is the last whole month.

## Round 2 (2026-11-08): E1 Split, and Statements

Prathik picked **E1 Split** and asked for statements like the Cards and Income pages have (a page of its own with every payment).

| Board | What it is |
|---|---|
| `ExF1` The page | E1 Split as the hero. A **Statements** button in the greeting; **Where the month went** links to that month's statement, **Month by month** to every payment. |
| `ExS1` Statements (`/expenses/statements`) | The Cards and Income statements layout: four tiles (spent in October, a usual month, cash and UPI, big spends), a filter by kind (All, Card bills, EMIs, Subscriptions, Insurance, Cash and UPI; it works on the board), Big spends only, search, newest first, then month groups with a row per payment: date, what, kind, paid from, amount. A big spend shows as a tag on the card bill or cash line it sits in. Each month links to its statement. |
| `ExS2` One month (`/expenses/statements?month=2026-10`) | One month as a statement. Tiles: in the bank at the start, came in, spent, in the bank at the end. The statement lists every payment under its part (card bills, EMIs, subscriptions, insurance, cash and UPI) with subtotals and the total; arrows step through the months. Beside it, **How it adds up** (bank at the start, + came in, − moved to investing, − spent, = bank at the end), the month's split, every month as small bars you can click, and the month against a usual one. Download PDF. |

Card bills are split across his three cards in the sample (each card's big spends stay on it), and each card bill names the statement it paid. The worked-out cash and UPI is one line on the month's last day.

### Questions on round 2

1. ~~The two statement pages~~ **Decided 2026-11-08: keep both**, Statements (every month) and One month.
2. **Cash and UPI as one line**, or should it eventually break down further (that would need the bank statement's own lines, the same reading as the broker transfers)?
3. Download as PDF on a month: wanted?

## Round 1 (2026-11-08): four heroes on one page

Every board shares, top to bottom: the greeting whose figures point (spent, cash and UPI, invested, kept, the big spend); the hero; **Where the month went** (each part as a bar, the big spends inside it as the light end of the bar, and the month against the 12-month average per part) beside **Big spends** (a strip by category, the newest five, one still waiting in November's card bill); and **Month by month**, a row per month in which came in = invested + lent out + kept + spent. Picking a month anywhere (a chip, a column, a tab, a table row) moves the whole page to it. Cards side by side end level (`audit.sh` passes on all four), in the Overview's design language.

| Board | The hero's idea |
|---|---|
| `ExE1` Split | What came in as one bar; under it spent, invested and kept (a month that took from savings shows the extra as a dashed bar); spent fans out into cards, EMIs, subscriptions, insurance and cash and UPI. Month chips along the foot. |
| `ExE2` Bridge | The calculation itself, as a bridge: in the bank at the start, + came in, − invested (and lent), − each part of spending, = in the bank at the end. The worked-out cash and UPI is hatched, and a box spells out the sum. |
| `ExE3` Year | Twelve months as stacked columns by part, each big spend pinned on its month with its category's icon, your usual month as a dashed line; a panel beside it for the picked month. |
| `ExE4` Receipt | The picked month printed as a receipt: each part, the big spends starred under the part they sit in, total spent, then what wasn't spent (invested, kept, came in). The months are a stack of tabs beside it. |

### Questions on round 1

1. **Which hero?** (or parts of several: E2's sum box would sit well on any of them).
2. **A card big spend:** the boards show it in the month its bill is paid ("counts in Apr", bought 14 Mar), so it always sits inside that month's card bills. Is that how you want to read it, or should it show in the month you bought it?
3. **Categories:** Travel, Shopping, Electronics, Home, Health, Gifts, Vehicle, Education, Other. Add or drop any?
4. **The month in progress** (November): leave it out until it ends, or show it as "so far"?

## What the real data can't do yet (found 2026-11-08 while preparing the mockups)

**Settled the same day by the pool (below).** Money moved to brokers no longer needs recording: the brokers' cash is in the pool and trades happen inside it. Points 2 to 4 are all before November 2026, the first month the page works out, so they no longer block anything; they matter only if old broker cash is ever added. The notes stay as the record.

Running the calculation on his real records for 2025 and 2026 gave months like −₹2.45L (Nov 2025) and ₹12.6L (Jul 2026), so the real page needs these first:

1. **Money moved to brokers isn't recorded.** No `InvestmentTransactions` row says which bank paid for it (`settlementAccountId` is empty on all 91), and most buys are at US brokers (INDmoney, IBKR) paid from dollar cash or a remittance. What leaves the bank for investing has to be recorded as its own thing (a transfer from a bank account to a broker), or every remittance shows up as spending.
   - **Tried 2026-11-08: "every buy left HDFC and every sale landed in HDFC"** (his rule of thumb; sell-to-cover at an RSU vest left out). Trade by trade it doesn't hold: Jul 2026 comes out at −₹10.1L spent, Aug 2026 at +₹18.7L, Oct 2026 at −₹4.9L. In Aug he sold ₹18.1L but the bank balances fell ₹84k, and in Oct he bought ₹8.3L while they fell ₹1.75L: sale money mostly stays at the broker and buys the next thing. So the trades can't say what crossed the bank; only the money actually moved between HDFC and a broker can.
   - **Proposed:** read those transfers from the HDFC statements the Gmail import already parses (the way salary is matched by "NETAPP INDIA"): a line to or from INDmoney, IBKR, Zerodha, Groww or FYERS is money moved to or from investing. Waiting on Prathik.
2. **Where a loan's money went.** Answered 2026-11-10: it depends on the loan. A car loan usually goes straight to the dealer; personal and home loans land in his account. Each loan now says so (`disbursedTo`: Account or Seller; the Add loan form preselects Seller for a car loan). The ₹11.1L disbursed in Jul 2026 is his personal loan, paid into HDFC, so it counts as borrowed. (This question first called it a car loan, which was wrong.)
3. **Where the loans he lent came from** (₹3L in Nov 2025, ₹1.82L in Jan 2026): the bank balances don't fall by that much, so the money may have come from somewhere not counted.
4. **Card bills before 2026** have no paid-from account (statements only start Aug 2025, paid-from Jan 2026), and EMIs are only recorded from Aug 2026. Before that, those payments fall into cash and UPI.

A page of its own for what Prathik spends each month. Overview gets one small tile (spent this month) that opens it. The page answers:

1. How much did I spend this month, and in past months?
2. How much of it was card bills, subscriptions, EMIs, and how much was cash / UPI (the leftover)?
3. What were the big spends that made a month high?

## Changed 2026-11-13: the pool is the bank accounts, and brokers are met through Transfers

**Supersedes "The calculation: the pool" below for how brokers count.** The pool above put every broker's cash in the pool because money sent to brokers wasn't recorded. It now is: every transfer between his banks and his brokers is in the Transfers tab (the Accounts page reads the same tab, and Investments has an *Add transfer* button and a Transfers card), so the page now uses the bank-only pool with those transfers, exactly as Accounts does.

```
Spent = Came in + Borrowed + Came back + Taken back − Sent to brokers − New deposits − Lent out − (banks at end of M − banks at end of M−1)
```

- **The pool** is every account that isn't `Brokerage`. A broker's balance is never read, so no broker needs a month-end balance and **every month can be worked out**, not only those after 31 Oct 2026. (Asked and agreed 2026-11-13: October reads cash and UPI without any broker cash.)
- **Sent to brokers** is a Transfer from a bank account to a Brokerage account in M, in rupees (the rupees that left the bank). **Taken back** is one the other way, at what arrived in the bank (`receivedAmount`, else `amount`). Both show in the Invested figure (sent less taken back) and the months table. A transfer between two banks nets out in the pool; one between two brokers never touches it.
- **Trades no longer count here.** What happens inside a broker (buys, sells, dividends, RSU vests, ESPP) never touches a bank, so it is in neither bought nor sold. New fixed deposits still count as money out of the pool, and a closed one's payout as came back.
- **An unrecorded transfer** (or money that came in with no record) shows up as cash and UPI, below zero when more left to brokers than the records explain. Adding the transfer fixes the month.
- **Big spends paid from an account are a part of their own (`big`), no longer inside cash and UPI** (found 2026-11-13: October's "cash and UPI ₹1,14,480" held ₹93,000 of car upgrades, the Suspension, Alloy Wheels, Tyres and fitting goals, which Accounts already counted). A big spend with `paidFromAccountId`, and a goal marked bought with an account (Done, `doneOn`, `actualCost`), is a payment on its day and counts as explained, so cash and UPI is only what no record explains (October: ₹21,480). What was spent in all doesn't change. One charged to a card stays inside that card's bill; one naming no account stays inside cash and UPI. The months table gained a Big spends column so every row adds up.
- **Money held for others** (a friend's share of an investment, 2026-11-13) is its own pair of lines: `held` counts with what came in (it isn't income), `returned` is subtracted from spent and shown with lent out as "Lent or handed back", so came in = invested + lent or handed back + kept + spent still holds. Trishal's ₹2L in (Apr) and ₹2,58,357 back (May) moved April's cash and UPI from −₹1.54L to ₹46k and May's from ₹3.24L to ₹66k.
- **The only reason left for "can't be worked out"** is a dollar bank account with no USD to INR rate. The broker-cash notice is gone.

## The calculation: the pool (agreed 2026-11-08, replaces the bank-only version)

His savings and salary accounts **and the cash at every broker** (the `Brokerage` accounts: IND Money - Prathik, IND Money - Mom, which is his own money, IBKR and E\*TRADE) are one **pool**. Moving money between them (HDFC to Jupiter, a wire from HDFC to IBKR) moves nothing out of the pool, so nobody has to tag which account paid for what. He usually wires to a broker first and buys from the broker's cash, so trades happen inside the pool. For a month M:

```
Spent = Came in + Sold + Came back − Bought − Lent out − (Pool at end of M − Pool at end of M−1)
```

- **Came in**: received `IncomeEntries` in M. ESPP and EPF taken from the salary never reach the pool, so they are in neither came in nor bought.
- **Bought**: market `InvestmentTransactions` Buys in M (source `Market`), in rupees at the trade's rate, plus new `FixedDeposits`/RDs started in M. Not RSU vests (shares arrive, no cash leaves) and not ESPP purchases (paid from the salary).
- **Sold**: Sells in M, in rupees at the trade's rate; the cash lands in the pool. Not the sell-to-cover at an RSU vest (it pays tax and never reaches him). A later sale of RSU or ESPP shares does count.
- **Came back**: a deposit's `receivedAmount` on its closed day, and `LentRepayments` principal.
- **Lent out**: a `LentLoan`'s principal on its start day; lending and repayments must be recorded on the Lent page.
- **The pool's change**: each account's balance at month end (`balanceOn` the last day). **A dollar account's change is taken in dollars and converted at that month's rate**, so a move in USD/INR on idle cash never counts as money in or out.
- **Invested**, as the page shows it: bought less sold (it can be negative when he sells to spend). This reads the same trade log as the Investments page's Money in, but only the market part: Investments also shows RSU vests and ESPP.
- **Money waiting at a broker counts as kept**, not invested, until it buys something.
- **Wire charges and the currency spread** on a remittance end up in cash and UPI: they are money gone.
- **Dividends and broker interest** land in broker cash and aren't recorded, so they make cash and UPI a little smaller (accepted, like FD interest).

### From when (decided 2026-11-08)

Broker cash has no history: each broker account has one balance, and Prathik can't easily get past month-end cash from IBKR or INDmoney. The 5 Nov 2026 broker balances were copied to **31 Oct 2026** (he confirmed the cash didn't change between them), so **November 2026 is the first month the page works out**, and every month after it, as long as he updates broker cash at each month end like the banks. Earlier months show what's known (came in, bought, sold, lent out) and mark spent as "can't be worked out: broker cash not recorded"; never the bank-only figure, which counts a wire to a broker as spending (it gave Jul 2026 −₹10.1L and Aug 2026 +₹18.7L). Adding old broker month-end cash later would open those months, as the Jupiter balances did.

### E\*TRADE cash (decided 2026-11-08)

RSU and ESPP sale proceeds sit at E\*TRADE before he wires them out, so **E\*TRADE's cash is in the pool**: a sale there counts as sold when it happens, and the later wire to HDFC moves nothing out of the pool. Added 2026-11-08 as the account **E\*TRADE** (type `Brokerage`, purpose `Spending` like the other brokers, currency USD; start date 2022-08-24 is a guess). E\*TRADE shows the cash in rupees: ₹12,597.62 at $0.010650 a rupee is **$134.16**, entered for 8 Nov and copied to 31 Oct 2026 (assumed unchanged, as with the other brokers). It needs a balance at every month end after.

## Big spends (agreed 2026-11-08)

Entered by hand: date, amount, what it was, a category, and what paid for it (a card or a bank account). Mainly big ones; a small one can be logged too.

A big spend **explains part of a month, it never adds to it**: a ₹40k flight on a card is already inside that card's bill. Because card spending counts in the month the bill is paid, a card-paid big spend sits in the month it happened with a note that it's in the next month's bill (the design should show this plainly).

A few categories to start (to confirm in the design round): Travel, Shopping, Electronics, Home, Health, Gifts, Education, Other.

## The history it can show (checked 2026-11-08 against the Sheet)

A month can only be worked out when every counted account has a balance at both ends of it. **Superseded for spent by the pool (2026-11-08):** the brokers have no history, so spent starts at November 2026; the bank history below still serves the months' came in and kept.

| Account | Balances | Gaps |
|---|---|---|
| HDFC (salary) | monthly since Aug 2022 | none |
| Jupiter | since Feb 2022 | 13 months missing (e.g. Oct–Nov 2023, Apr–May 2024, Feb–Mar 2025, Aug 2025, Nov 2025) |
| Slice | monthly since Aug 2025 | none |
| Canara | one balance, 5 Nov 2026 (₹529) | no history |
| SBI | one balance, 5 Nov 2026 (₹4,999) | no history |

**Decided 2026-11-08: a dormant account counts as unchanged back in time.** Canara and SBI are taken as holding their one known balance in every earlier month, so they add nothing to any month's change. (The rule in general: an account with no balance before a month is held flat at its earliest known balance, from its `startDate`; an account counts as zero before its `startDate`.) When either gets a real history, it simply replaces the assumption.

With that, 35 of the months from Mar 2022 to Oct 2026 can be worked out. The other 21 can't, all because of Jupiter: a missing month-end breaks both the month before and the month after. They are Oct–Dec 2023, Apr–Jun 2024, Feb–Apr 2025, Aug–Sep 2025, Nov–Dec 2025, Feb–Mar 2026 and May–Oct 2026. Jupiter usually holds a few hundred rupees but sometimes ₹10k–₹28k (Mar 2026: ₹14,828; Apr 2026: ₹28), so treating a gap as flat would be wrong.

Jupiter's missing month-end balances (13; filling them unblocks all 21 months): **2023:** Oct, Nov. **2024:** Apr, May. **2025:** Feb, Mar, Aug, Nov. **2026:** Feb, May, Jul, Aug, Sep. October 2026's only balance is on the 23rd (₹974, the same on 5 Nov), so it stands in for the month-end.

**Decided 2026-11-08: unrecorded interest is fine.** FD interest paid out to the bank and savings interest aren't income entries; they make Cash / UPI a little smaller, and that's accepted.

**Filled 2026-11-08 from his Jupiter (Federal Bank) statements, Jan 2023 to 8 Nov 2026.** The running balance adds up on every one of the 264 lines, each year's opening equals the last year's close, and all 33 month-ends already in the Sheet matched to the paisa. The 13 gaps were months with no transactions, so each is the previous month's balance, added as `Statement` balances on the last day of the month. **All 56 months from Mar 2022 to Oct 2026 can now be worked out.**

## Build decisions (2026-11-09, defaults; Prathik said "go ahead and finish whatever is left")

The open design questions got the defaults the boards already show, so the build could start. Any of them can change later.

1. **The pool replaces "the bank" on the page.** The boards were drawn before the pool. Where they say "in the bank on 30 Sep", the page says "in the pool": the savings accounts plus the cash at every broker. "Moved to investing" is **bought − sold**: what went into investments, less what came out of them.
2. **When a month can be worked out.** A month needs its start and its end: every pool account's balance at the end of the month before, and at the end of the month itself (the latest balance on or before that day). A **savings** account with no balance yet is held flat at its first known balance (the dormant Canara and SBI rule above). A **broker** account with no balance at the start of a month makes the month "can't be worked out: broker cash not recorded"; that is every month before November 2026 today.
3. **The month in progress** shows what's recorded so far (came in, card bills, EMIs, subscriptions, insurance, bought and sold), but not spent or cash and UPI: those need the month's end balances. It's labelled "so far".
4. **A balance carried from an earlier month is pointed out.** When an account's balance at a month's end is dated before that month began (he hasn't updated it), the month still works out but its card says which accounts were carried, since a stale broker balance changes cash and UPI.
5. **A card big spend counts in the month its bill is paid**, as the boards show. The bill is the card's first statement dated on or after the purchase. Until that statement is paid, the big spend shows as "waiting in the next bill". A big spend paid from a bank account counts on its own date, inside cash and UPI.
6. **Categories:** Travel, Shopping, Electronics, Home, Health, Gifts, Vehicle, Education, Other.
7. **Cash and UPI stays one line.** There's no PDF download yet (question 3 of round 2 stays open).
8. **Things the pool needs that the spec didn't list** (confirmed by Prathik 2026-11-09: keep them):
   - **Every lent repayment** counts as came back, principal and interest: both are cash that landed. (A paid-out loan's interest arrives as income instead.)
   - **A loan's disbursal** counts as came in (borrowed) when it lands in an account the app has: its principal less the fees, stamp duty and gap interest taken out of it. A loan paid straight to the seller (`disbursedTo` Seller) never counts: the money never reached his accounts.
   - **A manual loan prepayment** (and its charge) counts with the EMIs, as part of what went to loans. A part of an EMI payment above the EMI is already in that installment.
   - **Cash and UPI below zero** means the records explain more than left the pool (a missing income entry, a balance typed wrong). It's shown as it is, with that note, never hidden.

9. **Overview's Spent tile takes Still to pay's place**, so the Overview keeps twelve tiles in four columns (a thirteenth would sit alone on a row). Due this month now says what's still to pay in its line, and its card already lists paid and still to pay. Spent shows the latest month worked out (with how far it is from a usual month), or what's paid so far while no month is.

## Open questions

The rules are settled. What the real records still lack is under "What the real data can't do yet" above, and the design questions are under round 1.
