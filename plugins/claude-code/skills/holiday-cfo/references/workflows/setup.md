# Setup — the first session

Record directly, fix later — this is the default across all workflows (see the
skill body). The goal here is a ledger that reflects reality now, then as much
history as is worth entering.

1. **Create it.** `holiday init --currency KRW` (ask the currency).
2. **Accounts.** Banks, cards, cash, income, the debts. Mark spendable accounts
   `--cash`. Set card billing cycles with `holiday card add`, 할부 and 정기지출,
   loans. See `../concepts/accounts.md` and `../concepts/schedules.md`.
3. **Opening balances.** For each asset/liability that already has a balance, post
   it against `Equity:Opening` dated the start point:
   `holiday txn add --date 2026-01-01 --leg "Assets:Bank:Shinhan 4310000 KRW" --leg "Equity:Opening -4310000 KRW"`.
4. **History, if they have a file.** This is where you earn your keep — see below.
5. **Confirm.** `holiday balance`, then `holiday assert` each account against what
   the user can see in their banking app. Assertions are the only check against the
   outside world; use them.
6. **Offer automation.** Once the ledger is real, ask about scheduling the daily /
   weekly / monthly workflows — `../automation.md`.

## Importing a CSV or Excel export — you are the importer

There is no `import` command, on purpose. Every bank's export is shaped
differently, and a rigid parser would fight that. You are a better importer than a
fixed schema: **read the file, work out what its columns mean, and write a small
script that calls `holiday txn add` once per row.** That is the whole reason this
is an agent task and not a CLI flag.

- Read the file. Figure out which column is the date, which is the amount, which is
  the description, and the sign convention (is a debit negative, or in a separate
  column?).
- Map each row to a double entry. The money leg is the bank or card; the other leg
  is a category (`Expenses:...`) or income. Ask the user how to categorise the ones
  you cannot infer, or bucket them into `Expenses:Uncategorized` and tell them.
- Post them. For a few hundred rows, a loop of `holiday txn add` is fine. For a
  large history (thousands of rows), **do not** loop `txn add` — each call pays
  ~30ms of node startup, so 8,000 rows is ~9 minutes. Instead batch them through
  one `holiday ingest submit --post` call: the whole batch is one process and one
  transaction, so thousands of rows post in seconds. `--post` commits directly
  (no review queue); build the JSON `{ "items": [ ... ] }` in your script.
- Then `holiday verify` and `holiday balance`, and `assert` the closing balance
  against the statement so a mis-parsed sign shows up immediately.

Never invent an amount or a date to make a row balance. If a row is ambiguous, ask.

**Transfers between the user's own accounts are the trap here** — one transfer
shows up as a withdrawal in one file and a deposit in another, and merging them is
its own problem (the row never says which account it went to). Import the accounts
you have, then match transfers per `../concepts/transfers.md`.
