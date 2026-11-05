# Plan: fix the base, add create and delete, connect the frontend

**Goal:** finish the brief (create and delete endpoints, frontend wiring, bug
fixes) with the smallest complete change.

**Inputs:** the defects and gaps (#1–#16) are in
[engineering log §5](../../engineering-log.md#5-current-state-checked-by-running-it),
and the agreed design is in [§6](../../engineering-log.md#6-design-decisions).
This plan doesn't repeat them.

**Workflow:** brainstorm, agree the design (§6), plan (this doc), then build
test-first, review and verify. The design was a bounded change to existing
code, so the decisions live in the log rather than a separate spec.

**Rules for every step:**
- **Test first.** Write a failing regression test that names its defect number,
  then make it pass.
- **Keep `deno.lock` unchanged.** Local Deno (2.9.8) rewrites it into a newer
  format than the repo's 2.1.2, so run commands normally, then
  `git checkout -- deno.lock`. (`--frozen` refuses to run at all on 2.9.8.)
- **Work on a feature branch from `main`,** with one Conventional Commit per step
  (more if needed) and no AI attribution trailer. Open the PR into `main`.
- **Done** means the step's tests pass and `deno check` is clean for the files
  touched.

---

## Step 0: setup (done in the planning session)

- `CLAUDE.md`: working agreement, commands, workflow, boundaries, gotchas.
- Root `test:server` task, so `CLAUDE.md` only references commands that exist.
- These docs: the engineering log and this plan.

Implementation starts in a **new session**, because Claude Code only loads
`CLAUDE.md` at session start. The first commit is this setup (`docs:` and
`chore:`), so the history shows the plan before the code.

## Step 1: server base (#1, #2, #6, #7, #8)

- `server/app.ts` (new): `createApp(db)` creates the table if it doesn't exist
  and sets up the routes, and `main.ts` calls it. **Why the move (approved):**
  `main.ts` reads the env, opens the real database file and starts listening as
  soon as it loads, so tests can't import it. `createApp(db)` lets tests call
  `app.handle(Request)` against an in-memory database, which is what gives each
  route bug a regression test.
- `server/main.ts`: config, the database file and `listen` only.
- `server/tables/insights.ts`: `CREATE TABLE IF NOT EXISTS`.
- `GET /insights`: set `status`, not `body`, to 200.
- `GET /insights/:id`: id validated with zod → `400`; unknown → `404`.
- Remove the `GET /insights/create` and `GET /insights/delete` stubs. The real
  endpoints arrive in steps 3 and 4.
- **Tests,** in `server/app.test.ts`:
  - a fresh database lists `[]`;
  - list and lookup return JSON;
  - `999` → 404;
  - `abc`, `0`, `-1`, `1.5` → 400;
  - `/insights/create` no longer behaves as a write endpoint.

## Step 2: shared `lib/` (prepares #3–#5, #10, #16)

- `lib/brands.ts`: `BRANDS` moved from `client/src/lib/consts.ts`, plus a
  `BrandId` zod schema that accepts only listed ids.
- `lib/insight.ts`: one `Insight` schema (`id`, `brand`, `createdAt` via
  `z.coerce.date()`, `text`). It replaces `server/models/insight.ts` and
  `client/src/schemas/insight.ts`.
- Update the imports. Server test fixtures use real brand ids instead of `0`.
- **Tests:** the schema parses an ISO string into a `Date`; `BrandId` rejects
  unknown ids.

## Step 3: create (#9, #12)

- `server/operations/create-insight.ts`: a parameterised `INSERT`; returns the
  created row.
- `server/tables/insights.ts`: `insertStatement` becomes parameterised. The test
  fixture uses it too.
- `POST /insights`: body validated (6.4) → `201` + insight; invalid → `400`.
- **Tests:**
  - the operation inserts and returns the row;
  - text with `'` is stored as written (regression for #9);
  - the route covers 201, unknown brand, empty text, too long, and that the
    server ignores a client-sent `createdAt`.

## Step 4: delete (#12)

- `server/operations/delete-insight.ts`: returns whether a row was deleted.
- `DELETE /insights/:id` → `204`; unknown id → `404`; invalid id → `400`.
- **Tests:**
  - the operation deletes one row and leaves the rest;
  - the route covers 204, 404 and 400.

## Step 5: client (#3, #4, #5, #10, #13–#16)

- `app.tsx`:
  - state typed `Insight[]`;
  - `await` the response and check it with the shared schema;
  - a `refresh()` passed down so changes reload the list.
- `add-insight.tsx`:
  - controlled `<select>` (with a label and `key`) and `<textarea required>`;
  - `preventDefault`, then `POST`;
  - submit disabled while the text is empty;
  - the server's error shown;
  - close and refresh on success.
- `insights.tsx`:
  - the brand name from the shared list;
  - a formatted date;
  - delete as a real `<button aria-label>` that calls `DELETE`, then refreshes.
- **Tests** (Vitest + Testing Library):
  - the form posts the right body;
  - the delete button calls the API;
  - the list shows the brand name.

## Step 6: tidy-up (#11 and housekeeping)

- Fix the test fixtures (missing `id`) and the mislabelled `describe` in the
  lookup test.
- Patch upgrades: Vitest ≥ 3.0.5 (CVE-2025-24964) and Vite ≥ 6.0.12
  (CVE-2025-30208). This is the one intended `deno.lock` change. **Open
  decision, ask first:** on Deno 2.9.8 the upgrade also rewrites the whole
  lockfile into the new format. Either do it on Deno 2.1.2, or record it as a
  recommendation instead.
- `CLAUDE.md`: update only if commands or gotchas changed during the build.
- Engineering log: a "How I used AI" section, and results.

## Step 7: final check

- `deno check`, `deno lint`, `deno task test:server`, `deno task test:client`,
  all clean.
- A manual run-through at `http://127.0.0.1:3000` from a fresh database:
  list, add (including an apostrophe), delete, and invalid input. First delete
  the git-ignored `server/tmp/db.sqlite3`. It was created by hand during
  verification and already has the table, which would hide #1.
- One review pass over the whole diff. Fix the serious findings and log the
  minor ones.
