# Income canvas generator

Builds the Income design canvas in `design/income/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping large artboards by hand. A rebuild overwrites them, so make changes here and rebuild, not in the artboards by hand. Every figure is made-up sample data ("today" is Oct 24, 2026). The notes are in [`docs/design/income.md`](../../../docs/design/income.md).

Its infrastructure is a copy of the Accounts generator's (`design/accounts/generator/`): `css-base.mjs`, `cdp.mjs`, `audit.js`, `rings.mjs`. Needs Node 22 or newer and Microsoft Edge in `/Applications` (set `HEADLESS_BROWSER` for another Chromium browser); screenshots need Python 3 with Pillow.

## Build

Run from this folder:

```bash
node build.mjs
```

Boards drawn while RSU and ESPP counted as income (rounds 1 and 2, Z2, Z3, E2) are `frozen` in `boards.mjs`: kept as shown and skipped by the build. `node build.mjs --only=IncomeZ1` rebuilds boards whose file name starts with that prefix. Each build writes `heights.json` (each board's measured height). Then:

```bash
node preview.mjs
```

writes `out/preview/income-designs.html`, one page with a tab per board, to hand over. `out/` is gitignored.

```bash
./shoot.sh IncomeI1 IncomeI2@i2-sel-icici
```

writes `out/shots/<Name>.png`; `@id+id` checks those radios first (a pick, a month, a switch). `./audit.sh` checks that cards side by side end level and that none has empty space inside.

## Where things are

- `lib.mjs`: the sample sources and entries (the app's `IncomeSource` and `IncomeEntry` shapes), the money math, formatting, icons and the shell.
- `parts.mjs`: the widget library (greeting that points, month columns, sources, coming up, where it lands, pay rhythm, this year vs last, the mix, the pay calendar, tiles) and the CSS-only switch `tgl`.
- `dash.mjs`: the four round 1 dashboards I1 to I4 (and `i4Hero`, the picked hero). `dash2.mjs`: round 2, Y1 to Y4, the picked hero with different widgets. `dash3.mjs`, `parts3.mjs`, `forms3.mjs`: round 3, Z1 to Z3 (the layout Prathik described: cover, a colourful visual beside the entries, a trend card with a pay-rhythm switch, the sources, pay changes and the calendar), their visuals (income map, bento, bubbles) and the cover's actions board. `parts2.mjs`: round 2's widgets (entries card, financial year, what's ahead, by category, pay changes, the This year and last switch) and the rules that make the source chips drive the page. `entries.mjs`: the Entries page E1 to E3. `readme.mjs`: the Read me board.
- `css.mjs`: the stylesheet (`css-base.mjs` plus Income's own). `boards.mjs`: every board, the canvas pages and notes.
