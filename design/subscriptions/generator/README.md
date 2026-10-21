# Subscriptions canvas generator

Builds the Subscriptions design canvas in `design/subscriptions/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping 100-odd large artboards by hand. A rebuild overwrites them, so make changes here and rebuild, not in the artboards by hand. Every figure in it is made-up sample data ("today" is Oct 20, 2026). The spec is [`docs/design/subscriptions.md`](../../../docs/design/subscriptions.md).

Needs Node 22 or newer (it uses the built-in `WebSocket`), plus Microsoft Edge in `/Applications`. Edge runs headless to measure each artboard's height. To use another Chromium-based browser, set `HEADLESS_BROWSER` to its binary:

```bash
export HEADLESS_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

A different browser or version can measure a few pixels differently, so check `jj diff` after a rebuild.

## Build

Run these from this folder. To rebuild every artboard and `canvas.json` (about two minutes):

```bash
node build.mjs
```

To rebuild only the boards whose file name starts with a prefix (here `SubsFinal`, `SubsFinalPhone` and `SubsFinalStates`):

```bash
node build.mjs --only=SubsFinal
```

`canvas.json` is always rewritten for every board. Boards that weren't rebuilt keep their last measured height from `heights.json`. An optional first argument writes the artboards to another folder instead of `..`.

Each build also writes `out/`, which is gitignored and never committed (CLAUDE.md, "Design Artifacts"):

- `out/preview/`: the page to publish. `subscriptions-designs.html` is the index, with the Read me inline. Every other board is in `boards/<name>.html` and is fetched when its tab opens. `files.json` maps each board file for a publish.
- `out/measure/`: the measuring pages and browser jobs.

## Screenshots

```bash
./shoot.sh SubsFinal SubsFinalPhone
```

This writes `out/shots/<Name>.png` at each board's measured size.

## Gap audit

On a dashboard, cards side by side should end level, with no empty space left inside a card. To check that:

```bash
./audit.sh
```

```bash
./audit.sh SubsFinal SubsFinalPhone
```

With no names, it checks every main board (not States, Forms or Readme). Each board prints `OK` or `FIX`, and under each `FIX` it lists every uneven row (`ROW gap`) and every card with space left inside (`INSIDE gap`).

## Where things are

- `build.mjs`: the entry point. It renders, measures, then writes the artboards, `canvas.json` and `out/preview/`.
- `boards.mjs`: every board (file, width, canvas page, render function), the canvas pages, and each page's note.
- `preview.mjs`: the published page's tabs. To show a new board there, add it to `TABS`.
- `lib.mjs`: sample data, money math and formatting. `parts.mjs` and `css.mjs` hold the shared building blocks and the one stylesheet.
- Directions: `a.mjs`–`k.mjs` (A–K), `heroes.mjs` (L–P), `sel1.mjs` and `sel2.mjs` (Q–Z, with `selcore.mjs`), `carousels.mjs` and `charts.mjs` (S1–S6), `flow.mjs` and `charts2.mjs` (S7–S16, and the final design), `core.mjs` (the pieces kept in every design from L on).
- States and forms: `states.mjs`–`states4.mjs`, `final.mjs` (the final design's states), `forms.mjs`. The Renewals page: `renewals.mjs`, `renewals2.mjs`. The Read me board: `readme.mjs`.
- `cdp.mjs`: drives headless Edge. `audit.js` is the check that `audit.sh` runs in the page.
- `heights.json`: the last measured height of each board.
