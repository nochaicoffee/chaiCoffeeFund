# Lent out canvas generator

Builds the Lent out design canvas in `design/lent-out/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; a rebuild overwrites them, so change the generator. The three loans are his real ones and every figure uses the formulas of `src/lib/aggregate/lentOut.ts`; the interest payouts that *arrived* are made-up sample payments (the real data has no income entries yet). "Today" is Fri Nov 6, 2026. Notes are in [`docs/design/lent-out.md`](../../../docs/design/lent-out.md). The infrastructure (`css-base.mjs`, `lib.mjs`, `cdp.mjs`, `build.mjs`, `preview.mjs`, `shoot.sh`, `audit.sh`, `audit.js`) is a copy of the Fixed Income generator's. Needs Node 22+, Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=LeL1 for one), writes heights.json
./shoot.sh LeL1           # out/shots/LeL1.png (a pick: ./shoot.sh "LeL1@p-b")
./audit.sh                # cards side by side end level, none with empty space inside
node preview.mjs          # out/preview/lent-out-designs.html: every board in a tab, to hand over
```

- `data.mjs`: his three loans, `lentOut.ts` ported line for line (with checks that stop the build if a figure drifts from ₹1,63,693 / ₹8,13,693 / ₹12,95,693), the promised payout dates, the SAMPLE arrivals, and the made-up crowd for the "many people" state.
- `parts.mjs`: the shared page parts (greeting that points, attention strip, loans table, interest coming up, money back).
- `final.mjs`: the FINAL page, with the L3 hero (`l3Hero`, written once as a function of the loans so the states and phone boards draw it for a repaid loan, a part-returned loan or sixteen people). `clock.mjs`: the Interest clock and Interest adding up, a two-card row on the final page (one pick, scoped to `.clk`, so neither follows the hero), drawn from a model of the loans so the states can draw it for a repaid loan, a part-returned loan or sixteen people. `heroes.mjs`: the explorations L1, L2, L4 (not picked). `css-lent.mjs`: Lent out's own styles and the pick rules.
- `forms.mjs`, `states.mjs`, `phone.mjs`: the forms, states and phone boards of the final page. `boards.mjs`: every board and the canvas notes.
