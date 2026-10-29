# Insurance canvas generator

Builds the Insurance design canvas in `design/insurance/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping large artboards by hand. A rebuild overwrites them, so make changes here and rebuild, not in the artboards by hand. The policies are Prathik's own, read from his emailed PDFs with identifiers cut to their last digits ("today" is Oct 29, 2026; dates after it and the 2027 renewal quotes are illustrative). The notes are in [`docs/design/insurance.md`](../../../docs/design/insurance.md).

Its infrastructure is a copy of the Loans generator's (`design/loans/generator/`): `css-base.mjs`, `css.mjs`, `cdp.mjs`, `audit.js`, `rings.mjs`, `build.mjs`, `preview.mjs`. Needs Node 22 or newer and Microsoft Edge in `/Applications` (set `HEADLESS_BROWSER` for another Chromium browser); screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=InsI2 for one), writes heights.json
node preview.mjs          # out/preview/insurance-designs.html: one page, a tab per board
./shoot.sh InsFinal       # out/shots/InsFinal.png (InsFinal@ins-sel-car checks a pick first)
./audit.sh                # cards side by side end level, none with empty space inside (not the forms or the phone board)
```

## Where things are

- `lib.mjs`: his real policies and terms, read from his Gmail PDFs (the proposed `Policy` and `PolicyPayment` shapes), the sums `lib/aggregate/insurance.ts` will hold, formatting, icons and the shell.
- `parts.mjs`: the shared widgets (greeting that points, attention strip, policies table, coming up, premiums paid, policy details, the cover timeline, what cover costs, no-claim bonus).
- `heroes.mjs`: the cover map hero and the premium runway chart. `page.mjs`: the page with its pick. `states.mjs`: the states and the phone. `forms.mjs`: the forms. `boards.mjs`: every board, the canvas pages and notes. `css-ins.mjs`: this canvas's own styles.
