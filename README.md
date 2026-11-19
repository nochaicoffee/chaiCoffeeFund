# chaiCoffeeFund

A private personal-finance dashboard that runs on **your own** Google Sheet. Accounts, cards, subscriptions, income, loans, fixed income, investments, insurance, goals and daily spending, with an Overview that ties them together. Next.js on Vercel, your data in a Google Sheet you own, sign-in limited to your one Google account.

- **Your data stays yours.** There is no shared server. Each person runs their own copy with their own Sheet, Google Cloud project and Vercel project.
- **Optional:** import bank and card statements from Gmail (read-only), and let Claude add records through a connector.
- **Built for India first:** rupees as the base currency, lakh formatting, and statement parsers for Indian banks. Everything except the Gmail import works for anyone; see [docs/setup.md](docs/setup.md) for what is bank-specific.

## Get it running

About 30 minutes, all on free tiers. The full guide is [docs/setup.md](docs/setup.md), and the same steps are on the `/setup` page of the running app, which also checks your setup live.

The short version:

```bash
git clone https://github.com/<your-name>/chaiCoffeeFund.git   # a fork of this repo
cd chaiCoffeeFund
npm install
cp .env.example .env.local        # then fill it in (docs/setup.md, steps 2 to 4)
npm run dev                       # http://localhost:3000
npm run create-sheet              # builds every tab in your empty Google Sheet
```

Then deploy the fork on [Vercel](https://vercel.com/new) with the settings from `.env.example`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | The app on localhost. No sign-in is asked for unless `ALLOWED_EMAIL` is set. |
| `npm run create-sheet` | Builds the Sheet's tabs, with their Tables, columns and dropdowns. Only adds; safe to run again. |
| `npm run check-sheet` | Checks the Sheet's structure against the app (needs `npm run dev`). |
| `npm run authorize-gmail` | One-time Gmail permission, for the optional statement import. |
| `npm test`, `npm run lint` | The unit tests and the linter. |

## How it's built

Pages read the Sheet on the server; a repository per tab validates every row; money math lives in pure functions with tests. Read [docs/system-design.md](docs/system-design.md) before changing the structure, and [docs/process.md](docs/process.md) for the workflow. Never commit a key, token or `.env` file: see the secrets rules in [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE). See [PRIVACY.md](PRIVACY.md) for what the app accesses.
