# Overview canvas generator

Builds the Overview design canvas in `design/overview/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; a rebuild overwrites them, so change the generator. Every figure is made-up sample data shaped like the real Overview's inputs; "today" is Sat Nov 7, 2026. Notes are in [`docs/design/overview.md`](../../../docs/design/overview.md). The infrastructure (`css-base.mjs`, `lib.mjs`, `cdp.mjs`, `build.mjs`, `preview.mjs`, `shoot.sh`, `audit.sh`, `audit.js`) is a copy of the Lent out generator's. Needs Node 22+, Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=OvO1 for one), writes heights.json
./shoot.sh OvO1           # out/shots/OvO1.png (a pick: ./shoot.sh "OvO1@p-invest")
./audit.sh                # cards side by side end level, none with empty space inside
node preview.mjs          # out/preview/: every board in a tab, to hand over (edit its TABS list first)
```

- `data.mjs`: the sample (accounts, holdings, deposits, EPF, lent out, cards, loans, income, events for the next 30 days, goals, policies, the attention list, the section tiles, the vitals) and checks that stop the build if two figures that must agree drift (net worth ₹25,57,193, obligations ₹1,20,800, still to pay ₹89,600, lowest cash point ₹1,77,700).
- `parts.mjs`: the shared page parts (greeting that points, attention strip and list, section tiles, This month, Coming up, Bank balance, Goals).
- `heroes.mjs`: the five heroes O1 to O5 and the page each sits on. `css-ov.mjs`: Overview's own styles and the pick rules (a pick is hidden radios, labels and `:has()`, so it works with no script; its colour is scoped to its board).
- `boards.mjs`: every board and the canvas note.
- Round 2 (2026-11-07, four whole-page ideas): `model.mjs` (pure maths with checks: loan schedules and a prepayment, the net-worth projection, the runway layers, the scenarios, the month's flow, and the assumptions, all labelled made up), `r2.mjs` (the four boards `OvQ1` to `OvQ4` and the dock), `css-r2.mjs` (their styles and picks; a pick's colour is scoped to its board). `OvQ1` has two pick groups (`hz` how far, `rt` what investments earn) and one stylesheet rule per combination.
- Round 3 (2026-11-07, net worth first): `history.mjs` (twelve months of net worth by type that end at today, the four groups, the eleven warnings and their checks), `r3.mjs` (the boards `OvN1` River, `OvN2` Map, `OvN3` Bridge), `css-r3.mjs` (the count-up number, warnings, lanes and the three boards). Picks: `m` month, `ly` layer, `c` cell, `r` range, `g` group.
- Round 4 (2026-11-07, more visual): `r4.mjs` (the boards `OvV1` Capsules, `OvV2` Warm bento, `OvV3` Bubbles; they reuse round 3's pieces), `css-r4.mjs` (their styles; the orb sizes scale with the pool through container query units). Picks: `m` month, `g` group, `b` orb.
- Round 5 (2026-11-07, borrowing from the neubrutalism exploration): `art-soft.mjs` (spot illustrations and the cup, restyled in our language), `r5.mjs` (`OvI1` Town), `css-r5.mjs` (the illustration bubbles, the mascot and the town). Rounds 3 and 4 use the illustrations and the cup in place.
- Round 6 (2026-11-07, the neubrutalism LAYOUTS in our language, no art): `r6.mjs` (`OvL1` Bento, `OvL2` Rail, `OvL3` Poster, `OvL4` Windows), `css-r6.mjs`. The illustrations and the cup are switched off (`ART_ON` in `art-soft.mjs`).
- Round 7 (2026-11-08, L1 Bento refined): `r7.mjs` (`OvR1`: a trend line in the net worth block, a mark on every tile, Coming up beside Keep in mind, then round 2's eight things and Future you), `css-r7.mjs`. `r2.mjs` now exports `q1Body` and `q3Body` so those two sections can sit on another page; `r6.mjs` exports its pieces.
- Round 8 (2026-11-08, the refined Bento again): `r8.mjs` (`OvS1`), `css-r8.mjs`, `icons-v.mjs` (the glyph set and the five styles). Picks: `m` month, `ik` icon style, `kv` last-section version, `cd` calendar day, `rt` any rate 2 to 14. `model.mjs` gained `RATES` (2 to 14).
- Final page (2026-11-08): `OvT1` is `r8.mjs` `s1({ final: true })`: icon style 3 (Watermark) fixed, the ending limited to Timeline and Calendar with a visible toggle (`kv-b`, `kv-d`).
