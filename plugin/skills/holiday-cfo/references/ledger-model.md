# The ledger model

Read this when the user asks *why* a number is what it is, or when a foreign
currency is involved.

## Two integers per posting

Every posting stores two numbers, and the distinction is the whole design:

| | what it is |
|---|---|
| `units_minor` | **The fact.** What moved, in its own commodity. `-75000` on a USD account is −$750.00. |
| `weight_minor` | **The measurement.** The same event in KRW, the book's functional currency. |

The invariant is `SUM(weight_minor) = 0` — exactly, in integer arithmetic.

## Why there is no tolerance

Transfer ₩1,000,000 and receive $750.00. The implied rate is 1333.3333…, which
does not terminate. Store *that rate* and multiply back to check the books and
you get ₩999,998 — so the transaction "doesn't balance", and the usual fix is to
invent a tolerance of a few won.

That tolerance then hides errors at exactly the size worth catching: a missing
₩50 wire fee, an off-by-one, a rounding leak.

So `holiday` stores the counter-amount as a **fact** instead. Two integers
summing to zero is exact, and the rate becomes a display concern. When it refuses
a transaction as `unbalanced` it hands you the exact residual. That number is
information, not an obstacle — something real is missing.

## Amounts are integers in minor units

₩12,500 is `12500`. $12.50 is `1250`. The scale lives in the commodity registry,
never on the amount, so `1234.56 KRW` is rejected outright — KRW has no minor
unit and any such input is a misread.

## Foreign currency

A leg not in KRW cannot have its KRW value inferred, so you must supply it with
`@@` (a **total**, not a rate):

```bash
holiday txn add --date 2026-07-17 --narration "Wise 송금" \
  --leg "Assets:Bank:KB:Checking -1000000 KRW" \
  --leg "Assets:Bank:Wise:USD 750.00 USD @@ 1000000"
```

`@@ 1000000` means "this $750.00 is the ₩1,000,000 that left". Both sides were
observed, so the rate is a fact rather than a lookup.

**`@` (a per-unit rate) is deliberately rejected.** A rate multiplied back out
does not land on an exact integer, which is how the tolerance problem gets in.
If the user knows the rate but not the total, ask for the total — it is on the
statement.

`holiday balance` then shows both: `750.00 USD  (1000000 KRW)`. The first is the
fact, the second is the carrying value.

## Signs

Debit positive, credit negative, uniformly:

- Spending money: expense **positive**, funding account **negative**.
- Income: cash **positive**, income account **negative**.
- Card purchase: expense **positive**, card **negative** (you owe more).
- Paying a card: card **positive** (you owe less), bank **negative**.

`holiday balance` flips the sign for display, so a card shows what you owe as a
positive number. The stored value is negative.

## The audit chain

Every mutation appends to `audit_log`, each row hashing its predecessor, and a
transaction's row hashes its **content**. So editing a posting by hand breaks
`holiday verify` even though the ledger still balances.

It catches casual tampering, not someone who recomputes the whole chain.
`holiday verify --head` prints the chain head; anchoring that somewhere outside
the file is what would close the gap.
