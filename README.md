# chaiCoffeeFund

A private personal-finance dashboard that runs on **your own** Google Sheet. Accounts, cards, subscriptions, income, loans, fixed income, investments, insurance, goals and daily spending, with an Overview that ties them together. Next.js on Vercel, your data in a Google Sheet you own, sign-in limited to your one Google account.

- **Your data stays yours.** There is no shared server. Each person runs their own copy with their own Sheet, Google Cloud project and Vercel project.
- **Optional:** import bank and card statements from Gmail (read-only), and let Claude add records through a connector.
- **Built for India first:** rupees as the base currency, lakh formatting, and statement parsers for Indian banks. Everything except the Gmail import works for anyone; see [docs/setup.md](docs/setup.md) for what is bank-specific.

## See it in action

A 2½-minute tour of every page. Every person, balance and transaction in it is made up: it's a demo copy with a pretend person called Rahul.

https://github.com/user-attachments/assets/a5428f12-a2d3-4358-8ad9-53823fb7567e

Each page opens with a sentence about your money. Point at a bold figure (or tap it on a phone) to see what's behind it, and use the buttons under it to add things. Everything saves straight to your Sheet.

<table>
  <tr>
    <th width="75%">On a computer</th>
    <th width="25%">On a phone</th>
  </tr>
  <tr>
    <td colspan="2"><b>Overview</b>: what you're worth, how the year is going, and what's coming up.</td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/ec8d18f7-c099-4249-ad1d-fafca4cd3212" alt="Overview on a computer, with made-up numbers"></td>
    <td><img src="https://github.com/user-attachments/assets/086bc30a-900d-4cd2-9b5d-8906ab49ddca" alt="Overview on a phone, with made-up numbers"></td>
  </tr>
  <tr>
    <td colspan="2"><b>Accounts</b>: every bank and broker balance, and how money moved each month.</td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/c49d6f1b-ea2e-44ec-81c8-ea002ed9cdc1" alt="Accounts on a computer, with made-up numbers"></td>
    <td><img src="https://github.com/user-attachments/assets/0ef089ff-ffd3-4bbb-84d0-26da682983b9" alt="Accounts on a phone, with made-up numbers"></td>
  </tr>
  <tr>
    <td colspan="2"><b>Cards</b>: each card's bill, due date and spending. Mark a bill paid, or import statements from Gmail.</td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/0907c34d-18f5-40f9-b171-b28a4ea10452" alt="Cards on a computer, with made-up numbers"></td>
    <td><img src="https://github.com/user-attachments/assets/c059acf4-c981-4918-905a-ef3e1944f22b" alt="Cards on a phone, with made-up numbers"></td>
  </tr>
  <tr>
    <td colspan="2"><b>Daily</b>: a quick diary of everyday spends. Tap a usual spend to add it to today.</td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/7257d555-9136-4b25-806c-fe6dc9c808a2" alt="Daily spending on a computer, with made-up numbers"></td>
    <td><img src="https://github.com/user-attachments/assets/2ee757c9-22b9-40f5-a9f7-5a9334764974" alt="Daily spending on a phone, with made-up numbers"></td>
  </tr>
  <tr>
    <td colspan="2"><b>Goals</b>: things you're saving for, each a planet. The closer to the middle, the sooner it's due.</td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/1a3fba0f-3af6-4176-a7f0-692674febb01" alt="Goals on a computer, with made-up numbers"></td>
    <td><img src="https://github.com/user-attachments/assets/4135979f-c631-4d43-9cb1-8c09a484731d" alt="Goals on a phone, with made-up numbers"></td>
  </tr>
  <tr>
    <td colspan="2"><b>Investments</b>: holdings at today's prices, returns against the index, and your own targets.</td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/4ed515b2-b9f0-4030-ac14-3281a86bbeae" alt="Investments on a computer, with made-up numbers"></td>
    <td><img src="https://github.com/user-attachments/assets/b9670f97-ef50-4d85-805e-ccad1cb9f285" alt="Investments on a phone, with made-up numbers"></td>
  </tr>
</table>

Subscriptions, Income, Expenses, Loans, Lent out, Insurance and Fixed income work the same way; the tour shows them all.

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
