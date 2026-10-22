# Accounts canvas generator

Builds the Bank Accounts design canvas in `design/accounts/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping 60-odd large artboards by hand. A rebuild overwrites them, so make changes here and rebuild, not in the artboards by hand. Every figure in it is made-up sample data ("today" is Oct 21, 2026), including the account numbers' last 4 and the cheque numbers. The spec is [`docs/design/accounts.md`](../../../docs/design/accounts.md).

It started as a copy of the Subscriptions generator's infrastructure (`design/subscriptions/generator/`): `build.mjs`, `cdp.mjs`, `audit.js`, `css.mjs` and the preview page. The two are separate so each canvas can change on its own.

Needs Node 22 or newer (for the built-in `WebSocket`) and Microsoft Edge in `/Applications`, which runs headless to measure and screenshot the boards. To use another Chromium-based browser, set `HEADLESS_BROWSER` to its binary. Screenshots need Python 3 with Pillow, which stitches tall boards.

## Build

Run these from this folder. To rebuild every artboard and `canvas.json` (about a minute):

```bash
node build.mjs
```

To rebuild only the boards whose file name starts with a prefix (here `AccountsFinal`, `AccountsFinalPhone`, `AccountsFinalStates` and `AccountsFinalForms`):

```bash
node build.mjs --only=AccountsFinal
```

`canvas.json` is always rewritten for every board, and boards that weren't rebuilt keep their last measured height from `heights.json`. Each build also writes `out/` (gitignored, never committed): `out/preview/accounts-designs.html` is the page to publish, with every board but the Read me in `out/preview/boards/`, fetched when its tab opens.

## Screenshots and the gap audit

```bash
./shoot.sh AccountsFinal AccountsFinal@hdfc
```

writes `out/shots/<Name>.png` at each board's measured size. `@hdfc` picks that account first. Boards taller than 4,000px are captured in 3,000px slices and stitched: one capture of a whole tall board can stall headless Edge.

```bash
./audit.sh AccountsFinal@all AccountsFinal@sbi
```

checks that cards side by side end level and that no card has empty space inside. With no names it checks every main board with All, HDFC Salary, the stale SBI Rainy Day and the closed YES Old Salary picked.

## Where things are

- `boards.mjs`: every board (file, width, canvas page, render function), the canvas pages and their notes. `preview.mjs`: the published page's tabs.
- `lib.mjs`: sample accounts, balances, flows, money math, formatting, icons and the shell. `parts.mjs`: what a pick shows (`facts`), the radios that hold the pick (`picker`), the green stage, and the shared cards (Balance history, Money out). `css.mjs`: the one stylesheet.
- **The final design**: `final.mjs`, using `z2.mjs` (the hero), `z1.mjs` (the headline dropdown), `objects2.mjs` (the cheques, passbooks, cards and All modes) and `objects.mjs` (round 7's objects, `acctOf`, and the made-up last 4s).
- **Round 10, the widgets below the hero**: `widgets.mjs` (the five pages W1–W5 and the phone board, built from the final hero and the shared helpers) and `wparts.mjs` (the widget library: month over month, the mix, runway, check-in rings, how fresh, money out, the emergency buffer, trends, the over-time chart, update rhythm, coming up, and the CSS-only switch, hover card and sort helpers). Their CSS is in `wparts.mjs` (`WCSS`), not `css.mjs`, so the other boards' files don't change. `parts.mjs`'s `historyCard` gained `compact`, `spread` and `fill` options, off by default. The boards are marked `measureAll` in `boards.mjs`, so `build.mjs` measures them with each account picked and sizes the artboard to the tallest.
- Earlier rounds: `dirs.mjs` (A–D), `dirs2.mjs` (E–I), `dirs3.mjs` (J–N), `dirs4.mjs` (O–T), `dirs5.mjs` (U–Y), `ysel.mjs` and `zsel.mjs` (Y's selectors), `charts.mjs` and `chartsboard.mjs` (the six chart options), `states.mjs`, `forms.mjs`, `readme.mjs`, `uniq.mjs` (amount in words, geometry, passbook entries).
- `cdp.mjs` drives headless Edge; `audit.js` is the check `audit.sh` runs in the page. `heights.json` holds each board's last measured height.

## Rounds 11 to 16 (2026-10-22): the final page

`r11.mjs` (the widgets: money in and out, the band and strip, the mix, the pointing greeting, `RT` ring texture), `r11pages.mjs` (the W1 pages), `r12.mjs` (card-strip selectors S1 to S5), `r13.mjs` (the hero: H1 to H5, `h4Stage`, the phone hero), `r14.mjs` (**the final page**, desktop and phone), `r15.mjs` (phone states and forms), `r16.mjs` (desktop states and forms). `widgets.mjs` and `wparts.mjs` are round 10's pages and widget library. Build one board with `node build.mjs --only=AccountsFinalPage`; `shoot.sh` takes `Name@sty-s2+hdfc` to set more than one radio (a style and a pick). The spec's last section, "The final design", is the source of truth.
