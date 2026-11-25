# Setting up your own copy

About 30 minutes, all on free tiers, and **nothing to install**: every step is in a browser. You make a **Google Sheet** that holds your data, a **Google Cloud project** that lets the app use it, and a **Vercel project** that runs the app. Everything stays in your own accounts.

The same steps are on the `/setup` page of the running app (`components/setup/SetupGuide.tsx`), which also checks your settings live. **Change one, change the other.**

**Who this is for.** Everyone who uses the app runs their own copy: their own Sheet, their own sign-in, nothing shared. The app is built for India first (rupees as the base currency, lakh formatting, parsers for Indian banks' statements). Everything except the Gmail import works for anyone.

Google moves its console's menus now and then. Each step says what to look for, not only where to click.

## 1. Copy the code

You need a free GitHub account.

1. Fork [the repository](https://github.com/nochaicoffee/chaiCoffeeFund) on GitHub (**Fork**, then **Create fork**), so Vercel can deploy your copy and you can pull updates later.

That is all. There is nothing to clone or install: a terminal is needed only for the optional Gmail import (step 8) or to change the code ([Running it on your own computer](#running-it-on-your-own-computer)).

## 2. A Google Cloud project

1. [Create a project](https://console.cloud.google.com/projectcreate) (any name).
2. Open [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com) in that project and press **Enable**.
3. For the Gmail import (step 8), also enable the [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com).

## 3. A service account and its key

The app reads and writes your Sheet as a robot account called a service account. You share the Sheet with it in the next step, the way you would with a person.

1. Open [Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), press **Create service account**, name it, and skip the optional role and access steps.
2. Open the new account, go to **Keys**, **Add key**, **Create new key**, **JSON**. A `.json` file downloads. Leave it in your Downloads folder for now: you paste what is inside it into Vercel in step 6.

A Google Workspace (work or school) account may block service account keys by policy. Use a personal Gmail account for the project, or ask the Workspace admin to allow it. Treat the key like a password: never paste it anywhere but Vercel, and delete the downloaded file once step 6 is done (if you need a key on your own computer later, make a new one the same way). If it leaks, delete the key in Google Cloud and make a new one.

## 4. Your Google Sheet

1. Make an empty spreadsheet at [sheets.new](https://sheets.new).
2. **Share** it with the service account's email as **Editor**. It looks like `name@project.iam.gserviceaccount.com`, is shown on the service account's page in Google Cloud, and is the `client_email` line in the key file.
3. Copy the spreadsheet's ID from its address (the part between `/d/` and `/edit`). You paste it into Vercel in step 6.

You never type into the Sheet by hand: the app builds every tab itself (step 7) and writes every row.

## 5. Sign-in with Google

Only the one Google account you name can sign in.

1. Open [the OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) (Google calls it Google Auth Platform now) and set it up: **External**, a name, your email as the contact. Under **Audience, Test users**, add your own address.
2. Open [Credentials](https://console.cloud.google.com/apis/credentials), **Create credentials, OAuth client ID**, type **Web application**.
3. Leave **Authorized redirect URIs** empty for now: your app's address doesn't exist until step 6, where you add it. If the form insists on one, enter `http://localhost:3000/login/google/callback`.
4. Copy the client ID and secret. You give Vercel these four settings in step 6:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAIL=you@gmail.com
SESSION_SECRET=(32 or more random characters: your password manager's generator makes one,
                or run: openssl rand -base64 48)
```

## 6. Deploy on Vercel

The free Hobby plan is enough. A production build serves nothing until sign-in is set up, so add the settings **before** the first deploy.

1. Sign up at [vercel.com](https://vercel.com/signup) with GitHub, then [Add New, Project](https://vercel.com/new) and pick your fork. Don't press Deploy yet.
2. Under **Environment Variables** add, for Production:

| Setting | What to put |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | The whole key file, pasted: open the downloaded `.json` in a text editor, select all, copy. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | The Sheet's ID (step 4). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From step 5. |
| `ALLOWED_EMAIL` | The one address that may sign in. |
| `SESSION_SECRET` | 32 or more random characters (step 5). |
| `OWNER_NAME` (optional) | The name in your greeting. |
| `NEXT_PUBLIC_TIME_ZONE` (optional) | Your zone, such as `America/New_York`. India's if left out. |

3. Press **Deploy**. Copy the address (`https://your-project.vercel.app`).
4. In Google Cloud add `https://your-project.vercel.app/login/google/callback` to the OAuth client's redirect URIs. Without it, sign-in fails with `redirect_uri_mismatch`.
5. In Vercel, **Settings, Functions**: leave **Fluid Compute** on (the daily sync needs it) and pick the region nearest you (Mumbai for India). Changing the region needs a redeploy.
6. Open your address and sign in, then go straight on to step 7: until the tabs exist, the other pages have nothing to read.

Use only the production address: preview deployments can't sign in, and they share the same Sheet. A setting changed in Vercel applies to the next deploy.

## 7. Build the Sheet's tabs

1. Open `https://your-project.vercel.app/setup` while signed in. The checklist at the top should show your Sheet as connected.
2. Press **Create the missing tabs**. It makes about 36 tabs, each a Sheets Table with the right columns and dropdowns, and checks them. It **only adds tabs**: one that already exists is left alone, so pressing it again is safe.
3. Open the Overview. It is empty on purpose: add an account first, then its balance.

If an update to the app adds a tab, the same button appears again (or run `npm run create-sheet` from your own computer). `npm run check-sheet` re-checks the structure at any time.

## 8. Gmail statement import (optional)

The app can read bank and card statements from your Gmail, **read-only** (it can't send, change or delete mail), and turn them into balances and dues. It is the one part that depends on your banks:

- **Card statements:** HDFC, ICICI, Axis, SBI Card, Kotak, YES, CSB, American Express.
- **Bank account statements:** HDFC (email and NetBanking), Slice, Jupiter, Canara, SBI.

Without it, you add statements and balances by hand and nothing else is affected.

**This is the one step that needs a terminal.** Google's Allow screen has to talk to a program on your own computer once, and that needs Node 20.9 or newer. Skip the step if you'd rather not.

1. In Gmail make two labels and a filter for each that files your banks' statement emails under it.
2. In Google Cloud, **Create credentials, OAuth client ID**, type **Desktop app**. Keep its ID and secret.
3. On your computer, clone your fork and install (see [Running it on your own computer](#running-it-on-your-own-computer)), then put the client ID and secret in `.env.local`:

```
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...
```

4. Run `npm run authorize-gmail`, open the link it prints, press Allow, and copy the `GMAIL_OAUTH_REFRESH_TOKEN=` line it prints.
5. Add all five Gmail settings to Vercel (the client ID, the secret, the token, and `GMAIL_STATEMENT_LABEL` and `GMAIL_ACCOUNT_STATEMENT_LABEL` with the label names exactly as written in Gmail), and redeploy.

**Publish the consent screen.** While it is in **Testing**, Google expires the Gmail token after 7 days and the import stops. Set **Publishing status** to **In production**. Google then shows an "unverified app" warning when you allow access: that is expected for your own app, so press Advanced and continue.

Many banks send statements as password-protected PDFs. Each card and account has a field for that password; it stays on your server and is never shown back.

## 9. Connect Claude (optional)

Your app can be a connector for Claude, so you can ask it to add a record and Claude writes it through the same checks the pages use. It can add and change records but never delete any.

1. Make a secret (32 or more random characters, or `openssl rand -base64 48`) and add it to Vercel as `MCP_ACCESS_TOKEN`. Redeploy. Without it the endpoint is off.
2. In Claude, **Settings, Connectors, Add custom connector**: URL `https://your-project.vercel.app/api/mcp`. Under advanced settings add a header `Authorization` with the value `Bearer <your token>`.
3. In Claude Code, instead: `claude mcp add --transport http chaicoffee https://your-project.vercel.app/api/mcp --header "Authorization: Bearer <token>"`.

If the token leaks, change it in Vercel and in the connector. Nothing else uses it.

## 10. The daily sync (optional)

If you use the Gmail import, Vercel can run it nightly. Add a secret as `CRON_SECRET` in Vercel (32 or more random characters) and redeploy; Vercel then calls `/api/cron/sync` by itself once a day (`vercel.json`). The next morning check **Vercel, your project, Logs**. You can always press **Sync statements** in the app instead. Not using Gmail? Leave `CRON_SECRET` unset: the daily call is then refused and does nothing.

On a Mac you can instead run the sync from a laptop with `scripts/launchd/` (edit the paths in the `.plist`).

## Running it on your own computer

Not needed to use the app. It is for the Gmail authorization (step 8) and for changing the code. You need Node 20.9 or newer.

```bash
git clone https://github.com/<your-name>/chaiCoffeeFund.git
cd chaiCoffeeFund
npm install
cp .env.example .env.local
```

`.env.local` stays on your computer: it is git-ignored. Every setting is explained in `.env.example`. For the Gmail authorization it needs only the client ID and secret. To run the app itself, also put a key file in a `secrets/` folder (git-ignored; make a new key as in step 3 if you deleted the first) and set, in `.env.local`:

```
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./secrets/service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=...
```

Then `npm run dev` serves the app at `http://localhost:3000` without asking you to sign in, and `npm run create-sheet` (in a second terminal) builds the tabs, the same as the button in step 7.

To try the sign-in locally, add `http://localhost:3000/login/google/callback` to the OAuth client's redirect URIs and put all four sign-in settings in `.env.local`. Setting `ALLOWED_EMAIL` turns the login on locally, and then `npm run create-sheet` can't run until you remove it again.

## When something doesn't work

- **Every page says login isn't set up (503).** One of the four sign-in settings is missing in Vercel, or was added after the last deploy. `/setup` is open to everyone and says which.
- **`redirect_uri_mismatch`.** The address in your browser isn't in the OAuth client's redirect URIs, character for character (https, no trailing slash).
- **"The caller does not have permission".** The Sheet isn't shared with the service account as an Editor (step 4).
- **"Requested entity was not found".** The spreadsheet ID is wrong. Copy it again from the address bar.
- **"Google Sheets API has not been used in project…".** Enable it (step 2) and wait a minute.
- **The pages are empty.** A new Sheet has no rows yet. Add an account first, then its balance.
- **I changed a setting and nothing happened.** Vercel settings apply to the next deploy: redeploy. `NEXT_PUBLIC_TIME_ZONE` is baked into the build, so it needs a redeploy too.
- **Getting updates.** On your fork's GitHub page press **Sync fork**; Vercel redeploys by itself. The app never changes your Sheet's existing tabs. If an update adds a tab, press the button on `/setup` again.
