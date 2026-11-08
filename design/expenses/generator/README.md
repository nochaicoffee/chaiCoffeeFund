# Expenses canvas generator

Builds the Expenses design canvas in `design/expenses/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; a rebuild overwrites them, so change the generator. Every figure is made-up sample data shaped like Prathik's money; "today" is Sun Nov 8, 2026, so October is the last whole month. Notes are in [`docs/design/expenses.md`](../../../docs/design/expenses.md). The infrastructure (`css-base.mjs`, `lib.mjs`, `cdp.mjs`, `build.mjs`, `preview.mjs`, `shoot.sh`, `audit.sh`, `audit.js`) is a copy of the Overview generator's (`lib.mjs` gained an Expenses item on the rail and the category icons). Needs Node 22+, Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=ExE1 for one), writes heights.json
./shoot.sh ExE1           # out/shots/ExE1.png (a pick: ./shoot.sh "ExE1@m-2026-07")
./audit.sh                # cards side by side end level, none with empty space inside
node preview.mjs          # out/preview/expenses-designs.html: every board in a tab, to hand over
```

- `data.mjs`: twelve months (Nov 2025 to Oct 2026), the parts of a month's spending, the big spends and their categories, and checks that stop the build if a sum drifts (came in = spent + invested + lent out + kept, every month; the parts add up to spent; big spends fit inside the part they sit in; October spent ₹1,30,878 and kept ₹7,648).
- `parts.mjs`: the shared page (the pointing greeting, Where the month went with the usual-month comparison, Big spends, the months table, the month chips).
- `heroes.mjs`: round 1's four heroes, E1 Split, E2 Bridge, E3 Year, E4 Receipt. The month is one pick (radios named `m`) shared by the whole page.
- `statements.mjs` (round 2): `ExF1`, the page with E1 picked and links to the statements; `ExS1` Statements, every payment month by month with a kind filter (radios `f`); `ExS2` One month, a month as a statement (radios `m`). `data.mjs` gained `linesOf(m)` (a month's payments, checked to add up to spent) and `notSpentOf(m)`. `css-st.mjs`: their styles.
- `css-ex.mjs`: the Expenses styles, with the Overview's stage, big number, pills and pointing greeting copied in. `boards.mjs`: every board and the canvas note.
