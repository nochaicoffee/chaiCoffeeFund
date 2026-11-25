# chaiCoffeeFund

A private personal-finance dashboard that runs on **your own** Google Sheet. Accounts, cards, subscriptions, income, loans, fixed income, investments, insurance, goals and daily spending, with an Overview that ties them together. Next.js on Vercel, your data in a Google Sheet you own, sign-in limited to your one Google account.

- **Your data stays yours.** There is no shared server. Each person runs their own copy with their own Sheet, Google Cloud project and Vercel project.
- **Optional:** import bank and card statements from Gmail (read-only), and let Claude add records through a connector.
- **Built for India first:** rupees as the base currency, lakh formatting, and statement parsers for Indian banks. Everything except the Gmail import works for anyone; see [docs/setup.md](docs/setup.md) for what is bank-specific.

## Get it running

About 30 minutes, all on free tiers, and nothing to install: every step is in a browser. The full guide is [docs/setup.md](docs/setup.md), and the same steps are on the `/setup` page of the running app, which also checks your setup live.

The short version:

1. **Fork** this repository on GitHub.
2. In [Google Cloud](https://console.cloud.google.com), make a project, turn on the Sheets API, and make a service account with a JSON key. Make an empty [Google Sheet](https://sheets.new) and share it with the service account. Make a Google sign-in (OAuth) client.
3. On [Vercel](https://vercel.com/new), import your fork, paste in the settings (the table in step 6 of [docs/setup.md](docs/setup.md); the key goes in as `GOOGLE_SERVICE_ACCOUNT_KEY`, the whole JSON file), and deploy.
4. Open `<your address>/setup`, sign in, and press **Create the missing tabs**.

A terminal is needed only for the optional Gmail statement import, or to change the code (see "Running it on your own computer" in [docs/setup.md](docs/setup.md)).

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
