# Recipes

## From a screenshot

You are the parser. `holiday ingest submit` takes what you read and holds it as a
**draft** until a human accepts it.

1. Read off: date, merchant, amount, currency, which card or account, a
   transaction id if the issuer prints one, and whether it says 할부.
2. `holiday account list` — find the real accounts. Do not guess.
3. `holiday ingest submit --idem-key <fresh> --data '{...}'`
4. Show the human the proposed double entry and any ⚠ warnings.
5. `holiday review accept <id>` once they confirm.

```bash
holiday ingest submit --idem-key K1 --data '{
  "items": [{
    "date": "2026-07-17", "payee": "이마트", "externalRef": "TX-99",
    "legs": [
      {"account": "Expenses:Food:Groceries", "amount": "42000", "commodity": "KRW"},
      {"account": "Liabilities:Card:Shinhan", "amount": "-42000", "commodity": "KRW"}
    ]
  }]
}'
```

`--image <path>` when the file is on disk: it hashes the bytes, and the same
image can never be ingested twice.

**Stop and ask if** the amount is unclear, you cannot tell which card, the date is
ambiguous, or the symbol could be `$` or `₩`. The gate catches a wrong category,
not a misread amount — a human confirming `₩1,240,00` confirms it wrong.

If it says 할부, use `holiday installment add`, not ingest.

### Duplicate warnings

A ⚠ on submit is information, not a blocker. Show it and let the human decide.

- **Blocked outright:** the same image bytes, or the same `externalRef`. Both are
  facts about the issuer's own record.
- **Warned only:** same account, amount, date and merchant. Two ₩4,500 americanos
  at the same cafe on one Tuesday is a normal Tuesday.
- **Warned only:** same amount within ±3 days. The card app and the statement
  often disagree about the date, so this catches the same purchase twice.

## A card purchase

```bash
holiday txn add --date 2026-07-17 --payee "이마트" \
  --leg "Expenses:Food:Groceries 42000 KRW" \
  --leg "Liabilities:Card:Shinhan -42000 KRW"
```

No cash moves. The card bill is separate, later.

## Paying the card bill

```bash
holiday txn add --date 2026-08-01 --narration "신한 8월 결제" \
  --leg "Liabilities:Card:Shinhan 450000 KRW" \
  --leg "Assets:Bank:KB:Checking -450000 KRW"
```

Card positive (you owe less), bank negative. **This** is when cash moves.

## Cash or direct debit

```bash
holiday txn add --date 2026-07-25 --narration "월세" \
  --leg "Expenses:Home:Rent 800000 KRW" \
  --leg "Assets:Bank:KB:Checking -800000 KRW"
```

## Income

```bash
holiday txn add --date 2026-07-01 --narration "7월 급여" \
  --leg "Assets:Bank:KB:Checking 3000000 KRW" \
  --leg "Income:Salary -3000000 KRW"
```

Net pay only, unless the user wants deductions broken out — then each deduction
is its own expense leg and the gross goes to `Income:Salary`.

## A refund

Reverse the original. It is not a payment, and the ledger tells them apart by the
counter leg:

```bash
holiday txn add --date 2026-07-20 --payee "이마트" --narration "반품" \
  --leg "Expenses:Food:Groceries -12000 KRW" \
  --leg "Liabilities:Card:Shinhan 12000 KRW"
```

## Buying foreign currency

Needs the total, not the rate. See `ledger-model.md`.

```bash
holiday txn add --date 2026-07-17 --narration "Wise 송금" \
  --leg "Assets:Bank:KB:Checking -1000000 KRW" \
  --leg "Assets:Bank:Wise:USD 750.00 USD @@ 1000000"
```

## A fee that makes it "not balance"

If `unbalanced` reports a residual of `-500`, ₩500 is genuinely missing. Usually
a fee:

```bash
  --leg "Expenses:Fees:Wire 500 KRW"
```

Do not adjust another leg to make it fit. The residual is telling you something.

## A mistake

The journal is append-only, so you never edit a past entry — you `holiday txn add`
a correcting one. A wrong amount: post the difference. A transaction that should not
exist: post its exact opposite (a reversal), then the right one if there is one.

Before a month is closed its entries are still live; after `holiday close` they are
locked, and a correction dated today is the only way in. This is exactly why
recording directly (rather than gating on review) is safe — a mistake is one more
entry, not a lost afternoon.

## Setting up from scratch

```bash
holiday init --currency KRW
```

Then accounts, then cards, then 할부/정기지출, in that order — each depends on the
last. Tell the user the directory must be a **private** repo: `ledger.db` is
their money, in one file, meant to be committed.
