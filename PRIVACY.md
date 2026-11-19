# Privacy Policy

_Last updated: 19 November 2026_

**Chai Coffee Fund** is open-source software that each person runs for themselves. There is no central service: whoever deploys a copy (the "owner") runs it in their own Google, Vercel and GitHub accounts, and is the only person whose data it handles. It is not offered to the public.

## What the app accesses

- **Gmail (read-only, optional).** If the owner turns on the statement import, the app reads emails under two Gmail labels that hold the owner's own bank account and credit card statements. It uses the `gmail.readonly` scope and cannot send, change or delete email.
- **Google Sheets.** The app reads and writes one Google Sheet that belongs to the owner. This is where all of its data is stored.
- **Google sign-in.** Only the owner's Google address can sign in. The app reads that address and nothing else from the account.

## What it does with the data

- Statement figures, such as balances, dues and transactions, are copied from the emails into the owner's Google Sheet and shown in the dashboard. The Sheet also keeps a log of each email read: its subject, date and message ID.
- Nothing from the owner's Google account, and no personal data, is sold, shared, or sent to any third party. The app looks up public market prices (only ticker symbols are sent) from a public price service.
- Data is not used for advertising or to train any model.
- No data is stored anywhere other than the owner's own Google Sheet and the hosting service that runs their copy.
- The app's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Retention and removal

The data lives in the owner's Sheet and can be edited or deleted there at any time. Access can be revoked at any time at https://myaccount.google.com/permissions.

## Contact

Questions about the software: open an issue on its GitHub repository. Questions about a particular deployment's data: ask the person who runs it.
