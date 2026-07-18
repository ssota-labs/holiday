# Monthly — close the books

Fired on the 1st by the scheduler (`../automation.md`), or on demand.

1. **Assert.** `holiday assert <account> <balance> --as-of <month-end>` for every
   account the user has a statement for. This is the real reconciliation.
2. **Dry run.** `holiday close <month> --dry-run`. It refuses over unresolved
   drafts or a failing assertion, and lists every reason at once. The refusal is
   the point — a month with a wrong balance is not closed, it is frozen.
3. **Close.** `holiday close <month>`. Posts FX revaluation for foreign monetary
   accounts, snapshots balances, and locks the journal for that month. After close,
   an entry can only be changed by a correction dated today — see
   `../concepts/recipes.md`.
4. **Report.** Net worth change, biggest movements, how the month compared.
