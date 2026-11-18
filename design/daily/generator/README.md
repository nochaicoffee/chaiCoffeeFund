# Daily canvas generator

Builds the Daily design canvas in `design/daily/`: every `*.dc.html` artboard and `canvas.json`. The boards stay the source of truth; a rebuild overwrites them, so change the generator. Every figure is made-up sample data shaped like Prathik's spending; "today" is Wed Nov 18, 2026. Notes are in [`docs/design/daily.md`](../../../docs/design/daily.md). The infrastructure (`css-base.mjs`, `lib.mjs`, `cdp.mjs`, `build.mjs`, `preview.mjs`, `shoot.sh`, `audit.sh`, `audit.js`) is a copy of the Expenses generator's. Needs Node 22+, Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=DyC1 for one), writes heights.json
./shoot.sh DyC1           # out/shots/DyC1.png
./audit.sh                # desktop boards: cards side by side end level, none with empty space inside
node preview.mjs          # out/preview/daily-designs.html: every board in a tab, to hand over
```

- `data.mjs`: November to Wed 18 (₹20,982: UPI ₹6,335, card ₹14,647), a busy October (₹34,510, every day written, five spends on the 17th), earlier months as totals, a made-up limit of ₹30,000, and the same math as `lib/aggregate/dailySpends.ts` plus checks that stop the build if a sum drifts.
- `parts.mjs`: the calendar, day panel and add form, the pointing greeting, tiles, categories, months, the ring, week bars, streak strip, feed, keypad. `css-dy.mjs`: their styles.
- `designs-cal.mjs` (C1 to C3 and the states), `designs-alt.mjs` (A1 to A4), `designs-budget.mjs` (the limit proposal), `designs-phone.mjs` (phones), `boards.mjs` (every board and the canvas notes).
