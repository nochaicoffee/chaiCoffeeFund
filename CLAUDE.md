# Version Control

This project uses **jj (Jujutsu)**, not git, for version control. Even though jj can operate on a colocated git repo, always use `jj` commands for version control operations — never `git` commands directly (no `git add`, `git commit`, `git push`, etc.).

Common mappings:
- `jj status` instead of `git status`
- `jj diff` instead of `git diff`
- `jj new` to start a new change (jj has no staging area — edits are tracked automatically)
- `jj describe -m "message"` to set a change's commit message (jj commit == describe + new)
- `jj log` instead of `git log`
- `jj git push` / `jj git fetch` for remote sync (if a git remote is configured)
- `jj undo` / `jj op log` for safe recovery instead of `git reset`/`git reflog`

Follow the same safety principles as with git: avoid destructive/irreversible operations (e.g. `jj abandon`, force pushes) without explicit user confirmation, and never bypass hooks unless asked.

# Secrets Handling

This project deals with personal financial data (credit card statements, bank balances, loans, subscriptions, investments) and integrates with the Google Sheets API. **No keys, tokens, passwords, service account credentials, or other secrets may ever be written into a tracked file or enter commit history.**

- Service account JSON keys, `.env` files, API keys, and any credential files must stay local-only and untracked — see `.gitignore`.
- Never hardcode secrets directly in source files, config files, or example files, even temporarily "to test."
- Before any `jj describe`/commit-equivalent operation, or before `jj git push`, check that no secret files or hardcoded credentials are staged for the change.
- If a secret is ever accidentally committed, treat it as compromised: rotate/revoke it immediately, then remove it from history (do not just delete the file in a new commit) — ask the user before rewriting history.
- Prefer environment variables or a local, gitignored credentials file over any other way of supplying secrets to the app.

## Required local environment variables

Create `.env.local` yourself (gitignored, and blocked from tool writes by permission settings — this is intentional) with:

- `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` — path to the service account JSON key, e.g. `./secrets/service-account.json` (the `secrets/` directory is gitignored).
- `GOOGLE_SHEETS_SPREADSHEET_ID` — the target spreadsheet's ID (the long id in its URL between `/d/` and `/edit`).

# Code Maintainability & Architecture

The full system design — domain model, architecture decisions, and a running log of real fixes as they're found — lives at [`docs/system-design.md`](docs/system-design.md), inside the repo. It used to live at `~/.claude/plans/`, outside the repo, and was lost when that folder was deleted. Never keep project docs outside the repo again. **Read it before making structural changes, and add to it when you find or fix something non-obvious** — it's a living document, not a historical record of the original design.

## Adding a new entity (new financial data type)

Every entity follows the same shape. Adding one means:
1. Add its type(s) to `src/lib/sheets/types.ts` — enum fields as Title-Case string literals, hyphenated for multi-word values (`"Emergency-Fund"`, not `"emergencyFund"`), matching the Sheet's actual dropdown text exactly (Sheets Tables validate writes against that literal text).
2. One file at `src/lib/sheets/<entity>.ts` holding **both** the `createRepository(...)` config **and** its zod `create<Entity>Schema`/`update<Entity>Schema` — keep them together, not in a separate schemas file, so everything about one entity stays in one place.
3. Two route files using the factories in `src/lib/api/createCrudRoutes.ts` (`createListRoute`, `createItemRoute`) — this should be ~4 lines each, not hand-rolled logic. Only reach for a custom route (like `loans`) when an entity's write does more than one thing (e.g. also generates a schedule).
4. If pages will read it, add a cached list/getById pair to `src/lib/sheets/cached.ts` via the existing `cachedList`/`cachedGetById` helpers, and a tag in `CACHE_TAGS`.

If a step feels like it needs new boilerplate instead of just using the existing factories, that's a sign the factories need extending — extend them, don't duplicate around them.

## Where logic lives

- `lib/sheets/` is I/O only (repository CRUD, caching, validation at the boundary). No business logic here.
- `lib/aggregate/` and `lib/schedule/` are pure functions with no Sheets/network dependency — computations (net worth, utilization, EMI schedules, FX/cost-basis math) live here specifically so they're unit-testable against fixture data. Every new computation should be a pure function here with a test file next to it, not inline in a page or route.
- Never guess a money-math formula (interest, FX conversion, amortization, cost basis) from old data or assumption. Ask what's actually intended, then write a test that proves the *math* (e.g. "principal fully repays to exactly zero," "interest strictly decreases"), not just that the code runs.

## Verifying a change to the Sheets layer

Unit tests alone won't catch Sheets-specific gotchas — the Sheets API returns display-formatted values by default (not raw), a Table append needs confirming it actually lands inside the Table's range with formatting intact, and concurrent writes to the same tab can race. Before considering a change to `lib/sheets/` done: create a real row through the app against the actual Sheet, confirm it, update it, delete it, and confirm the sheet is clean again — sequentially, not concurrently, if deleting multiple rows against one tab.

Tab names and column order in the real Sheet are ground truth, not what was discussed — after the user says a tab is built, verify its actual name and header order before assuming a repository's `sheetName`/`columns` still match.

## Don't drive Google Sheets' UI via browser automation

Low-level browser automation (click + type synthetic events) against the Sheets grid is unreliable — cells don't clear/type correctly, characters land in the wrong place. Don't attempt it for adding rows/headers/data. Either ask the user to make the change in Sheets directly, or make it through the Sheets API (`googleapis`) via the app's own code.

# Design Artifacts

UI/UX design work (Claude Design canvases — `.dc.html` artboards plus `canvas.json`) must be built as **working files inside this repo**, never left only in a session's scratchpad/temp directory. Scratchpad dirs get swept by the OS with no warning — a full week of dashboard-design mockups was lost that way once already.

- Source of truth: `design/<canvas-name>/*.dc.html` and `design/<canvas-name>/canvas.json` — one directory per distinct canvas or exploration (e.g. `design/dashboards/AccountsList.dc.html`). These are real project files: track and commit them with `jj` like anything else, once a design session's changes are ready.
- The Claude Design skill's seeded/published output — the large single-file HTML with the editor payload baked in — is a *build artifact*, not source. Regenerate it on demand from the `.dc.html`/`canvas.json` files with the skill's `seed-canvas.mjs` helper; write that generated file to the scratchpad (not into `design/`) and hand it to the user directly rather than committing it.
- If publishing to a Claude Artifact URL is ever blocked, unreliable, or the artifact gets overwritten by something unrelated, the repo copy of the `.dc.html`/`canvas.json` files is the durable source of truth — re-seed from there and hand over the output file again, rather than depending on the hosted artifact to survive.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
