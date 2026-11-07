# Overview page (`/`)

**Status: two rounds of the redesign (F-OV-05), 2026-11-07, nothing picked.** Round 1: five hero ideas on the shared page. Round 2 (below): four bolder whole-page ideas, after Prathik asked for something cooler that doesn't have to follow the other dashboards. The Overview is the one page still in the old design; the data behind it is built (net worth, monthly obligations, What needs attention, the bank trend). Mockups: [`design/overview/`](../../design/overview/), built by [`design/overview/generator/`](../../design/overview/generator/) (a rebuild overwrites the artboards, so change the generator). Every figure is made up, but shaped like the real inputs; "today" is Sat Nov 7, 2026.

## What the page answers

1. What am I worth today, and what is it made of? (owned less owed)
2. What falls due this month, how much of it is paid, how much is left?
3. What needs a look right now? (the same list as today's page, plus what Lent out and Goals add)
4. What is coming in and out in the next 30 days, and how low do my bank accounts get?
5. Where is each part of my money, and where do I go to act on it? (a tile per section)

Not on it, because the data can't be reconstructed yet: **net worth over time** (F-OV-06, P2). A past loan, card and investment state isn't stored, so no board draws a net-worth trend and no sentence claims a change ("up ₹X this month"). The bank balance trend stays, as today.

## Every board shares

The greeting (its figures point, as on every dashboard: net worth, owned, owed, due this month, still to pay, the next EMI, things needing a look), the first two attention items as a strip, **a tile for every section** (headline number, one line, a flag when something needs a look; each is a link), What needs attention beside This month, Coming up beside the bank balance. Only the hero differs. Cards side by side end level (`audit.sh` passes on all five).

## The five heroes

| Board | The hero's idea | Pick |
|---|---|---|
| `OvO1` Two sides of the ledger | Owned stacked on the left; owed plus what you keep (net worth, dashed) on the right. Same height, because owned = owed + net worth. | A block: what it is, its share, **net worth without it** (without investments you'd be −₹5.12L, which is the honest point of the board) |
| `OvO2` How fast you could reach it | The same money in five columns by how soon you could hold it: today, within a week, within weeks at a cost, when someone else pays, locked. A running "you'd have" above each. | A block: how, what it costs to reach, how many times it covers this month's bills |
| `OvO3` The month ahead | The bank accounts' balance for 30 days as a step line, a numbered marker for every dated bill and payday, the lowest point marked (₹1,77,700 on 28 Nov). | An event: the balance before and after. A matured FD is dashed and off the line until it's closed |
| `OvO4` Money vitals | Six measures with a band each, like a check-up: cash cover, EMI load, card use, left after bills, owed against owned, NetApp share. Measures, never advice. | A measure: how it's worked out |
| `OvO5` Briefing | The page opens on what to do: late or waiting, today, later this month, each item with its button. Net worth shrinks to four tiles. | A chip: to pay, to collect, to decide (the rest dim) |

Each is a coloured stage that takes the colour of the pick, as on the other dashboards. None reuses a finished page's hero (the Cards tiles, the Subscriptions cover flow, the Accounts cards, the Orbit, the Investments stage).

## Final page to build (2026-11-08): Watermark icons, Timeline ending with a Calendar toggle

Prathik picked the **Watermark** icon style and the **Timeline** ending, with a **toggle to switch it to a Calendar**. Board `OvT1` is that page, built from round 8 with its design aids removed. Top to bottom: the pointing greeting; net worth (the number counting to a month you click on the trend line, its change, the type chips, the owned-against-owed ring); twelve tiles (the ten pages and "Due this month" and "Still to pay"), each with a large faint watermark glyph cropped by the tile, the cards tile keeping its card faces; *Eight things worth knowing about your money*; *Future you* with the 2 to 14% rate slider; and last, *Coming up, and what to keep in mind*, a **Timeline | Calendar** toggle at its top right.

- **Timeline:** "Needs a look now" (six things with no day of their own), then each day down a line. An item that has a warning is tagged "needs a look"; the car EMI today is red.
- **Calendar:** a month grid (7 Nov to 6 Dec), dots for money out and in, a ring where a warning belongs, a panel for the picked day, and the six warnings with no day beside it.

Left to design after this pick, as on every other page: the phone layout, the states (nothing entered yet, a dollar rate that can't be fetched, EPF unreadable, no warnings), and the real build's reading of the data (a monthly net worth snapshot; one warnings collector across the ten pages; the editable rate). The doc's earlier rounds stay as the record.

## Round 8 (2026-11-08): the refined Bento, again

Prathik's notes on round 7: the soft illustrations don't fit our design (explore five more modern icon styles); move Coming up and Keep in mind to the very end and explore a few ways of expressing them; everything else is good; Future you should have a setter for any percentage. The page is now: greeting, net worth (number, change, trend line, ring), twelve tiles, the eight things, Future you, then Coming up and Keep in mind. The cup and the soft illustrations are gone; the cards tile keeps its card faces.

**Icons.** One hand-drawn glyph set (`generator/icons-v.mjs`, 24 px grid, line plus a fill shape) dressed five ways, switched with the "Icon style" aid above the tiles: **1 Glass chip** (a line glyph in a frosted circle with a thin ring), **2 Duotone** (a squircle, the glyph in two tones; the board's default), **3 Watermark** (one oversized faint glyph cropped by the tile), **4 App badge** (a solid white squircle, the glyph in the tile's colour), **5 Orbit** (the glyph inside a ring with a dot orbiting).

**Future you** now has a **rate setter**: a slider from 2% to 14% in whole steps (the three chips are gone), the chosen rate shown large. Each step has its own chart and figures. In the real build this is a typed number, and the three assumptions it replaces (the rate of investments) are editable there.

**The last section**, four ways, switched with "How it's expressed": **A Two cards** (Coming up beside Keep in mind, as in round 7); **B One timeline** (what needs a look now with no day of its own, then every day down a line, each item tagged "needs a look" when a warning belongs to it); **C Board by when** (four columns: needs a look now, this week, later this month, December, each with its money out and in); **D Calendar** (a month grid with coloured dots for money out and in, ringed where a warning belongs; click a day for its panel; warnings with no day sit beside it). In B to D a warning that has a day (the car EMI, both card bills, the insurance premium, the matured FD) appears on that day, and the rest have none.

### Questions on round 8

1. **Which icon style?** (1 to 5; the cards tile keeps its cards in all.)
2. **Which ending?** A, B, C or D. D shows the month at a glance but is the loudest; B is the calmest to read top to bottom.
3. **The setter:** a slider alone, or a slider plus a typed field? Should the chosen rate be remembered?

## Round 7 (2026-11-08): L1 Bento, refined

Prathik picked **L1 Bento** and asked for three things.

- **A trend line in the net worth block.** The block now has the number and its change, a 13-month line you can click (a month counts the number to it, with its change pills), the type chips and the ring.
- **A mark on every tile.** Each of the twelve tiles carries a soft illustration in a light bubble: piggy bank (Accounts), rocket (Investments, with its own trend line), vault (Fixed income), money bag (Lent out), house (Loans, with the home-and-car split), coins (Income), cycle (Subscriptions), target (Goals, with their progress), shield (Insurance), calendar (Due this month). **Cards draws the real cards** (Regalia and Amex, tilted, each with its limit used), and Still to pay carries a ring of what's paid. The illustrations were switched off in round 6 when he said he didn't want the neubrutalism art; he now asks for icons on the tiles, so they are back on the tiles only. The cup stays off.
- **At the end of the page:** *Eight things worth knowing about your money* (filter by Cash, Debt, Risk, Growth, Habits; flip a card for the maths), then **Future you** below it (pick how far and what your investments earn). Both are round 2's boards (Q3 and Q1) used whole.

The trend moved into the net worth block, so the bottom row changed: **Coming up** (the next 30 days) now sits beside **Keep in mind**.

### Questions on round 7

1. **The marks:** illustrations on the tiles, or plain line icons with only the cards drawn? Cards and the little trends read well either way.
2. **The foot of the page** is long (eight things, then Future you). Keep both on the Overview, or give them their own pages with a short teaser here?
3. **What if** (can I carry a bad month?) and **Where a month goes** (a flow of the month's money) from round 2 could join below Future you. Add them?

## Round 6 (2026-11-07): the four neubrutalism layouts, whole pages, in our language

After round 5 Prathik said he doesn't want the art (the illustrations, the cup) but liked the **layouts** of the four neubrutalism pages from the "Dashboard design exploration" session, and asked for all of them explored for our design, **the whole page and not just the hero**. The art is switched off everywhere (`ART_ON = false` in `generator/art-soft.mjs`; rounds 3 and 4 are back to line icons on gradient bubbles). Each layout below is rebuilt page for page on our data, with what he asked for earlier: net worth first (big number, change, trend, owned against owed, split by type), every page in groups, and every warning in one list.

| Board | From | Layout, top to bottom |
|---|---|---|
| **L1 Bento** | Sticker Bento | Our rail and pointing greeting; a net worth block with the change, the type chips and a ring (owned outside, owed inside); **12 tiles in four columns** (the ten pages, each tagged with its group, and the two sums of the month); the monthly trend (coloured bars) beside the Keep in mind list (rows tinted by page, with an arrow) |
| **L2 Rail** | Chai Buddy | A **round colour icon rail** instead of the sidebar; the greeting in a card with a tail; net worth as **one chunky segmented bar** of what you own with a hatched strip for what you owe; 12 tiles with round icon badges and a tag; an **area trend with points**; a Keep in mind list with **tick boxes** (ticking strikes the item) |
| **L3 Poster** | Pop Poster | A **sticker nav** across the top; a big two-line title and a speech bubble; a loud net worth block with a **starburst** for the monthly change; **slightly tilted** tiles with "OWE!" flags; **halftone bars**; warnings as **speech bubbles** that alternate sides |
| **L4 Windows** | Money Town | **Folder tabs**; the hero as a window: the greeting beside a **block city** (1 block = ₹3L; what you own stands on the road, what you owe hangs underground, with the net worth billboard and the equation); 12 **app-window tiles**; the trend as **stacked blocks** (1 block = ₹2L); the list as a window with rows and arrows |

Picks work with no script: click a month on any trend and the net worth number above counts to that month (the month's change pills follow). Hover a tile for a card with the page's facts.

What was kept from the originals: the order of the sections, the 4-wide tile grid, the nav treatment, the trend and attention pair, the segmented net worth bar, the starburst, the speech bubbles and the stacked blocks. What was changed for our language: glass cards and soft gradients instead of thick ink outlines, our type instead of the display faces, our section colours, and the pointing greeting.

### Questions on round 6

1. **Which layout** (or which parts)? E.g. L1's grid with L4's block city for the hero, or L2's segmented bar on top of L1.
2. **Navigation:** keep our rail (L1), round icons (L2), a top strip (L3), or folder tabs (L4)? The other pages would follow.
3. **The twelve tiles:** the ten pages plus "Due this month" and "Still to pay". Right two extras, or something else (cash cover, net worth change)?
4. **Loudness:** L3's tilt and starburst are the furthest from the rest of the app. Keep a little of it, or none?

## Round 5 (2026-11-07): borrowing from the neubrutalism exploration, in our language

Prathik pointed at the mockups in the "Dashboard design exploration" session (four neubrutalism takes on the same Overview: Sticker Bento, Chai Buddy, Pop Poster, Money Town) and asked to take inspiration from them while following our design language. Those boards are saved on the `design-neubrutalism` branch (`design/neubrutalism/`).

**What was borrowed:** a **spot illustration for every page and type of money** (piggy bank, rocket, vault, money bag, card, house, car, coins, cycle, shield, target); the **chai-cup mascot** beside the greeting; and **Money Town**, the skyline whose buildings carry the figures.
**What was left behind:** thick ink outlines, hard offset shadows, flat poster colours, folder tabs, the retro windows, the loud type. Our boards keep the glass, the soft gradients, the stage colour and the pointing greeting.

- **The illustrations** (`generator/art-soft.mjs`) are the same shapes redrawn with a thin soft line and a drop shadow, on a light bubble, in the section's colours. They replace the line icons on rounds 3 and 4 in place: the lanes and group panes, the Map's cells, V1's treemap and group tabs, V2's total equation, N3's bars, V3's orbs.
- **The cup** stands beside every greeting on rounds 3, 4 and 5 and sways gently. It is part of the header, so the real pages would show it only if we decide to.
- **I1 Town** is a cross-section of your money. What you own stands on the road (bank, investments tower with a rocket, fixed-income vault, lent-out shop) and grows taller; what you owe hangs underground (home loan, car loan, cards) and deepens. A billboard counts the net worth, an equation panel says above ground less underground equals what you keep, and a small cup drives along the road. Slide through 13 months and every building grows or shrinks; each sign carries its figure and a beacon where its page has a warning; pick a building for its year and its warnings; the group tabs on the right hold every page and warning, as in the Bridge.

### Questions on round 5

1. **Illustrations:** keep them (everywhere, or only on the Overview)? They are soft-line spot art for every section; the real pages use line icons today.
2. **The cup:** a mascot on the Overview only, on every page, or not at all? It is the biggest change to our language.
3. **The Town** as the Overview, or a toggle beside a plainer view (River, Map)? The buildings need real scale rules (min and max heights) and the same monthly snapshots.

## Round 4 (2026-11-07): more visual, molded on two designs he liked

Prathik asked for "more visual stuff" and attached two designs: a **purple dashboard** (paired pill bars, a treemap of net worth in tiles of different sizes, white status chips such as "3.6 months of runway") and a **dark warm bento** (a stack of cards, a table of transactions, two gradient blocks for gross against net profit, vertical pill bars, concentric semicircle arcs, a progress bar). Round 4 molds both on our data and keeps net worth first, the pages in groups and every warning in one place. All figures are made up.

| Board | Taken from | What it shows |
|---|---|---|
| **V1 Capsules** | the purple design | Three status chips (5.1 months of bills covered, net worth up 8.3% this month, 11 things to keep in mind; each points). Paired pills for each month: pale is owned, dark is owed, the gap is what you keep; click one and the three figures and the net worth number count to it. Net worth beside it with a treemap of what you own (tile heights follow the month) and a bar of what you owe. Group tabs below, each with its pages and its warnings |
| **V2 Warm bento** | the dark bento | Our cards as a stack; Owned and Owed as the total equation; the warnings as a table (what, amount, status, note, when) filtered by five group tiles that carry the group's figure and warning dots; owned and owed as two gradient blocks with the net worth beside them; net worth by month as pill bars (click one and the number counts); three measures as concentric arcs (cash cover against 6 months, what you keep of what you own, goals saved); still to pay this month as a bar |
| **V3 Bubbles** | ours | Each type of money is a glowing orb sized by what it holds; debts are dashed rings; a badge counts the warnings on its page. Slide through 13 months and the orbs swell and shrink; pick an orb for its year and its warnings. The group tabs sit on the right, as in the Bridge |

The arcs' "6 months" target is a proposal, not advice (the same kind of measure as Round 1's O4). Grain on the purple stage was tried and dropped: a full-width noise layer made the stage too heavy to render, so V1 uses soft glows instead.

### Questions on round 4

1. **Which of V1, V2, V3** (or which pieces)? V2's table and arcs sit well under V1's capsules; V3's orbs could be the Map's alternative.
2. **Dark or light:** V2 is dark warm like the reference; the rest of the app is light glass with coloured stages. Should the Overview be the one dark page, or should V2 follow the light look?
3. **The three arcs** (cash cover, what you keep, goals saved): right measures? A target such as 6 months should be one you set.
4. **Card faces on the Overview:** fine to show the stack there, or leave cards to their page?

## Round 3 (2026-11-07): net worth first, every page in groups, every warning in one place

Rounds 1 and 2 were off the brief. Prathik's answers to the questions that followed: the Overview is **an overview of all the other dashboards**, and **net worth is the important metric**. He wants net worth shown as a big number with its change, a trend over time, owned against owed, and a split by type ("add details how it fits"). The other pages come as **grouped sections**. A **"things to keep in mind" list** gathers the warnings from every other page, so he tracks everything in one place. The design should be **unique and modern, with great interactions and animation, and not the hero-over-widgets layout**.

The groups: **Assets** (Accounts, Investments, Fixed income, Lent out), **Debts** (Loans, Cards), **Cash flow** (Income, Subscriptions), **Plans and cover** (Goals, Insurance). Cash flow and Plans aren't part of net worth, and the boards say so. Eleven warnings from all ten pages feed the list, ranked act now, soon or off, worth knowing, and each is tagged with its page.

| Board | The idea | The interaction |
|---|---|---|
| **N1 River** | Net worth through 13 months as a river: owned stacked above the line, owed below, net worth drawn across it | Click any month (or a layer): the number counts to that month, the cursor glides, and the right column shows every type at that month with its move. Below, four lanes (one per group): its pages, and its warnings beside them |
| **N2 Map** | A map of the money: a cell per page, sized by what it holds (owned and owed to scale; flow and plans in their own strip) | Pick a cell: the stage takes its colour, the other cells dim, the right panel becomes that page (what it adds to net worth, its facts, its warnings), and the Keep in mind list below lights that page's items. Default panel: net worth, owned against owed, a 3 / 6 / 12-month trend and the split by type |
| **N3 Bridge** | A bridge from what you own, over what you owe, to what you keep (bars morph) | Slide back through 13 months: every bar glides to its old height, a dashed ghost keeps today's for comparison, the number counts. Group tabs on the right (Everything, Assets, Debts, Cash flow, Plans) each with its pages, its warnings and a small picture |

Motion, all CSS (no script): the net worth is a registered number that transitions and is written by three counters (so it counts up on load and between months); the net worth line draws itself; the bars and the cursor glide; warnings pulse softly. Each respects reduced motion.

**New data (made up):** twelve months of history by type, ending at today's real sample figures (net worth ₹25,57,193, up ₹1,95,847 on October and ₹10,08,687 on a year ago). The loans run backwards from today's balances at their rates; EPF the same. In the real app this is a **monthly net worth snapshot** the app must start keeping (it doesn't today), so a year of trend only exists after a year of snapshots; until then the River, the Bridge's slider and the trend show the months the app has.

**The maths each one needs (not built):** the net worth snapshot (a pure function of the month's balances, with a test that owned less owed equals net worth), change against last month and a year ago, the type split, and a warnings collector that asks every page for its list and ranks them. The page-by-page warnings already exist as "What needs attention"; this widens it to every page.

### Questions on round 3

1. **Which board** (or which pieces)? E.g. River for the top, with the Map's cells as the groups below.
2. **Snapshots:** the trend needs one saved net worth per month. Start saving on the 1st of each month, and can I backfill from the statements and loan schedules?
3. **Warnings:** is the list right (act now, soon or off, worth knowing)? Which pages should raise more (card utilisation, a goal behind, an insurance renewal, an idle balance)? Should one be dismissible?
4. **Cash flow and Plans** aren't part of net worth. Fine to show them as their own groups, or fold them into a single "Other pages" group?
5. **Net worth number:** show it in full (₹25,57,193) as drawn, or in lakhs (₹25.57L) with the full figure on hover?

## Round 2 (2026-11-07): whole pages, built around one interaction

Prathik asked for the Overview to be **cooler, unique, with good interactions and useful insights**, not bound to the other dashboards' layout. Round 2 keeps the shell (rail, the greeting that points) and ends with a slim **dock** to every section, but drops the hero-over-widgets page: each board is one full-width stage built around a single idea. Every pick works with no script. All figures are made up; **every rate and habit is an assumption shown on its board** (home loan 8.75%, car loan 9.4%, deposits 7%, EPF 8.25% plus ₹8,000 a month, ₹30,000 a month added to investments). The build reads the real ones.

| Board | The idea | What you can do | The insight |
|---|---|---|---|
| `OvQ1` Future you | A time machine for net worth | Pick how far (1, 3, 5, 10, 20 years) and what your investments earn (4, 8, 12%) | Net worth then, split into investment growth and everything else; a chart with what you owe shrinking as the loans clear; milestones (car loan cleared Nov 2029, ₹50L, ₹1 Cr, home loan cleared Feb 2043) |
| `OvQ2` What if | Seven scenarios on your own numbers | As things are, the salary stops, NetApp trouble (shares −40% and the salary stops together), the dollar falls 8%, a ₹3L surprise, close the matured FD into the car loan, the home rate up a point | A **runway bar**: how many months the bills would be carried by the bank, then brokers' cash, the matured FD, other deposits, then investments (36.7 months in all, 12.0 without selling investments); net worth after; money in against bills |
| `OvQ3` Things I noticed | Eight insights, each with its own picture | Filter by Cash, Debt, Risk, Growth, Habits; flip a card to see the maths | The matured FD saves ₹42k if it pays the car loan (and beats re-depositing by ₹6k); NetApp is 37% of investments and the same employer pays the salary; ₹3.65L idle at brokers; 22% of salary is spoken for; one borrower is 63% of what's lent; subscriptions ₹57,840 a year; debt-free dates; the cash dip on 28 Nov |
| `OvQ4` Where a month goes | A flow from money in, to groups, to every line | Pick any group or line to follow it through | 48% is gone to fixed commitments and card bills before any choice; ₹75,617 stays in the bank; shopping is up 34% on October |

Why these: Round 1 answered "what am I worth". These answer what the old page couldn't: **what will I be, what could hurt me, what's worth knowing, and where does it go.**

**The maths each one needs (not built; all pure functions in `lib/aggregate/`, each with tests, per CLAUDE.md):** a loan's month-by-month schedule and a prepayment's effect (principal repays to exactly zero, interest strictly falls, a prepayment never makes a loan cost more, the loan ends sooner); the net-worth projection (investments grow by the chosen return plus what's added; deposits and EPF at their rates; loans by schedule; lent out piling up); the runway (bills a month and the layers of what could be turned into cash, in order); the month's flow (income, the groups, every line adding back to the total). The mockup's `generator/model.mjs` has working versions with the checks.

### Questions on round 2

1. **Which of the four** (or which pieces)? They can live together: e.g. Overview opens on Things I noticed with a Where a month goes card, and Future you and What if are their own pages under it.
2. **Assumptions:** the projection and the scenarios need a few numbers only you know: the amount you add to investments each month, EPF contributions, the loan rates. The real loan rates and EPF rates are in the app; should the others be settings on the page?
3. **Spending by category** (Q4) comes from the card statements. Spending that doesn't go through a card isn't tracked, so "where a month goes" is where the *recorded* money goes, and says so. Fine?
4. **"Close the FD into the car loan"** compares a 9.4% loan against a 7% deposit. Is that a comparison you want the app to make, or only to show the figures?
5. **Q2's runway** uses the next month's bills (EMIs, card bills, subscriptions off cards, premiums) as "what you spend". It leaves out day-to-day spending that isn't on a card. Say so on the page, or add a figure you set?

## Questions for Prathik (round 1)

1. **Which hero?** Or a mix (e.g. O5's list over O3's chart).
2. **O2's "how fast"**: my reading (a sale settles in a day or two; an FD broken early costs interest; lent money isn't in your hands; EPF is locked). Right enough?
3. **O4's definitions** are proposals: *cash cover* = the three bank accounts ÷ (EMIs + subscriptions) (brokers' cash left out); *EMI load* = EMIs ÷ salary; *card use* = outstanding ÷ limits; *left after bills* = salary less this month's obligations (not a true savings rate); *owed against owned*; *NetApp share* of what you own. The bands (comfortable / worth watching) are common rules of thumb. Which of these do you want, and are the bands yours to set?
4. **Insurance premiums** are on O3's line but aren't in "monthly obligations" today (subscriptions off cards, EMIs and card bills only). Add them?
5. **Day-to-day spending** isn't tracked, so O3's line shows only dated things and says so. Fine?
6. The **section tiles** and **Goals** card: keep both, or drop Goals (it's a tile already)?

## Not designed yet

The phone layout, the states (nothing entered yet, a dollar rate that can't be fetched, EPF unreadable), and light/dark beyond today's light theme. These wait for the pick, as on every other page.

## What changed between the mockup and the build (2026-11-08)

- **The trend is real but an estimate.** The mockup's 13 months were made up; the build rebuilds them from the records and leaves out months before the first bank balance. With less than a year of records the change reads "since <first month>" instead of "a year ago".
- **Warnings come from the pages.** The mockup's eleven sample warnings included some no page raises today (a Netflix price rise, NetApp being 37% of investments). The build lists only what each page's own attention list says, plus card statements and sources that couldn't be read; the concentration lives in Eight things.
- **Due this month and Still to pay** are the real obligations: Still to pay is the existing "monthly obligations" (what is left), Due this month adds what was already paid.
- **Eight things:** a card with nothing to say is left out, so the heading says Seven when seven. The matured-deposit card needs a deposit that has matured and isn't closed and a loan to compare.
- **Future you:** the amount added to investments is his buys and ESPP less his sales over twelve months (an RSU vest costs him nothing), and the assumptions are editable and remembered. The slider is whole 2 to 14 and a typed field takes any 0 to 30.
- **Calendar on a phone** is the list of the days that have something.
- **Left for later:** the design aids (icon-style and ending switches) are not on the page; real net worth snapshots (F-OV-07) would make the trend exact.
