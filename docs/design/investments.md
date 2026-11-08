# Investments page (`/investments`)

## Status: design final (2026-11-04), returns row and broker cash redrawn the same day

**The design is final (2026-11-04), and nothing is built.** It is **L1 Giant** with the **Spin wheel | Treemap** split card. Prathik picked L1 on 2026-11-02, asked for a symmetric layout and a smaller number (76px, a taller stage) the same day, and picked the Spin wheel with a Subscriptions-style treemap as a toggle on 2026-11-04. Mockups: [`design/investments/`](../../design/investments/), built by [`design/investments/generator/`](../../design/investments/generator/) (a rebuild overwrites the artboards, so change the generator). The canvas opens on the four **FINAL** pages: the page (`InvFinal`), the phone (`InvPhone`, five phones including the split card), the states (`InvStates`) and the forms (`InvForms`). Every other page is labelled **Exploration** (four rounds of heroes, the split layouts and the donut takes) and is kept for reference only.

**What final means here.** The layout, the interactions and the sample data are settled. The money rules behind it (the rupee split, the time-weighted yearly return and deepest fall, as-of values, what-ifs, new-money allocation, same money elsewhere, targets and limits) are **still proposals**, listed under "Rules the sample assumes" and in `system-design.md`. Each needs his yes and a tested function in `lib/aggregate/` before a page uses it, and none of them is built. The open questions below keep the defaults the mockups show until he answers.

**What isn't in the final design:** a date picker for going back to a custom day (the chips are enough for the first build), a dark theme for the whole app (only the stage is dark), Overview attention items for Investments, and Try without outside Holding view. All four are left for a later round, and the Exploration pages stay for reference.

The earlier `design/dashboards/InvestmentsList.dc.html` is stale (his word, 2026-10-31) and was not used. This design starts from the subject.

## What the page answers

1. **What is it worth now, and how far ahead (or behind) am I on what it cost?** Cost basis is each trade's own frozen rate; value uses today's price and today's USD/INR (ADR 0003).
2. **Where does it sit?** By holding, by kind of asset, by market, and how much of it is one company.
3. **Who made the money, and how much of the gain is the rupee falling rather than a price rising?**
4. **What did I do lately?** Trades, RSU vests (with the shares sold to cover tax), ESPP purchases.
5. **Can I trust today's figures?** Where each price came from, and which one is stale.

India and the US share the one page, split by a market filter (decided 2026-10-29). Fixed Income, EPF and PPF are not here: they have their own page (`/fixed-income`).

## The sample

Every trade, price and rate is **made up** (his tabs are empty, so there is nothing real to draw yet). "Today" is Saturday Oct 31, 2026: the markets are shut, so every price is Friday's close. The sample is shaped like his profile: ten holdings worth ₹55.48L on ₹43.33L put in (+28.0%).

| Group | Holdings |
|---|---|
| NetApp (US) | NTAP: 7 ESPP purchases, 11 quarterly RSU vests each with a same-day sell-to-cover, one market sale. 191 shares held, 36.7% of the whole. |
| US ETFs | VOO, QQQ, bought through a US broker, each trade with its own USD/INR rate |
| India equity | HDFC Bank, Infosys (one partial sale), Reliance |
| India funds | Nippon Nifty 50 BeES (ETF), Parag Parikh Flexi Cap (a mutual fund, fractional units, priced from AMFI) |
| Debt and gold | ICICI Pru Corporate Bond (its NAV is two days old: the **stale** state), Nippon Gold BeES |

The fold (weighted-average cost, same-day Buy first, a US trade at its own rate, float dust) is a copy of `lib/aggregate/investments.ts` in `generator/data.mjs`, so every figure on a board agrees with every other.

## Round 1 (2026-10-31)

Every board has the shared greeting (**its figures point**: holdings, worth, gain, NetApp, the day's move, USD/INR), an attention strip (the stale NAV), one hero, and the same widgets underneath: holdings table, allocation, recent trades, NetApp shares, Friday's movers, and prices and rates. The hero is the only difference.

| Artboard | The hero's idea |
|---|---|
| `InvI1` Bridge | Who made the money. A waterfall from what you put in, through each holding's gain or loss, to what it is worth. The rupee's move is its own step, held apart from the price moves. |
| `InvI2` Strata | The layers money was laid down in, month by month, one band per holding, with a green cap at the right edge for today's gain. RSU vests and ESPP purchases are ticks along the foot. It draws what the log alone can: cost, not value. Round 2 draws value over time, which needs a daily price for every holding. |
| `InvI3` Exposure | A two-ring donut (holding outside, kind of asset inside) with NetApp pulled out, and a card that says the biggest holding is also the employer, plus the biggest few, single companies against funds, and rupees against dollars. |
| `InvI4` Board | A departures board: a row of split-flap digits per holding, an index strip (Nifty, Sensex, S&P, Nasdaq, USD/INR, gold) and a light that goes amber when a price is old. |
| `InvI5` Rulers | A ruler per holding: its 52-week range, a tick for what you paid on average, a diamond for today's price, and the stretch between them coloured ahead or behind. |

## Round 2 (2026-10-31): interactive, after a dashboard he shared

Prathik shared a dashboard he liked (a dark performance stage with range chips and a crosshair, three KPI cards, a portfolio card with an allocation strip, a trading-activity grid, trending sparkline cards and a transactions feed) and asked for beautiful, unique variations with good widgets and interactions. Five boards, each its own idea. **Every interaction works in the browser with no script** (radios and `:has()`, as on the other canvases): open any `InvJ*.dc.html`.

| Artboard | The hero's idea | Interactions |
|---|---|---|
| `InvJ1` Stage | The shared dashboard's shape, made ours: a dark stage of worth against what you put in, with bars for money added along the foot. Three KPI cards (total return, yearly return, deepest fall), a portfolio card, a month-by-year money-in matrix, sparkline cards for each holding and a transactions feed. | Range chips (1M to All) re-draw the chart and its headline change; a crosshair and tooltip on any day; every KPI points; matrix cells open the month's trades; the sparkline cards scroll |
| `InvJ2` Lens | Pick a holding (or everything): its price on one line, a dashed line for what you paid, and a mark for every trade of yours (bought, ESPP, RSU vest, sold). Stats, the latest trades and where it stands against its 52 weeks go with it. | The picker (11 views); a crosshair on every view; each mark has its own hover |
| `InvJ3` Race | You against Nifty 50, the S&P 500 in rupees, gold and a 7% deposit, all starting at 100. A leaderboard, "the same money somewhere else" (your buys and sales on their own dates, put into each), and year by year. | Range chips; switch any line on or off; a tooltip listing every line on any day; the leaderboard follows the range |
| `InvJ4` Rings | Growth rings: a ring a year (innermost is 2021), a spoke a month, taller is more money in, coloured by how it came (bought, ESPP, RSU vest), a red mark inside the ring for a sale. The rhythm (months with a buy, longest run) and "what usually comes next". | Filter by source (the others fade); hover a spoke and the centre shows the month |
| `InvJ5` Flow | A flow diagram: money in by how it came (cash, ESPP, RSU), what each holding became (solid is what you put in, green hatching a gain, red a loss), and where it sits (India equity, US equity, debt, gold). | Hover a flow and the rest fades |

Round 2 also adds: nice round axis ticks, a tooltip that flips at the edge, and `charts.mjs` (one chart builder behind J1 to J3).

**What round 2 needs that round 1 didn't (all proposals, all made up in the sample):**
- **A daily price for every holding**, to draw value over time, the yearly return and the deepest fall. Yahoo's chart API and AMFI's NAV history are the likely sources; it must be checked in a spike before it's promised (the 2026-10-27 spike only fetched today's prices). The earlier line "past prices can't be reconstructed" in the PRD gap review (F-OV-07) may therefore be too strong for stocks, ETFs and funds; it still holds for past USD/INR on a given day only if Frankfurter fails.
- **Yearly return and deepest fall are time-weighted**: each day's return is the day's change in value less what was bought or sold that day, so money added later doesn't flatter or hide it. Whether an RSU vest is money added is open question 3. XIRR is still undecided.
- **Benchmarks** (Nifty 50, the S&P 500, gold) need their own price history. The S&P is counted in rupees. This is F-OV-08 (P2, "not excluded"); a 7% deposit is a flat assumption, not a rate you set.
- **"The same money somewhere else"** puts each buy and sale on its own date into the index and compares the result. It is a counterfactual, never advice.
- **"What usually comes next"** (the next RSU vest and ESPP purchase) is F-IV-06, which narrowly reopens "vesting schedules" as a list. Not decided; the dates are guessed from the pattern.

## Round 3 (2026-10-31): the dark stage and the lens together

Prathik liked J1's stage and J2's lens and asked to see them together, on a dark background like the shared dashboard's, with: the **holdings carousel across the whole width**, the **money-in grid**, **"the same money somewhere else"**, the **holdings table**, and **the Race as a toggle** rather than a widget of its own. Five variations, all with the same content and each with its own way to pick and move around. As before, everything works in the browser with no script.

One dark stage now serves both ideas. Pick **Everything** and you get Worth or Race (the toggle), the range chips, the money-added bars and a crosshair, with the three KPI cards under it. Pick **a holding** and the stage becomes its lens: its price, a dashed line for what you paid, a mark for each of your trades, and six stats under it. Worth, Race and the range chips are for Everything only, so they dim when a holding is picked.

| Artboard | How it picks and moves | What's different |
|---|---|---|
| `InvK1` Cockpit | A row of chips above the stage (Everything, then each holding with its gain) | The plainest: stage, carousel, money-in beside the same-money list, holdings table |
| `InvK2` Rail | A watchlist down the left of the stage: each row has a sparkline and its gain, and the picked row lights up | The same-money cards run full width as five tiles; money-in sits beside the portfolio card |
| `InvK3` Dock | The sparkline cards are the picker, docked inside the stage across its whole width: tap a card and the stage above follows | The carousel is part of the stage, so there is no separate carousel |
| `InvK4` Night | A ticker tape that scrolls on its own (it pauses on hover) and picks | **The whole page dark**, not just the stage; the shell, cards, chips and tables all follow |
| `InvK5` Time machine | An **As of** control (Today, 1M, 6M, 1Y, 2Y ago) that takes the stage, the headline, the KPIs and the holdings table back to that day | A dashed marker and a dimmed "since then" on the chart; the table shows each holding as it stood, with how its price has moved since; a holding you hadn't bought yet is left out |

Every board also has: a carousel of holdings across the page (scrolls, cards lift on hover), the money-in grid (hover a month for its trades), "the same money somewhere else" (as five tiles or as a list), and a holdings table with an All / India / US filter that works.

**"Understand it" widgets (added to K1 to K5 on 2026-10-31)**, asked for to show how the money is split, how it might improve, and other relevant detail. Each board has the same seven, arranged differently (`design/investments/generator/widgets4.mjs`):

| Widget | What it shows | Interaction |
|---|---|---|
| How it's split | A donut and list, sliced six ways: asset class, market, company or fund, sector, holding, and how it came in (cash, ESPP, RSU vests) | Slice chips; hover a row and its slice lights up, or hover a slice and its row |
| Your targets | Four buckets against targets **you** set, with the drift in rupees, what you'd move to land exactly on them, and where new money would go | Chips for adding ₹50k, ₹1L, ₹2L, ₹5L: it goes only where you're below target, in proportion to how far below, and never sells |
| Weight against return | A bubble per holding: share of what you hold against return on cost, bigger is worth more | Hover a bubble |
| What if | Today, USD/INR ±5%, US prices −20%, India equity −20%, NetApp −30%, all equity −15%, gold −10%: the new total, how much of today's gain it takes, and each holding's change | Scenario chips |
| Where it could go in ten years | Today's value grown at a yearly return you pick, with nothing added, ₹25,000 or ₹50,000 a month | Return chips (6, 9, 12%) and line toggles |
| How concentrated | How many holdings make half and 80%, "like holding" N equal ones, every holding as a ladder, and **your own limits** (one holding at most 30%, dollars at most 70%, debt at least 5%, single companies at most 50%) with the breaches marked | Hover a piece of the ladder |
| Who made the gain | Each holding's gain split into price and rupee, and its share of the whole gain | None |

**These are measures, not advice.** The page never suggests a split, a limit, a trade or a return. Targets, limits and the growth return are numbers you set (the sample's are made up); each widget only does the sum against them, and says so. A breach of your own limit isn't a call to act. What-ifs are shocks to today's prices, not forecasts. Sector for a fund or ETF is its main tilt (proposed), and "like holding" is 1 divided by the sum of each holding's share squared.

**New proposals in round 3** (all made up in the sample; none decided or built):
- **As-of values** need the price and USD/INR on a past day for every holding (the same daily history as round 2), and the holding as it stood that day, which the trade log already gives (`lib/aggregate/investments.ts` folded up to a date).
- **"The market since"** on the as-of view is the time-weighted return from that day to now, and "Added since" is buys less sales since then.
- The **night page** is a proposal for the whole app's theme, not only this page: the app has a light theme only today.

## The picked design (2026-11-02): L1 Giant

Prathik picked L1 Giant. The final boards in [`design/investments/`](../../design/investments/), built by the same generator (`generator/final.mjs`):

| Artboard | What it shows |
|---|---|
| `InvFinal` | **The page.** The holdings strip that picks what to look at (Everything, or one holding), the dark stage (a 76px portfolio number, the chart, Go back to a day, Worth or Race, the range), the returns under it, the holdings as they stood (with an All, India or US filter), money in beside the same money elsewhere, and Understand it |
| `InvPhone` | Four phones: the page, returns and holdings as cards, one holding's lens, and the Add trade bottom sheet. Only the stage is live |
| `InvStates` | No trades yet, the price sources down (saved prices used and marked old), a sell that is more than was held, going back to before you started, and a holding with no price ticker |
| `InvForms` | Add a trade, **Edit a trade** (2026-11-05: the same fields filled in, a "was 60" tag on what changed, and what it does to the holdings), Sell (too many, with its error), **Edit an RSU vest** (2026-11-05: a vest is two trades, so editing either opens both and they save together or not at all), Record an RSU vest, Record an ESPP purchase, Add an instrument, Your targets and limits, and Delete with Undo. An ESPP purchase edits like a single trade. On the phone (`InvPhone`, a sixth phone, "Edit a trade") it is the Add a trade sheet filled in, reached from the pencil on a trade in a holding's lens, with Delete trade under Save changes. |

**Symmetry (Prathik, 2026-11-02):** every row of the page is two equal columns or one full-width card, never a mix of 7 and 5 or 4 and 8. The Understand it section is split | targets, weight map | who made the gain, what if | concentration, then the growth chart across the page. Every card in a row ends level.

**What the pick includes, and the defaults I'm assuming.** He picked the whole L1 page and answered none of the open questions, so the page keeps everything as drawn and every item below stays a proposal until he says otherwise: the as-of control (Q14), the Race toggle and its benchmarks (Q9), targets and limits as an optional feature (Q11), the growth path (Q12), the employer line (Q6), the stage dark with the rest of the page light (Q10: only K4 was a dark page, and wasn't picked), and the sector tags (a fund by its main tilt).

**Build, when he asks for it** (the process.md Plan stage, not started): first the price history spike, then F-IV-03 (prices), the RSU and ESPP forms (F-IV-11), the holdings page without the stage, then the stage and lens (F-IV-09 and F-IV-10) once history is in, then Understand it, as-of and targets last. The money-math functions are listed in `system-design.md` ("Investments page") and each gets a test that proves the math before a page uses it.

## How it's split: five fuller layouts (2026-11-02)

The "How it's split" widget (a donut and a list, six ways to slice) left white space whenever a slice had few rows (asset class has three), because its card is stretched to match its neighbour and the donut floated in the middle. Five layouts that fill a fixed height whatever the slice, on `InvSplit`, next to today's for comparison. The six slice chips drive every card at once, so flipping through the slices compares them:

| Layout | How it fills the card | Best for |
|---|---|---|
| Treemap | Area is worth; each slice is a block with its holdings inside it as tiles | Everything, and the only one that shows slice and holdings together |
| Waffle | A hundred squares (1% each) beside tiles with a big % per slice | A quick count of proportions |
| Columns | One tall column per slice with its holdings stacked inside | Comparing slices side by side |
| Rings | Inner ring the slices, outer ring the holdings, beside tiles | Seeing the hierarchy |
| Rows | Rows that stretch to fill, each with chips for the holdings in it | A lopsided slice (asset class: 97, 2, 1) |

My lean: the **Treemap**, with the Rows layout as its fallback when one slice is nearly everything. Not yet applied to the page: it waits for his pick.

### Five cooler, more interactive layouts (same day, `InvSplit2`)

Prathik asked for more variations with cool, interactive visuals. All fill the same fixed height whatever the slice, and none needs a script (radios, `:has()`, CSS animation and `clip-path`):

| Layout | The idea | Interactions |
|---|---|---|
| Sunburst | Rings of the whole: asset class, market, then holdings | Click a ring piece to zoom into it, the back pill to come out, Reset; hover fades the rest |
| Bubbles | Each holding a bubble, packed inside a dashed ring for its slice | The six slice chips regroup them; hover a bubble to see it, a ring to fade the rest |
| Flow | How one slicing spreads into another, for example market into asset class | Two chip rows pick the from and the to; hover a flow to follow it |
| Pillar | A tall pillar of layers, each as high as its share | Tap a layer and its holdings open beside it with the bars growing in |
| Orbits | Each slice a planet on its own orbit, its holdings as moons | The orbits turn on their own and pause on hover; the six slice chips change what orbits |

The Treemap from the first round sits beside them for comparison. None is applied to the final page yet. The animated Orbits respect "reduce motion" (they stop).

### Six donut and pie takes (2026-11-04, `InvDonuts`)

Asked for unique donut and pie ideas that are interactive. All use the same six slicings and work with no script (radios, `:has()`, CSS transitions, `clip-path`, 3D transforms); all respect "reduce motion":

| Take | The idea | Interaction |
|---|---|---|
| Morph | Ten arcs, one per holding, that slide and recolour into each slicing instead of being redrawn | The slice chips: the arcs glide to their new places |
| Spin wheel | A two-ring wheel (holdings outside, slices inside) with a pointer at the top | Pick a slice and the wheel spins to it; its holdings show beside it |
| Explode | A pie whose slice pulls out and unfolds a ring of its holdings | Tap a slice or its chip |
| Gauge | A half donut with a needle | Pick a slice and the needle swings to it, with a read-out |
| 3D stack | Six donuts, one per slicing, tilted and stacked | Hover lifts a layer; tap makes it the slicing |
| Rose | Every slice the same width, its petal as far as its worth (so tiny slices stay visible) | Petals grow in; hover fades the rest |

None is applied to the final page. My lean for the page is still the Treemap; Morph is the one I'd add if he wants a donut.

### Picked for the page: the Spin wheel, and a Treemap as a toggle (2026-11-04)

Prathik picked the **Spin wheel** and asked for a treemap in the **Subscriptions cost map's style** as a toggle beside it. "How it's split" on the final page (`InvFinal`, built by `generator/splitwidget.mjs`) is now one card: a **Spin wheel | Treemap** toggle, the same six slice chips for both, and everything else of the page unchanged.

The treemap copies what the Subscriptions map does (`src/components/subscriptions/CostMapCard.tsx`, `treemap.ts`):

- **Blocks** are the app's card-colour gradients with the ring texture, sized by worth (a squarified treemap, the same algorithm as `treemap.ts`). A big block shows its name, kind, share, and worth; a middle one its name and worth; a tiny one its initials.
- **Slicing glides:** pick Asset class, Market, Company or fund or Sector and the same blocks slide into their group's tile (which takes the group's colour, with its name and total on top), as "By category" does there. Holding view is the flat map in each holding's own colour. How it came in isn't a layout here, so the treemap shows the holdings.
- **Hover** lifts a block and steps the others back (greyer and a little faded), and opens a card (quantity, what you paid, gain, today).
- **Click** picks a holding: a ring and a check on the block, and a line under the map about it.
- **Try without** (Holding view): hover a block, press it, and the block folds away and the others grow, with a line "Without NetApp: ₹35.09L left, a gain of ₹7.94L". Nothing is changed or saved; "Put it back" undoes it. It's the Subscriptions what-if. It works in Holding view only (the grouped views would each need their own precomputed layout).

What the page doesn't do there: no A month / A year toggle (it has no equivalent), and no By-category-style drag. The Spin wheel is exactly the round's version, a little smaller to fit the half-width card.

## Round 4 (2026-10-31): the Time machine, with a calmer hero

Prathik liked K5 but found its hero overdone. What changed, on all four boards (L1 to L4):

- **The holdings carousel moves above the hero and is the picker.** It's the card strip from round 3, now with an "Everything" card first: tap one and the stage and the figures follow. The chip picker inside the hero is gone.
- **The returns move out of the hero**, to a "Returns" row under it: the three KPI cards for Everything (or four cards for a day you went back to: worth then, put in then, added since, the market since), or the six stats for one holding. They're light cards on the page now, not dark ones in the stage.
- **The hero keeps three things**: a thin control row (go back to a day, Worth or Race, the range), the portfolio number, and the chart. The "10 holdings" and "NetApp 37%" pills, the title and the explanatory line are gone.
- **The number gets big, but not huge** (first drawn at 112 to 156px, then brought down to 76 to 100px on Prathik's say so, and the chart made taller (about 520px) so the hero doesn't look lean). Four ways, one per board:

| Artboard | The big number |
|---|---|
| `InvL1` Giant | 76px, alone, with the change at the right |
| `InvL2` Poster | 100px, laid over the chart's quiet top corner (the chart leaves headroom for it, and its axis labels are hidden so nothing fights the number) |
| `InvL3` Split | 76px with one bar under it: what you put in, and what it made. It goes back to the day you pick |
| `InvL4` Flip | The number as split-flap tiles that flip in when the page opens; it flips to the price when you pick a holding |

Everything else of K5 stays: the as-of holdings table, money in, the same money, and "Understand it". A holding's own head (its tile, name and price) uses the same big treatment.

Not yet designed, now that the page is picked: the as-of version of the phone, a dark theme for the whole app, the Overview attention items, and a date picker for going back to a custom day. The phone layout, the states and the forms that used to be on this list are drawn (see "The picked design").

## Key metrics (reviewed 2026-11-04)

Prathik asked what the dashboard has for CAGR, ROI and the other key metrics, and what is missing. The final page draws **total return** (gain over cost, which is ROI), a **time-weighted yearly return**, the **deepest fall**, the **rupee split**, the **Race** against the indexes, **concentration** and the what-ifs. It draws **no XIRR, no CAGR, no one-figure comparison with an index, and no dividends or realised gain in the return**. He said yes to adding them (PRD v1.25):

| Metric | Why it matters for him | PRD | State |
|---|---|---|---|
| **Worth against cost**, in rupees and % | The base figure | F-IV-03 | On the page; needs live prices |
| **XIRR**, overall and per holding | His money goes in as ESPP and RSU vests over years, so a gain % says nothing about how long it took. It is the headline return, "what my money earned a year". | F-IV-15 | **Drawn 2026-11-04** (a card, a stat per holding). Q12 answered |
| **CAGR** per holding | A cheap add once XIRR exists (each holding has a first buy) | F-IV-15 | Drawn: a holding's *Price a year* stat |
| **Time-weighted return**, and **ahead or behind Nifty 50 and the S&P by X% a year** | XIRR says what he earned; this says whether holding the index would have done better. The Race draws it, the figure says it. | F-IV-16 | **Drawn 2026-11-04**: the *Against the index* card |
| **Rupee split** of a US gain | NetApp and the US ETFs are a large share, and part of their gain is the dollar | F-IV-13 | On the page (a proposal until his yes) |
| **Concentration**, with NetApp named | His pay and his largest holding depend on the same company. A plain fact, never advice. | F-IV-13 | On the page |
| **Dividends and interest** in the return | Without them a payer's return is understated, and statements read later can't be read earlier | F-IN-03 | **Drawn**: the *Dividends* card, and a holding's stat (made-up payments) |
| **Fees and withheld tax** in cost basis | Left out, every return is flattered by a little that compounds | F-IV-04 | **Wanted**: decide before the first real trade. Not drawn: no fee is in the sample |
| **Realised gain**, beside the unrealised | His RSU sell-to-cover sales produce it from the first vest | F-IV-17 | **Drawn**: the *Made on shares sold* card, and in *Total return* |

**Left out on purpose:** Sharpe, Sortino and beta (about ten holdings and a short history give false precision), and the ten-year growth path as a headline (it reads as a forecast; it stays an optional widget, Q12 below). Volatility and per-holding drawdown length are possible later, once the daily price history exists.

**Redrawn 2026-11-04** (`InvFinal`, `InvPhone`, `InvStates`, `InvForms`; the sums are `generator/returns.mjs`, the cards `generator/returnsui.mjs`, still made-up data):
- **Greeting:** one more sentence, with two figures that point: "Over 5.1 years your money has earned **16.1% a year**, **4.2% a year ahead of Nifty 50**." The cards say what counts as cash in and how the index gap is worked out.
- **Returns row for Everything: six cards, two rows of three.** *Yearly return* (XIRR, 16.1%), *Against the index* (+4.2% a year against Nifty 50, with the S&P as a pill: +0.5%), *Total return* (all in: +₹14.81L, +29.2% on every buy: what is still held, what sales made, dividends), then *Made on shares sold* (+₹2.11L from 13 sales), *Dividends* (₹55,700, 23 payments) and *Deepest fall*. The old *Yearly return* (time-weighted) card is folded into *Against the index*, whose hover lists you, Nifty, the S&P in rupees, gold and a 7% deposit. The new cards carry a "New" tag.
- **One holding: eight stats, two rows of four.** You hold, You paid, Worth, Gain, then *Yearly return* (XIRR), *Price a year* (the price's CAGR since its first trade: a clean figure only because it is one price to another), *Made on sales* (with its dividends) and the 52-week range. NetApp reads 25.4% a year.
- **Going back to a day: eight cards.** The four old ones, then *Yearly return then*, *Made on sales then*, *Dividends then* and *Against Nifty since* (the plain gap, not a yearly rate, since a few months annualised would mislead).
- **State F, too early for a yearly return:** a holding held under a year shows its plain gain and "Too early" where a yearly figure would swing wildly. **One year is the line (decided 2026-11-04).** With no price (state E) or no trades (state A) the figures are dashes.
- **Phone:** the greeting sentence, six return cards two across, and two more stats (yearly return and made on sales) on a holding's lens. **Forms:** the RSU vest and ESPP purchase forms now say how each counts in the yearly return.
- **The sample's numbers:** yearly return (XIRR) 16.1%, time-weighted 12.8% a year, against Nifty 8.6%, the S&P in rupees 12.2%, gold 20.3%. The RSU choice matters: the same flows with RSU shares left out as free would read much higher, which is why Q12 had to be answered.

## Cash at your brokers (added 2026-11-04)

Prathik asked where the cash lying in his investment accounts is accounted for (his example: $3,000 in the US stock account, ₹1 lakh at the Indian broker). The design had nowhere for it: the page counted holdings only, and Accounts has no brokerage type or currency (PRD F-AC-05 was a proposal). He said yes to writing it in and drawing it (PRD v1.30: F-IV-18 added, F-AC-05 widened, Q13 opened; the rules were accepted on 2026-11-05).

**The rules (proposed, each needs his yes before it's built, PRD Q13):**
- **A broker's cash is an account**, not an investment: type Brokerage, purpose Investment, a `currency` (INR or USD), and a balance read off a statement or typed in, exactly like a bank balance (so the stale rule, the 20% check and the statement import all apply). It lives on Accounts and counts **once** in net worth. Investments only *shows* it.
- **It is not in the holdings' worth, the split or the yearly return.** A transfer to a broker is not a gain, and idle cash earns nothing, so counting it would drag the XIRR down for no reason. The greeting says it beside the worth, and the card says how much of everything at the brokers is idle.
- **A dollar balance has no cost basis.** It is valued at today's rate, and the rupee's move on it is not called gain (the rupee split is for holdings).
- *(Changed 2026-11-09: a trade is in a brokerage account, picked from Accounts, and "Paid from" is gone. See system-design "A trade's broker is its brokerage account".)* **A trade can say where it was paid from.** *Paid from* lists the cash accounts as well as bank accounts; the form shows what the cash is after. A buy larger than the cash on record is a **warning, never a block**: the balance may be days old. A sell's proceeds land in the same account.
- **Interest on idle cash** (a broker that pays on it) is F-IN-03, not drawn here. **Going back to a day** does not change the card (a past balance is on Accounts' history); the card says it is today's.
- **Not drawn:** a Cash slice in *How it's split* and in the targets. Cash is a different kind of thing from a holding (no price, no gain, no share of a company), so it sits beside the split, not inside it; the card's own bar says how much is idle. The Accounts boards are redrawn for it (an account's Brokerage type and currency in the Add account form, a dollar balance on its card): see [`accounts.md`](accounts.md) "Broker cash accounts". The build plan is [`broker-cash.md`](broker-cash.md).

**Drawn 2026-11-04** (`InvFinal`, `InvPhone`, `InvStates`, `InvForms`; the sums are `generator/cash.mjs`, the card `generator/cashui.mjs`, still made-up data):
- **Greeting:** one more figure that points, "**₹3.70L waits as cash** at two brokers", with a card listing each balance, its date and what it is in rupees.
- **The card, full width, between the holdings table and the money-in row:** the idle share in a bar (holdings against cash, **6.3% idle** in the sample), then one tile per broker account: its balance in its own money (**$3,000.00** and **₹1,00,000**), what it is in rupees at today's rate (₹2,70,450), the date it was read and where from (Statement or Manual), and what that broker holds. A stale balance (over 30 days) gets the same amber tag as a stale price.
- **Add trade, *Paid from*:** the cash accounts are listed first, and the preview gains a line, "Vested cash after: $3,000.00 → **$474.40**".
- **A new form, Add broker cash:** name, broker, currency, balance and the day it was read, with the account's tile as the preview. (On Accounts it is the Add account form with a Brokerage type; this one is the shortcut from Investments.)
- **State G, cash is old:** a balance 49 days old keeps counting, is tagged stale, and the card asks for a new balance. **State H, a buy larger than the cash:** the form warns and still saves.
- **Phone:** the card, a tile per account stacked, and the greeting figure.
- **The sample's numbers:** holdings ₹55.48L, cash ₹3.70L ($3,000 at ₹90.15 and ₹1,00,000), ₹59.18L at the brokers all told, **6.3% of it idle**. The XIRR stays 16.1%.

## The Trades page, round 1 (2026-11-08)

Prathik noticed Investments had no full history the way Cards has Statements and Income has Entries: his trades only show in the eight-row Recent trades card. Round 1 draws three takes at `/investments/trades` on the canvas page "Exploration · Trades page, round 1" (`InvT1`–`InvT3`, generator `trades.mjs`). All three share the sub-page header (back link "Investments · Trades", title, one sentence) and four tiles: **Put in** (buys, ESPP at what he paid, RSU vests at their value on the day, as in Q12), **Taken out** (sales and sell-to-covers), **Net put in**, **Made on shares sold** (at weighted-average cost). An RSU vest and its sell-to-cover are one row, as in Recent trades.

- **T1 Tape**: every trade, newest first, grouped by month with that month's money in and out. Filters: kind (buys, sales, RSU vests, ESPP), India or US, and **financial year** (April to March); the tiles follow the year. A US trade shows dollars with rupees under it at its saved rate. A sale shows what it made. Holding, broker and search are drawn but not live.
- **T2 Book**: one holding (`?holding=NTAP`), reached from the stage or the holdings table. Every trade with **shares held after** and **average cost after**, with how much the trade moved the average (a sale never moves it). A step chart of shares held, a dot for each trade. "How the shares came in" splits bought / ESPP / RSU from what was sold, and what a share cost by how it came, compared with today's price. It could be T1's second mode or its own page.
- **T3 Months**: a calendar, one square a month: what went in above the line (stacked by bought / ESPP / RSU), what came out below. Pick a month and its trades open on the right. The five biggest months are listed under it, and each row ends with that year's totals.

Left out on purpose: capital-gains tax by holding period (needs his rules), dividends (not recorded yet), a phone layout (comes after the pick).

**Picked 2026-11-08: T1 + T2.** T1 Tape is the page; T2 Book is the same page with one holding picked (`/investments/trades?holding=NTAP`). A holding's name on the list (or one picked in Every holding) opens its book; an **All trades** chip goes back. The stage's holding header and the Investments holdings table link to the book; Recent trades' **All trades** link opens the list. T3 is not picked (canvas page relabelled). Final boards on "FINAL: Trades page": `InvT1`, `InvT2`, `InvTPhone` (the list and one holding's book) and `InvTStates`:

- A: no trades yet (zero tiles, Add a trade / Record an RSU vest / Record an ESPP purchase).
- B: the filters match nothing (says what's missing and offers the nearest year that has some).
- C: a sale more than was held (the row in red, Fix the trade; the book reads "Held after 0 · over by 20").
- D: a holding sold out. Its book stays and it's listed under Sold out in the holding picker.
- E: `?holding=` names a holding that isn't in the trades (notice, every trade shown).
- F: rows that couldn't be read (the usual skipped-rows notice).

Still open: the year filter is drawn as financial year (April to March) only; calendar year as well is his call. Defaulting to financial year until he says otherwise.

**Built 2026-11-08** (F-IV-19). Differences from the boards: the holding chips list every holding (with a Sold out group), not four and "and N more"; on a phone the holding, broker and search controls wrap under the chips instead of a Filter sheet.

## Rules the sample assumes (each needs his yes before it's built)

They are in `generator/data.mjs`. None of them is built in `lib/aggregate/`.

- **The rupee split.** A US holding's gain = (value in dollars − cost in dollars) × the rate you paid, plus value in dollars × (today's rate − the rate you paid). The first is "price", the second is "the rupee". They add up to the whole gain exactly. (Proposed: the order matters, and the other way round gives different halves.)
- **Day change** is value today less value at the previous close, with the previous close's USD/INR, so a US holding's move includes the rupee's.
- **Made on shares already sold** (realised gain) = a sell's proceeds less the weighted-average cost removed. It is shown beside the gain, never added to it, and is not in net worth. Proposed; PRD gap review lists it.
- **An RSU vest** is a Buy at fair value on the vest day, its sell-to-cover a Sell the same day, so the cost of what is kept is the fair value (already how `computeHoldings` treats them). Whether a vest counts as "money in" on the Strata board is open (below).
- **"Employer"** marks NetApp on the page and the greeting says it is 36.7% of what he holds. These are facts about today's value; the page suggests no target split and gives no advice.
- **Prices** come from `lib/prices/` (Yahoo, AMFI, Frankfurter; PRD Q2) and are saved once a day to a `PriceSnapshots` log, with the last one used and marked stale when a source is down. Not built.
- **Broker cash** (2026-11-04, PRD F-IV-18 and Q13) is an account with a currency, valued at today's rate, shown beside the holdings and outside the worth and the XIRR; a trade's *Paid from* may name it and a buy larger than the cash is a warning. See "Cash at your brokers" above.
- **Yearly return (XIRR)** is **wanted** (2026-11-04, F-IV-15) and now drawn on the final boards. How RSU vests and ESPP purchases count was **answered 2026-11-04 (PRD Q12)**: an RSU vest is cash in at fair value on its day and its same-day sell-to-cover is cash out; an ESPP purchase is cash in at what he paid (the discount shows as return); dividends are cash received; fees are part of what a trade cost. The sample's "money in" on the Strata board counted vests at fair value already.

## Open questions for Prathik

1. **Real holdings.** Should round 2 be drawn on his real holdings? That needs the trades in the tabs (or the tickers, quantities and dates told to me), since both tabs are empty.
2. **Is the rupee's part worth its own step and chip?** It is 15% of the sample's gain. Or should a US holding simply show one gain?
3. **Does an RSU vest count as "money in"?** It is shares that came out of pay, not cash from his account. The Strata board counts it at fair value and says so. **Answered 2026-11-04 (PRD Q12): yes, at fair value on the vest day, with the sell-to-cover as cash out. An ESPP purchase counts at what he paid.**
4. **Sales:** **answered 2026-11-04: show it** (PRD F-IV-17), beside the unrealised gain and counted in total return, never in net worth.
5. **Yearly return (XIRR):** **wanted (2026-11-04), and answered:** RSU vest as cash in at fair value, ESPP as what he paid (PRD Q12).
6. **The employer line:** keep "NetApp is also the employer" as a plain fact, or drop it?
7. **Which hero, or which parts of which?** A page can take the Bridge's gain split and the Rulers' per-holding stand, for instance, or the Stage's chart with the Lens beneath it.
8. **History:** is a value-over-time chart wanted from day one? It needs the price-history spike first (see Round 2).
9. **Benchmarks:** Nifty and the S&P, yes or no? And is a flat 7% deposit a fair yardstick, or would you rather pick a rate?
10. **Dark:** only the stage dark (K1, K2, K3, K5), or the whole page dark (K4)? A dark page would mean a dark theme for every dashboard.
11. **Your targets and limits:** are the four buckets the right ones to set targets on, and do you want limits at all? They would be stored (a small `InvestmentTargets` tab) and only ever compared, never suggested.
12. **Growth path:** is a ten-year what-if wanted, or does it read as a forecast? It can be dropped.
13. **Which big number?** Giant, Poster, Split or Flip (round 4)? Or the plain stage's smaller number?
14. **As of:** is going back to a day wanted (K5), or is that too much? It needs the daily price history.
15. **Upcoming vests and ESPP dates:** a list on the page (F-IV-06), or leave out?
16. **Broker cash (2026-11-04):** the rules above (an account, outside the worth and the yearly return, a warning and never a block on a buy larger than the cash). Should a *with cash* switch on the stage show the other view, and should the greeting's worth ever include it? Defaults shown: no and no.

Proposals still open from the 2026-10-26 review (an `Instruments` tab, the `PriceSnapshots` log, EPF and PPF modelling, what a trade's `total` means once there are fees) are listed in `system-design.md` and the PRD, and are unchanged by this round.
