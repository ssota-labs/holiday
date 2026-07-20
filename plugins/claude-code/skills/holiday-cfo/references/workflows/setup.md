# Setup — the first session

Record directly, fix later — this is the default across all workflows (see the
skill body). The goal here is a ledger that reflects reality now, then as much
history as is worth entering.

1. **Create it.** `holiday init --currency KRW` (ask the currency). This also
   writes the project's `AGENTS.md`/`CLAUDE.md` — the concepts, the standard
   chart, the voice. Everything below leans on that file; read it now if your
   host has not auto-loaded it.
2. **Accounts — offer the standard chart.** Propose the chart from the ledger
   `AGENTS.md` (§표준 차트: "이 표준 차트로 시작할까요?") and create what the
   user accepts, then their actual banks/cards/debts on top. Mark spendable
   accounts `--cash`. Set card billing cycles with `holiday card add`, 할부,
   정기지출, 정기수입, loans — naming rules and the schedule traps are in the same file.
3. **Classification rules, before importing — do not skip this.** And seed them
   from the DATA, not from imagination: parse the raw file first (without
   importing), count payees by frequency, and bring the user the top of that
   list — "이 20개 가맹점이 전체 거래의 60%입니다. 스타벅스→Food:Cafe,
   LGU+→Telecom …으로 잡을까요?" Confirm the mapping, then `holiday rule add`
   each one. One rule classifies every matching row across ten years at once,
   which is why this scan pays for itself instantly — the queue that survives to
   the categorize screen should hold only the genuinely ambiguous tail. Rules
   only fire on `money` items (see the import section), so this step and the
   item format below are one mechanism: skip either half and every row lands
   unclassified.
4. **Opening balances.** For each asset/liability that already has a balance, post
   it against `Equity:Opening` dated the start point:
   `holiday txn add --date 2026-01-01 --leg "Assets:Bank:Shinhan 4310000 KRW" --leg "Equity:Opening -4310000 KRW"`.
5. **Document skills (companion) — before any CSV/Excel/PDF import.** These are
   Anthropic's format skills (`xlsx` / `pdf` / `docx` / `pptx`), installed into
   **this ledger project** via skills.sh — not copied into the holiday-cfo
   skill tree, and not a home-global (`-g`) or Claude marketplace default. From
   the ledger project root:

   ```bash
   npx skills add https://github.com/anthropics/skills --skill xlsx -y
   npx skills add https://github.com/anthropics/skills --skill pdf -y
   npx skills add https://github.com/anthropics/skills --skill docx -y
   npx skills add https://github.com/anthropics/skills --skill pptx -y
   ```

   That creates `.agents/skills/<name>/` and `skills-lock.json` in this folder.
   Skip only when those already exist here. If the skills CLI offers agent
   targets, include the current host (e.g. `-a claude-code`). SessionStart hooks
   later run `npx skills update -p -y` (soft-fail) so this project stays current —
   Codex may require trusting plugin hooks first; the install commands above still
   work without trust.
6. **History, if they have a file.** This is where you earn your keep — see below.
7. **Confirm.** `holiday balance`, then `holiday assert` each account against what
   the user can see in their banking app. Assertions are the only check against the
   outside world; use them.
8. **Offer automation.** Once the ledger is real, ask about scheduling the daily /
   weekly / monthly workflows — `../automation.md`.

## Importing a CSV or Excel export — you are the importer

There is no `import` command, on purpose. Every bank's export is shaped
differently, and a rigid parser would fight that. You are a better importer than a
fixed schema: **read the file, work out what its columns mean, and write a script
that builds `money` items for one `ingest submit` batch.** You extract the facts;
the rule table classifies; the human arbitrates the leftovers. That division is
the whole reason this is an agent task and not a CLI flag.

- Read the file. Figure out which column is the date, which is the amount, which is
  the description, and the sign convention (is a debit negative, or in a separate
  column?).
- **Emit `money` items — facts only. Do NOT build the category leg yourself.**

  ```json
  { "date": "2016-03-17", "payee": "체크카드 버거킹고대중앙광장",
    "money": { "account": "Assets:Bank:KB:Start", "amount": "-5300", "commodity": "KRW" } }
  ```

  The CLI completes the double entry: a rule picks the category (and the row
  posts under `--post`); no rule → it parks in Uncategorized as a DRAFT for the
  categorize screen. **The moment you write the category leg yourself, you have
  switched the classifier off** — a full-`legs` item is treated as decided, rules
  never run, and no queue appears. This exact mistake once posted 10,191 rows
  straight into Uncategorized with zero drafts. Full `legs` are for rows that
  genuinely carry their own category (FX with `@@`, or a category the file
  itself states) — never for "I don't know", and never `...:Uncategorized` by
  hand (the CLI now drafts those anyway, with a warning).
- **Before parsing anything, run `holiday ingest list`.** It shows every import
  that ever ran — which source files, when, how many rows. The ledger is the
  provenance record, not your memory of the session; a file already listed is
  done, skip it.
- Post them, **one source file = one submission**:

  ```bash
  holiday ingest submit --post --data-file batch.json --source "raw_data/bank-2024.html"
  ```

  `--data-file` reads the `{ "items": [ ... ] }` JSON your script built (argv has a
  ~1MB limit, so inline `--data` forces chunking on big files — and chunking breaks
  the file↔batch mapping). `--source` hashes the RAW export into the batch record:
  re-importing identical bytes is refused by the ledger itself (`duplicate_source`),
  and the file name shows up in `ingest list`. That pairing is what lets the next
  session see exactly what is in without re-deriving anything.
- For a few hundred rows a loop of `holiday txn add` is also fine — but it leaves
  no source record, so prefer the batch path whenever the rows came from a file.
  Do NOT loop `txn add` for thousands of rows: each call pays ~30ms of node
  startup, so 8,000 rows is ~9 minutes; the batch is one process and posts in
  seconds. `--post` commits directly (no review queue).
- Then `holiday verify` and `holiday balance`, and `assert` the closing balance
  against the statement so a mis-parsed sign shows up immediately.
- **If unmatched drafts remain, put the categorize screen in front of the user —
  don't make them ask.** Scaffold the dash if it doesn't exist
  (`holiday dash init`), START the dev server yourself (your host can run and preview it — do
  that, rather than pasting instructions), and point them at the 분류 대기 card:
  one click per decision, ⌥-click to also save the rule. Rules they teach it
  there shrink the next import's queue. Batch alternative when a pattern is
  obvious: `holiday rule add` → `holiday review apply-rules --accept`.

Never invent an amount or a date to make a row balance. If a row is ambiguous, ask.

**Loan repayments in the history are the other trap.** A bank row like
"대출원리금 500,000 출금" shows only the cash side; the principal/interest split
lives in the lender's statement, and this ledger never invents an interest figure
(observed values only — the same rule as 할부수수료). Do NOT anchor the loan at
today's balance and then also replay past repayments — that double-reduces the
debt. Instead, reconstruct by balance delta:

1. Replay every repayment with the FULL amount against the liability
   (`Liabilities:Loans:X`), no split.
2. When the history ends, compare the replayed liability balance to the real
   balance from the lender's app. The difference IS the total interest paid over
   the period — a difference of two observations, so it is itself observed.
3. Recognise it in one correcting entry (`Liabilities:Loans:X` ↔
   `Expenses:Interest`), then `holiday assert` the liability at the real balance.

Balance exact, total interest exact; only the per-payment timing of interest is
lumped. If the user can export the lender's schedule, upgrade to a full
reconstruction (per-payment splits — what `holiday loan pay` does going forward).
Going forward, register the loan with `holiday loan add` so future payments split
automatically.

**Transfers between the user's own accounts are the trap here** — one transfer
shows up as a withdrawal in one file and a deposit in another, and merging them is
its own problem (the row never says which account it went to). Import the accounts
you have, then match transfers per the ledger `AGENTS.md` (§이체) — three tiers:
auto (self-named, equal amount, ±1 day), flagged (collisions, wallet
round-trips), orphans (park in a placeholder, NEVER confirm as Expenses). The
pairing logic is already written (`../../scripts/match-transfers.mjs`); you only
write the per-bank parser.
