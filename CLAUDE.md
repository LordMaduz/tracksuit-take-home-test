# Insights

Deno 2 workspace: `server/` (Oak + SQLite), `client/` (React 19 + Vite), `lib/`
(zod schemas shared by both). Read first: `Instructions.md` (the brief),
`docs/engineering-log.md` (findings, decisions), `docs/superpowers/plans/` (the
approved plan).

## Working agreement

Follow the approved plan in `docs/superpowers/plans/`. Before doing anything not
in it (a new file, moved code, a refactor, a dependency, a different approach),
stop, explain what and why, and wait for approval.

## Commands

- `deno install`: install dependencies
- `deno task dev`: server on :8080 and client on :3000. Open
  http://127.0.0.1:3000
- `deno task test:server`, `deno task test:client`
- `deno check` and `deno lint` before calling a step done

## Workflow

Test first: write a failing regression test naming its defect (#n in the log),
then the fix. One Conventional Commit per plan step, with no AI attribution
trailer.

## Boundaries

- **Always:** validate input at the route with zod; bound SQL parameters, never
  string-built SQL.
- **Ask first:** adding a dependency; any intended `deno.lock` change.
- **Never:** commit `server/tmp/` or an unintended `deno.lock` change.

## Gotchas

- The repo targets Deno 2.1.2. Newer Deno rewrites `deno.lock` into a new format
  on any run; restore it with `git checkout -- deno.lock` before committing.
- Vite listens on 127.0.0.1 only; `localhost` may fail.
- `@deno/vite-plugin` prints a harmless "Pre-transform error" in client tests.
- `deno task test:client` on Deno 2.9.8 can exit 1 with `Uncaught BrokenPipe`
  after all tests pass. Check the `Tests … passed` line, not the exit code.
