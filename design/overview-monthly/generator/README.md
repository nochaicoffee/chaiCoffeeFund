# Overview "Month by month" canvas generator

Builds `design/overview-monthly/`: every `*.dc.html` artboard and `canvas.json`. Those files are the source of truth; a rebuild overwrites them, so change the generator. Notes: [`docs/design/overview.md`](../../../docs/design/overview.md), "Month by month widget". Needs Node 22+ and Microsoft Edge in `/Applications`.

```bash
node build.mjs            # all boards (--only=MoA for one), writes heights.json
node shoot.mjs MoA        # out/shots/MoA.png (a pick: node shoot.mjs "MoE@e-2026-07" or "MoC@c-card")
node preview.mjs          # out/preview/overview-monthly.html: every board in a tab, to hand over
```

- **Coupling:** `data.mjs` reads the Expenses canvas's `data.mjs`, and `css.mjs` the Overview canvas's `css-base.mjs`. Re-tuning either changes (or, through the Expenses sample's checks, breaks) this canvas, so rebuild it when they change.
- `data.mjs`: the five measures (income, investments, EMIs, credit card bills, cash expenses) read from the **Expenses canvas's made-up year** (`design/expenses/generator/data.mjs`, Nov 2025 to Oct 2026), so the widget agrees with `/expenses`. `heatLevel` is the app's own rule (`cardSpend.ts`). Checks stop the build if a figure drifts.
- `css.mjs`: the Overview generator's `css-base.mjs` plus this canvas's styles. One hue per measure, five shades each. Class names are prefixed (`mh` cell, `mc` card, `mfoot`, `mleg`) because the base CSS already uses `.hc`, `.card`, `.foot`, `.legend`.
- Round 2 (several years): `multi.mjs` assembles `MyA` to `MyD` from `multiA.mjs` to `multiD.mjs` and the shared `mhelp.mjs`; `all.mjs` joins both rounds (the build and preview read it). `data.mjs` has the made-up Nov 2023 to Oct 2026 history and `seriesFor(measure, keys)` for any run of months. `MyA`'s range picker is radios and `:has()`.
- `boards.mjs`: `MoA` Five heatmaps, `MoB` Five tiles, `MoC` One heatmap with five tabs (radios and `:has()`, no script), `MoD` Five bar cards, `MoE` Pick a month (radios), `MoX` where it sits on the page.
