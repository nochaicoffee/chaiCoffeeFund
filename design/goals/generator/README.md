# Goals canvas generator

Builds the Goals design canvas in `design/goals/`: every `*.dc.html` artboard and `canvas.json`. The `.dc.html` files and `canvas.json` stay the source of truth; this generator saves retyping large artboards by hand. A rebuild overwrites them, so make changes here and rebuild. Every figure is made-up sample data ("today" is Oct 29, 2026). The notes are in [`docs/design/goals.md`](../../../docs/design/goals.md).

Its infrastructure is a copy of the Loans generator's (`css-base.mjs`, `cdp.mjs`, `audit.js`, the shared part of `css.mjs`). Needs Node 22 or newer and Microsoft Edge in `/Applications`; screenshots need Python 3 with Pillow.

```bash
node build.mjs            # all boards (--only=GoalsG1 for one), writes heights.json
./shoot.sh GoalsG1        # out/shots/GoalsG1.png
./audit.sh                # cards side by side end level, none with empty space inside
```

- `lib.mjs`: the sample goals and set-asides (the proposed `Goals` and `GoalContributions` shapes), the sums `lib/aggregate/goals.ts` will hold, the funding plan, formatting, icons and the shell.
- `parts.mjs`: the shared widgets (greeting that points, attention strip, goals table, coming up, needs and wants, set-asides, what your money allows, finished).
- `dash.mjs`: the four heroes G1 to G4. `forms.mjs`: the forms. `boards.mjs`: every board and the canvas page notes. `css.mjs`: the stylesheet.
