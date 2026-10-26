# Loans canvas generator

Builds the Loans design canvas in `design/loans/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping large artboards by hand. A rebuild overwrites them, so make changes here and rebuild, not in the artboards by hand. Every figure is made-up sample data ("today" is Oct 25, 2026). The notes are in [`docs/design/loans.md`](../../../docs/design/loans.md).

Its infrastructure is a copy of the Income generator's (`design/income/generator/`): `css-base.mjs`, `cdp.mjs`, `audit.js`, `rings.mjs`, and the shared part of `css.mjs`. Needs Node 22 or newer and Microsoft Edge in `/Applications` (set `HEADLESS_BROWSER` for another Chromium browser); screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=LoansL3 for one), writes heights.json
node preview.mjs          # out/preview/loans-designs.html: one page, a tab per board
./shoot.sh LoansL1        # out/shots/LoansL1.png (LoansL3@l3-sel-car checks a pick first)
./audit.sh                # cards side by side end level, none with empty space inside
```

## Where things are

- `lib.mjs`: the sample loans and installments (the app's `Loan` and `LoanInstallment` shapes), a port of `generateInstallments.ts`, the sums `lib/aggregate/loans.ts` will hold, formatting, icons and the shell.
- `parts.mjs`: the shared widgets (greeting that points, attention strip, loans table, coming up, schedule, principal and interest, where EMIs come from, cost of borrowing).
- `dash.mjs`: the six heroes L1 to L6 and their pages. `boards.mjs`: every board, the canvas page and note. `css.mjs`: the stylesheet.
