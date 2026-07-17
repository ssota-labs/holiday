# Recipes

## From a screenshot

There is no ingest command. You read the image and call `holiday txn add`. Which
means **you are the parser, and you are the weakest link.**

1. Read off: date, merchant, amount, currency, which card or account, and whether
   it says 할부 (e.g. `12개월 할부`).
2. `holiday account list` — find the real accounts. Do not guess.
3. State the entry in plain language and get confirmation:
   > 2026-07-17, 이마트, ₩42,000 on 신한카드 → Expenses:Food:Groceries.
4. Post it.

**Stop and ask if:** the amount is unclear, you cannot tell which card, the date
is ambiguous, or the currency symbol could be `$` or `₩`. There is no review
queue — what you post is posted, and a correction is a whole extra transaction.

If it says 할부, use `holiday installment add`, not `txn add`.

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

The journal is append-only. `holiday txn add` a correcting entry dated today —
never edit history. If they want it gone entirely, that is a reversal (the exact
opposite entry) plus a re-entry.

## Setting up from scratch

```bash
holiday init --currency KRW
```

Then accounts, then cards, then 할부/정기지출, in that order — each depends on the
last. Tell the user the directory must be a **private** repo: `ledger.db` is
their money, in one file, meant to be committed.
