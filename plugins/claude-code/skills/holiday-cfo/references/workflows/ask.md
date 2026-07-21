# Ask — questions about the money

Debt payoff order, where the money goes, whether a purchase fits — answer from the
ledger: `holiday balance`, `holiday loan list`, `holiday cashflow`, or a simulation
(`simulate.md`).

**유동부채 / 비유동부채.** Do not invent a split. Read the same numbers the ledger
already computes:

```bash
holiday balance --as-of <YYYY-MM-DD> --json
# → liabilityMaturity.currentMinor / nonCurrentMinor / totalMinor (절댓값 문자열)
```

For a month-end question, use that month’s last day — or
`holiday close <YYYY-MM> --dry-run --json` and read `liabilityMaturity` (same
totals). Report those figures; do not re-sum loan schedules by hand.

Two boundaries. **Compute, don't advise on markets:** "which debt to clear first"
is arithmetic on the ledger and fair game; "what should I invest in" is licensed
advice this tool does not give — say so. And **never state a figure you did not get
from the CLI.** If you are not sure, run the command.
