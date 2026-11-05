# Engineering Log

How I approached this exercise and why. The diff shows *what* changed; this
records the reasoning, the evidence and the trade-offs.

**Contents:** 1. Context · 2. System overview · 3. Approach ·
4. Pre-flight security review · 5. Current state, checked by running it ·
6. Design decisions · 7. Plan · 8. Environment notes · 9. Results ·
10. Recommendations · 11. How I used AI

---

## 1. Context

**The brief:** Insights is "nearly complete" and "pretty much flawless". Finish
the create and delete endpoints, connect them to the frontend, fix any bugs, and
understand the code well enough to maintain it.

**How I read it:**

| What the brief says | What I take from it |
|---------------------|---------------------|
| "A few hours, or you're over-thinking it" | Smallest change that fully works. Extend the existing patterns; no rewrites, no new dependencies |
| "Pretty much flawless" | A claim to check, not to trust. Prove the current state before building on it |
| "Something to talk over in the interview" | The reasoning matters as much as the code, hence this log |
| "You'll be maintaining this code" | Leave it more testable and easier to follow than I found it |

## 2. System overview

```
Browser ─► Vite :3000 ──/api/* (prefix stripped)──► Oak :8080 ─► SQLite (server/tmp/db.sqlite3)
           React 19                                 main.ts → operations/* → tables/*
```

| Layer | Stack | Notes |
|-------|-------|-------|
| Runtime | Deno 2 workspace (`client`, `server`, `lib`) | Locked down by default: the server asks only for specific permissions, the client tasks run with `-A` |
| Server | Oak (routing), `@db/sqlite` (FFI), zod (models) | One `operations/<verb>-insight.ts` per action, each with a test using the in-memory `withDB` fixture. **New endpoints follow this pattern** |
| Client | React 19, Vite, CSS Modules, framer-motion | Server state lives in `App`. The add-insight form sits inside `Header` |
| Shared | `lib/` | Zod parsers used by both sides (currently `Port`) |

## 3. Approach

1. **Check it's safe to run** before running it
2. **Read every file**, then **confirm** each suspected problem by running the code
3. **Fix the base first** (existing bugs), so new work isn't built on broken behaviour
4. **Build** create and delete, then connect the frontend
5. **Check**: type check, lint, tests, manual run-through

## 4. Pre-flight security review

**Why:** this is unfamiliar third-party code, and setup runs it with broad
permissions. Fake take-home repos are a known way to spread malware, so I read
it before running it.

**Scope (read only, nothing executed):** git hooks, editor tasks, all `deno.json`
tasks, the Nix flake, dependency install scripts and names, remote imports,
source code (shell commands, `eval`, obfuscation, data sent off the machine),
hidden Unicode, binary assets, committed secrets.

**Verdict: safe to run.** Nothing malicious. No hooks, no editor tasks, no
install scripts (0 of 209 npm packages), no remote imports, no hidden content.

**Worth knowing:**

| Finding | Exposure here | Action |
|---------|---------------|--------|
| Vitest 3.0.2: [CVE-2025-24964](https://osv.dev/vulnerability/CVE-2025-24964). Any website can run code through Vitest's API server | Low. `vitest run` doesn't start that server | Recommended, not applied (§10) |
| Vite 6.0.3: [CVE-2025-30208](https://advisories.gitlab.com/pkg/npm/vite/CVE-2025-30208/). Bypass of `server.fs.deny` lets anyone who can reach the dev server read files | Only if the dev server is exposed with `--host` | Recommended, not applied (§10) |
| Client tasks run with `-A` | Any compromised dependency gets full access | Accepted (normal for Vite on Deno); the lockfile hashes limit the risk |

**Limits:** dependencies were checked by name, version and lockfile hash, not by
reading their source.

## 5. Current state, checked by running it

Checked by running the server and client, calling every endpoint, running
`deno check` and both test suites. **No code was changed for this.** To get
past #1, I created the table in the local (git-ignored) database by hand.

**Baseline:** server tests 2/2 ✅ · client tests 6/6 ✅ · `deno check` ❌ (4 errors).
The tests pass because none of them cover the broken paths, which is itself a
finding.

### 5.1 Defects

| # | Severity | Defect | Evidence |
|---|----------|--------|----------|
| 1 | **Blocker** | The database table is never created (only the test fixture creates it) | Every data endpoint returns 500: `no such table: insights` |
| 2 | **Blocker** | `GET /insights` sets `body = 200` instead of `status` | Response body is `200`, both directly and through the proxy |
| 3 | **Blocker** | Client stores `res.json()` (a Promise) without awaiting it | `deno check`: "Did you forget to use 'await'?" |
| 4 | **Blocker** | Client and server disagree on fields: server sends `brand`/`createdAt`, client expects `brandId`/`date` | `{"id":1,"brand":2,"createdAt":"…","text":…}` vs the client schema. Currently hidden behind #2 (the UI shows "We have no insight!" instead of crashing) |
| 5 | High | Dates are strings in JSON, but the client types them as `Date` and never parses the response | `createdAt` arrives as an ISO string |
| 6 | High | Create and delete are registered as `GET` | They change data, so they need `POST`/`DELETE`. GETs get prefetched and crawled, and are easy CSRF targets |
| 7 | High | `/insights/:id` is registered before `/insights/create` | Log: `Looking up insight for id=create` |
| 8 | High | Lookup doesn't validate the id and has no 404 | `/insights/999` and `/insights/abc` both return `200` with an empty body |
| 9 | High | `insertStatement` builds SQL from strings (SQL injection) | `"Men's suits"` produces invalid SQL. Only used in tests today, but it's the obvious thing to reuse for create |
| 10 | Medium | `useState<Insight>` should be `Insight[]` | `deno check` errors |
| 11 | Low | Test fixtures are missing `id`; `<option>` has no `key` | `deno check` error and React `key` warnings |

### 5.2 Feature gaps (the work itself)

| # | Gap |
|---|-----|
| 12 | Create and delete endpoints are TODO stubs |
| 13 | The add form isn't connected: inputs aren't controlled, there's no submit handler, and it doesn't call `preventDefault`. The brand `<select>` has no label |
| 14 | Delete does nothing. The icon is an `<svg onClick>`, so a keyboard can't reach it and it has no accessible name |
| 15 | The list doesn't refresh after a change: the list lives in `App`, the form in `Header` |
| 16 | The list shows the raw brand id instead of the brand name |

## 6. Design decisions

Agreed before building. The test for each one: does it fix a confirmed defect or
deliver what the brief asks, with the least new code?

### 6.1 Brands: one list in `lib/`

Brands are hardcoded in `client/src/lib/consts.ts`. The server stores an integer
and checks nothing, so it accepts brands the UI can't show.

**Decision:** move the list to `lib/`. The client uses it for display, and the
server uses it to reject unknown brands.

**Why not a brands table:**
- **YAGNI.** Nothing in the brief needs brands to be added, renamed or managed.
  What the right model is depends on how brands grow, which nobody knows yet,
  so building for it now would be guessing.
- **KISS.** A shared constant is the simplest thing that gives one source of
  truth and server-side validation. `lib/` already exists for exactly this,
  and is used for `Port`.

### 6.2 Contract: one `Insight` schema in `lib/`

Two schemas disagreed (`brand`/`createdAt` on the server, `brandId`/`date` on the
client). That one root cause is behind #3, #4, #5 and #10.

**Decision:** one shared schema with the server's field names, which match the
database columns. JSON has no date type (RFC 8259), so `createdAt` travels as an
ISO 8601 string and is parsed back with `z.coerce.date()`. The client checks every
response against the schema, so a contract change fails loudly at the boundary.

### 6.3 HTTP methods and status codes (RFC 9110)

| Action | Request | Success | Errors |
|--------|---------|---------|--------|
| List | `GET /insights` | `200` + array | — |
| Lookup | `GET /insights/:id` | `200` + insight | `400` invalid id · `404` |
| Create | `POST /insights` `{brand, text}` | `201` + created insight | `400` invalid body |
| Delete | `DELETE /insights/:id` | `204` | `400` invalid id · `404` |

- `GET` must be safe: browsers and crawlers prefetch it, so a GET that writes is
  a bug.
- Separate methods remove the route-order clash with `/insights/:id` (#7)
  instead of working around it.
- The server sets `createdAt`, because the client's clock can't be trusted.
- **Left out (YAGNI):** `Location` header, pagination, update.

### 6.4 Input validation (OWASP Input Validation, SQL Injection Prevention)

Validated once, at the route, with zod. Operations receive data that is already
checked.

- **`:id`:** a whole number above 0.
- **`brand`:** must be in the shared brand list.
- **`text`:** trimmed, 1–1,000 characters. The maximum is a product assumption to
  confirm.
- **Fields the server owns** (`id`, `createdAt`) are ignored if a client sends
  them.
- **Failures** return `400 {"error": "…"}`, with no stack traces.
- **SQL** uses bound parameters, never string building (#9). Validation catches
  bad data; parameters make injection impossible even if bad data gets past it.
- **Client:** a required textarea, submit disabled while empty, and the server's
  message shown on error. That's for a better experience, not for security.

### 6.5 Investigated, not built

Looked into because they're real concerns, but they don't apply to this brief.

| Topic | Finding | When it would matter |
|-------|---------|----------------------|
| Numeric ids and IDOR | No auth, no tenants, and the full list is public, so guessing ids reveals nothing | With users and tenants: check per object that the user may access it first (OWASP API1:2023), then use opaque ids (UUID/ULID) as an extra layer |
| Request size limit | The 1,000-character rule runs after the body is read, so a huge request can still use up memory | In production: set at the reverse proxy (e.g. nginx `client_max_body_size`) |
| SQLite | Embedded, single file, one writer at a time. A good fit for one server with small data, and the tests use it in memory | More than one app server → Postgres. Caveats: `tmp/` doesn't survive container restarts, and calls are synchronous, so a slow query blocks the server |

## 7. Plan

The step-by-step build plan, with files, tests and the definition of done for
each step:
[`docs/superpowers/plans/2026-11-05-insights-create-delete.md`](superpowers/plans/2026-11-05-insights-create-delete.md).

## 8. Environment notes

- **Deno version:** the repo targets 2.1.2; checked on 2.9.8. Newer Deno
  automatically upgrades `deno.lock` from format v4 to v5 when it runs. That was
  reverted to keep the diff limited to real changes. `--frozen` refuses to run
  at all on 2.9.8, so commands run normally and `deno.lock` is restored with
  `git checkout -- deno.lock` afterwards.
- **Dev server address:** Vite listens on `127.0.0.1` only. Open
  `http://127.0.0.1:3000`; `localhost` may resolve to IPv6 and fail.
- **Harmless warning:** `@deno/vite-plugin` prints a "Pre-transform error" for
  Vitest's own files during client tests. It isn't from the app's code and
  doesn't fail any tests.
- **Flaky exit code:** on Deno 2.9.8, `deno task test:client` sometimes exits 1
  with `Uncaught BrokenPipe` *after* Vitest reports every test passed. It also
  happens on the untouched baseline and with `vitest run` called directly, so
  it comes from the toolchain, not the tests. Read the `Tests … passed` line.

## 9. Results

| Check | Before | After |
|-------|--------|-------|
| Server tests | 2 files | 7 files, 48 steps, all pass |
| Client tests | 6 | 11, all pass |
| `deno check` | 4 errors | clean |
| `deno lint` | 15 problems | clean |

Every defect and gap in §5 (#1–#16) is covered. Each fix has a test named after
its number that failed before the fix and passes after it. Some were proved
against the original code: #1 returned `500`, #2 a body of `200`, #8 `200` for
`999` and `abc`, and #9 failed with `near "s": syntax error` on `Men's`.

**Browser end-to-end check.** Run in a real browser from a fresh database:
the empty state shows; a whitespace-only insight can't be submitted; a
1,027-character insight is rejected with the server's message and nothing is
stored; text with apostrophes, quotes and `<b>` is stored and shown verbatim,
not as HTML; the list refreshes without a reload (#15); dates show in local
time (#5); the list loads and renders (#3); delete removes the right row and
survives a reload. A recording of the run is kept outside the repo.

**Deviations from the plan, and why:**

- The `lib/` schema tests live in `server/lib.test.ts`. Neither test task runs
  `lib/`, and giving `lib/` its own `@std` imports would change `deno.lock`.
- The route-level `:id` check is digits only (`/^[1-9]\d*$/`), stricter than
  `z.coerce.number()`, which would accept `1e2`, ` 1` and `0x1`.
- `Insight.brand` is any integer. Unknown brands are rejected when an insight is
  created, so one bad old row can't stop the client parsing the whole list.
- There's no `App`-level test for #3 (await and parse the list); it's covered by
  the browser end-to-end check below. Worth adding next.

## 10. Recommendations

**Patch upgrades (not applied).** The upgrade belongs on the repo's Deno 2.1.2:
on 2.9.8 the same change also rewrites the whole `deno.lock` from format v4 to
v5, which would bury a two-package change in a full-file diff. Exposure is low
(see §4), so it's recorded rather than forced:

```sh
# on Deno 2.1.2, in client/deno.json
"vite": "npm:vite@^6.0.12",      # CVE-2025-30208
"vitest": "npm:vitest@^3.0.5",   # CVE-2025-24964
deno install && deno task test:client   # then commit deno.lock
```

**Next:** an `App` test that mocks `fetch` (#3); showing list and delete errors
in the UI (today they're logged to the console); moving the toolchain to a
current Deno, with the lockfile rewrite as its own commit.

## 11. How I used AI

I used Claude Code as a pair, with me making the decisions:

- **Before any code:** it helped with the security pre-flight and with reading
  and running the repo. I checked the findings (§4, §5) myself and agreed the
  design (§6) before any plan was written.
- **Guardrails:** `CLAUDE.md` sets the working agreement: follow the approved
  plan, test first, use bound SQL, ask before touching dependencies or the
  lockfile. It stopped twice for decisions outside the plan (where the `lib/`
  tests go, and the lockfile), and I made both calls.
- **Building:** one step at a time, test first. For each defect it watched the
  test fail for the right reason before fixing it. One commit per step, with
  `deno check`, `deno lint` and both suites run before each commit.
- **Checking:** a review of the whole diff, then an agent drove a real browser
  (Claude in Chrome) through the end-to-end scenarios from a fresh database,
  then my own manual check (§9).

