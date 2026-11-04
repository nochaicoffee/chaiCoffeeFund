# Fixed Income canvas generator

Builds the Fixed Income design canvas in `design/fixed-income/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; a rebuild overwrites them, so change the generator. Every deposit, rate and balance is made-up sample data in rounds 1 and 2 and his real numbers in round 3 ("today" is Wed Nov 4, 2026). Notes are in [`docs/design/fixed-income.md`](../../../docs/design/fixed-income.md). Infrastructure is a copy of the Investments generator's. Needs Node 22+, Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=FiF1 for one), writes heights.json
./shoot.sh FiF1           # out/shots/FiF1.png
./audit.sh                # cards side by side end level, none with empty space inside
node preview.mjs          # out/preview/fixed-income-designs.html: every board in a tab, to hand over
```

- `data.mjs`: his REAL data (round 3): the seven deposits from his FD app and the EPFO passbooks, with the EPF interest rule and its check. `heroes3.mjs` + `parts3.mjs` + `css-fi3.mjs`: the round 3 boards H1 to H5.
- `data-sample.mjs`: the made-up sample deposits (the real `FixedDeposit` shape plus an NSC and an RD), passbook holdings, and every sum a board reads (cover, tax year, real return).
- `parts.mjs`: the shared widgets (greeting that points, attention strip, deposits table, coming up, passbook holdings).
- `heroes.mjs`: the six round 1 heroes F1 to F6. `heroes2.mjs` + `css-fi2.mjs`: the four coloured, pick-driven stages G1 to G4. `css-fi.mjs`: Fixed Income's own styles. `boards.mjs`: every board and the canvas notes.
