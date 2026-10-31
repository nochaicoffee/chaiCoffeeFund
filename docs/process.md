# How we build chaiCoffeeFund

A company-style process, scaled for one person: real docs, tracked work, a reviewed PR for every change, and no meetings or sprints. Decided 2026-10-16.

## Lifecycle

Every feature goes through these stages in order. Small fixes can skip to step 4.

| Stage | Question it answers | Output |
|---|---|---|
| 1. Define | What are we building, and why? | A feature in [prd.md](prd.md) with priority, user story and acceptance criteria |
| 2. Design | What does it look like, and how does it work? | A mockup in [`design/`](../design/), the relevant section of [system-design.md](system-design.md), and an [ADR](adr/) for any decision that's hard to reverse |
| 3. Plan | What's the work, and in what order? | An epic issue with task issues under it, in a milestone, on the Project board |
| 4. Build | Does it work? | One PR per issue that passes CI, gets reviewed and is merged |
| 5. Ship | Is the milestone done? | Every epic's acceptance criteria checked off, and the milestone closed |

## Where things live

- **Docs:** `docs/`, and only `docs/`. The original design doc was lost because it lived outside the repo, so nothing project-related goes outside the repo again.
- **Work:** GitHub Issues and the Project board on the private repo `nochaicoffee/chaiCoffeeFund`.
  - **Milestone:** a release, such as `M1 · Cards end-to-end`.
  - **Epic:** an issue labelled `epic`, one per PRD feature (for example, `F-CC-02 Statement import from Gmail`). The epic links to its PRD ID and carries the acceptance criteria as a checklist.
  - **Task:** an issue linked to its epic. Each task is about a day of work or less, small enough for one PR.
- **Labels:**
  - Type: `feat`, `bug`, `chore`, `docs`, `design`
  - Area: `area:cards`, `area:accounts`, `area:subscriptions`, `area:income`, `area:loans`, `area:fixed-income`, `area:investments`, `area:insurance`, `area:goals`, `area:overview`, `area:platform`
  - Priority: `P0` (must ship in the milestone), `P1` (should), `P2` (nice to have)

## Ready to start (Definition of Ready)

An issue can start when it has all of these:

- It links to a PRD feature ID, or it's a bug or chore.
- Its acceptance criteria are written.
- Every open question it depends on is answered in the PRD's open questions.
- If it touches the UI, it links the mockup artboard it implements.

## Build workflow (jj + GitHub)

```bash
jj git fetch
jj new main@origin                      # start from the latest main
# ...make the change; jj tracks edits automatically...
jj describe -m "feat(cards): add statement form (#12)"
jj git push --named feat/12-statement-form=@
gh pr create --fill --base main --head feat/12-statement-form
```

- One PR per issue. The PR body says `Closes #12` so merging closes the issue.
- Commit messages use [Conventional Commits](https://www.conventionalcommits.org/) types: `feat`, `fix`, `chore`, `docs`, `design`, `test`, `refactor`.
- CI must pass: lint, typecheck and unit tests (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
- Before merging, run a code review pass (`/code-review` in Claude Code) and fix or explicitly dismiss each finding.
- Merge with **squash and merge**, so `main` gets one clean commit per PR.
- **Working in a separate jj workspace** (`jj workspace add --name <name> -r main ../chaiCoffeeFund-ws/<name>`), so a long build doesn't share a working copy with other sessions. Link `node_modules`, `secrets` and `.env.local` from the main checkout (`ln -s ../../chaiCoffeeFund/node_modules node_modules`, and the same for the other two); all three are gitignored. Turbopack refuses a symlink that leaves the project, so run the dev server with `npx next dev --webpack -p <port>` there (and `CHAI_COFFEE_FUND_URL=http://localhost:<port> npm run check-sheet`). The `node_modules` link was tracked by mistake until #202: a workspace made before it loses its link when it moves onto a later `main`, so link it again.

## Done (Definition of Done)

A PR is done when it does every item below that applies:

- [ ] Meets the issue's acceptance criteria.
- [ ] Any new computation (money math, dates, aggregation) is a pure function in `lib/aggregate/` or `lib/schedule/` with a test that proves the math, not just that it runs.
- [ ] Any change to `lib/sheets/` has had a real round trip against the actual Sheet (create, confirm, update, delete, confirm clean), run sequentially.
- [ ] UI changes checked in the browser with real data and with an empty state, in light and dark mode, at desktop and phone width.
- [ ] No secrets in the diff (keys, tokens, passwords, `.env*` files); see the Secrets Handling rules in [CLAUDE.md](../CLAUDE.md).
- [ ] Docs updated in the same PR: the PRD feature status, `system-design.md` if the architecture changed, and a new ADR if a hard-to-reverse decision was made.

## Shipping a milestone

When every P0 epic in a milestone is closed, walk its acceptance criteria against the running app. Then close the milestone and update the feature statuses in the PRD.
