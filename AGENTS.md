# AGENTS.md

## Cursor Cloud specific instructions

This is a pnpm + Turborepo TypeScript monorepo for `holiday`, a single-person
double-entry bookkeeping CLI. The product is the CLI; `apps/docs` is an optional
Fumadocs/Next.js documentation site.

### Toolchain / gotchas
- The repo requires **Node >= 24** (uses the builtin `node:sqlite` and
  `--experimental-strip-types`). The sandbox ships a Node 22 binary at
  `/exec-daemon/node` that appears early on `PATH` and would otherwise shadow
  nvm. Node 24 + pnpm 11.5.2 are symlinked into `/usr/local/cargo/bin` (the
  first `PATH` entry, ahead of `/exec-daemon`) so `node`/`pnpm` resolve to v24
  in every shell. This is baked into the environment; the startup update script
  only refreshes dependencies (`pnpm install`). If `node --version` ever reports
  v22, re-point those symlinks at the nvm Node 24 `bin` dir.
- pnpm is provided via corepack (`pnpm@11.5.2`, the `packageManager` pin).

### Build / test / run
- Standard scripts (see root `package.json` / `turbo.json`): `pnpm install`,
  `pnpm build`, `pnpm test`, `pnpm typecheck`. All run via Turbo with `^build`
  deps.
- **`pnpm lint` is currently broken at the repo level** — there is no
  `eslint.config.*` file, and ESLint 9 requires flat config, so `eslint .`
  errors out. This is a pre-existing repository issue, not an environment
  problem. Use `pnpm typecheck` as the working static-analysis gate.
- **No external services are needed** to build/test/run: SQLite is the builtin
  `node:sqlite` (a local file, no server), and the Postgres adapter's tests run
  against in-process `pglite` (Postgres-in-WASM). No Docker, DB server, env
  vars, or network access are required.

### Running the CLI (the product)
- After `pnpm build`, the CLI entry point is `packages/cli/dist/main.js`; run it
  with `node packages/cli/dist/main.js <command>`. A committed single-file
  bundle also exists at `plugin/bin/holiday.mjs`.
- The CLI writes to a local `.holiday/ledger.db` in the current working
  directory (created by `holiday init`), so run demos in a scratch dir.
- Core flow: `init` → `account add` → `card add` → `txn add` → `cashflow`
  (the payoff command; flags the day cash runs `⚠ SHORT`) → `verify` (audit
  hash-chain).

### Docs site (optional)
- `pnpm --filter @holiday/docs dev` serves the docs on port 3000. A
  `fumadocs-mdx` postinstall runs automatically during `pnpm install`.
