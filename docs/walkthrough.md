# Demo walkthrough: showing the app without your own numbers

To show the app to friends (a video, screenshots, a guide page), run it against a **separate demo spreadsheet** filled with a made-up person's money. Nothing from your real Sheet is ever read.

## One-time setup

1. Make an empty spreadsheet with **"demo" in its title** (the seeder refuses any other) and share it as Editor with the service account's email (`client_email` in the key file).
2. Make a separate jj workspace for the demo, so its `.next` cache never holds your real data (Next caches Sheet reads on disk by tab, not by spreadsheet):

```bash
jj workspace add --name walkthrough -r main@origin ../chaiCoffeeFund-ws/walkthrough
```

3. In that workspace, link `node_modules` and `secrets` from the main checkout, but **not** `.env.local`. Instead create `.env.demo.local` (gitignored):

```
DEMO_SPREADSHEET_ID=<the demo spreadsheet's id>
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./secrets/<your key>.json
```

4. Fill it: `npm run seed-demo` (add `-- --dry-run` to only check the records). It builds every tab, then writes about 600 made-up rows: 5 accounts, 2 cards, salary, a car loan, subscriptions, insurance, goals, trades, FDs, PF, lent money, big spends and two months of daily spends. Dates count back from today, so a fresh seed always looks current. Before writing anything, even a tab, it refuses a spreadsheet with rows in any tab. When Google's 60-writes-a-minute quota runs out it waits and tries again; any other failure stops it and says which tabs were already written, and then the way to start over is a new demo spreadsheet.

## Running the demo app

From the workspace, with the demo id and a made-up greeting name. The `chai-demo` entry in `.claude/launch.json` does the same from the main checkout, for a workspace at `../chaiCoffeeFund-ws/walkthrough`:

```bash
set -a && . ./.env.demo.local && set +a && GOOGLE_SHEETS_SPREADSHEET_ID=$DEMO_SPREADSHEET_ID OWNER_NAME=Rahul npx next dev --webpack -p 3100
```

Then, once, `CHAI_COFFEE_FUND_URL=http://localhost:3100 npm run refresh-prices` so Investments has prices.

If you change the demo Sheet by hand or by script (not through the app), stop the server and delete `.next/dev/cache/fetch-cache`, or the pages keep showing the old values.

## Screenshots and video

Playwright and a static ffmpeg aren't project dependencies. Install them once in a folder outside the repo:

```bash
mkdir -p ~/.cache/chai-walkthrough && cd ~/.cache/chai-walkthrough && npm init -y && npm i playwright ffmpeg-static && npx playwright install chromium
```

Then, from the workspace, with the demo app running on port 3100:

- `PLAYWRIGHT_DIR=~/.cache/chai-walkthrough node scripts/walkthrough/shots.mjs`: every dashboard on a computer (1440 wide) and a phone (390 wide), first screen and whole page, into `walkthrough-out/shots/`.
- `PLAYWRIGHT_DIR=~/.cache/chai-walkthrough node scripts/walkthrough/tour.mjs`: a captioned 2½-minute tour of every page as `walkthrough-out/video/tour-desktop.mp4`, with a visible cursor and no dev badge. It writes nothing. Add `--save-spend` to tap one Daily spend (Lunch, ₹360) and show a save: that adds a row to whatever Sheet the app on `DEMO_URL` (default port 3100) uses, so pass it only when that's the demo app.

`walkthrough-out/` is gitignored: screenshots and videos are outputs, rebuilt from these scripts, never committed.

## The guide page

`scripts/walkthrough/guide.html` is the published guide (a video, then each dashboard with a computer and a phone screenshot and how to use it). It expects `tour.mp4`, `thumb.jpg` and `shots/<page>-desktop.jpg`, `-desktop-full.jpg` and `-phone.jpg` beside it: JPEG copies of the screenshots (desktop 1440 wide, phone 844 tall). The published copy is a private Claude artifact.
