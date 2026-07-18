---
name: holiday-cfo
description: Record and query a personal double-entry ledger — 가계부, 카드 거래, 부채, 할부, 정기지출, 현금흐름 예측. Use when the user wants to record spending or income, asks what they owe or own, asks whether their cash will survive upcoming card bills (현금흐름), sets up a card/할부/정기지출, or closes their books. Also use when the user shares a screenshot of a bank or card transaction and wants it recorded. Do NOT use for general financial advice or investment questions.
---

# holiday — a double-entry ledger you drive from chat

`holiday` is a CLI. You run it; it owns the accounting. Every command takes
`--json` for machine-readable output on stdout, and errors always come back as a
single JSON envelope on stderr: `{"error":{"code":"...","message":"..."}}`.

## Running it

Codex has no bundled binary, so invoke the CLI through npm:

```bash
npx @holiday-cfo/cli@latest <command>
```

The first run downloads it. Everything after this document writes `holiday <cmd>`;
read that as `npx @holiday-cfo/cli@latest <cmd>`. Run `holiday --help` or
`holiday <command> --help` for exact flags.

**If a command reports `no .holiday/ found`, the user is starting fresh.** Ask,
then `npx @holiday-cfo/cli@latest init --currency KRW`. Tell them the directory
must be a **private** repository — ledger.db is their money.

## The rules you must not break

**Never invent an amount, a date, or an account.** If a receipt is blurry or the
user is vague, ask. This is the user's money, and you are the least reliable
component in the system — everything downstream assumes you read `₩1,240,000`
and not `₩1,240,00`.

**Every transaction must balance to exactly zero.** There is no tolerance. If
`holiday txn add` refuses with `unbalanced`, it tells you the exact residual; do
not "fix" it by nudging a number. Find the missing leg — a fee, a discount, a
rounding line — or ask.

**Never guess an account.** Run `holiday account list` and use what exists. If the
right account is missing, propose creating it and say what you'd call it.

**Show your work before you write.** For anything non-obvious, state the double
entry you're about to post in plain language and let the user confirm.

## Getting oriented

```bash
holiday account list          # what accounts exist
holiday balance               # what is owned and owed right now
holiday verify                # is the ledger sound and the audit chain intact
holiday cashflow --until 2026-12-31   # will the cash survive what is already coming
```

`cashflow` is usually the real question behind "how am I doing": it walks forward
from today's cash and subtracts every card bill, 할부 row and 정기지출 already
committed, and flags the day the balance goes negative. Read the ⚠ line out loud.

**What-if, without writing anything:** `holiday cashflow --spend "2026-09-01 5000000
새 노트북" --receive "2026-12-25 3000000 보너스"` folds hypotheticals into the runway
and touches nothing. `--spend` leaves, `--receive` arrives, both repeat. See the
Simulate workflow in `references/workflows/simulate.md`.

## Workflows

The real uses are routines, not one-off commands. Read only the one you need — each
is a self-contained file under `references/workflows/`. Scheduling is in
`references/automation.md`.

- **Setup** — `references/workflows/setup.md` — accounts, opening balances, CSV/Excel import.
- **Daily** — `references/workflows/daily.md` — record yesterday, show tomorrow's cash flow.
- **Weekly** (Sun) — `references/workflows/weekly.md` — assets & liabilities, next week, this week.
- **Monthly** (1st) — `references/workflows/monthly.md` — assert, then `holiday close`.
- **Simulate** — `references/workflows/simulate.md` — `cashflow --spend/--receive`.
- **Ask** — `references/workflows/ask.md` — answer from the ledger; no market advice.

## Recording from a screenshot

Read it and record it directly with `holiday txn add` — the review queue is for when
you genuinely want a human to check a batch first, not a default. You are the parser
(no OCR), so read the amount carefully; when it is unclear, ask rather than guess. A
mistake is one correcting entry, not a crisis. The draft/review flow, when you do
want it, is in `references/concepts/recipes.md`.

## Showing it as a dashboard

```bash
holiday dash init          # writes ./dash — a vinext app
cd dash && pnpm install && pnpm dev
```

Two files drive it:

- `dash/src/data/ledger.json` — the **figures**. Baked by the CLI. **Never yours.**
- `dash/src/data/spec.json` — the **layout**. Yours: choose the blocks and order.

**Do not type a number into spec.json** — no block prop accepts an amount. If a
figure is missing, add a block or a filter, not a literal. Blocks are listed in
`dash/AGENTS.md`. Re-bake with `holiday dash data` after any ledger change; the
dashboard is a snapshot, not a live view.

The built site is static — it reads the baked JSON and never opens ledger.db — so
it deploys to Codex Sites. Bake only what the user will share; it is their money.

## Load these when you need them

Read the one that matches the task, not upfront.

| File | Read it when |
|---|---|
| `references/automation.md` | Scheduling a workflow (Codex Automations / `codex exec` + cron). |
| `references/concepts/ledger-model.md` | Explaining *why* a number is what it is — units vs weight, the no-tolerance rule, foreign currency. |
| `references/concepts/accounts.md` | Creating or naming an account. |
| `references/concepts/transfers.md` | Moving money between the user's own accounts — the everyday case, and matching transfers when importing multiple accounts' history. |
| `references/concepts/schedules.md` | Setting up a card cycle, 할부, or 정기지출. |
| `references/concepts/recipes.md` | Recording from a screenshot, FX purchases, refunds, corrections, 마감. |

## What this cannot do yet

- **No OCR.** You are the parser. `ingest submit` takes what you read.
- **No auto-accept.** Every draft needs a human.
- **할부수수료 is not computed.** Read per-row fees off the statement, pass `--fees`.
- **No auto-fetched rates.** `holiday fx add` takes a rate you supply.
- **The dashboard is a snapshot, not live.** Re-bake after any change.
