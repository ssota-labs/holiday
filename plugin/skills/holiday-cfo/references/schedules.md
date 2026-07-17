# Schedules — 카드 청구주기, 할부, 정기지출

Read this when setting one of these up. Each has a trap.

All three are **forecasts, not facts**. They live outside the journal, because a
schedule changes — a price rises, a card moves your payment date, you cancel —
and a forecast stored as history corrupts the past. They exist to answer *when*
money moves. `holiday cashflow` is where they meet the ledger.

## 카드 청구주기

Without this, the ledger knows what is owed but not when it lands, and
`holiday cashflow` cannot see the card at all.

```bash
holiday card add "Liabilities:Card:Shinhan" \
  --funding "Assets:Bank:KB:Checking" \
  --close-day 14 --payment-day 1 --payment-month-offset 1 --label "신한"
```

- `--close-day` — the cycle closes this day, **inclusive**. Use `31` for month
  end; it clamps to the 28th in February.
- `--payment-day` — day the bill is paid. `-1` means 말일.
- `--payment-month-offset` — months from close to payment. Usually `1`.

The command echoes the consequence: *"A purchase today closes 2026-08-14 and
takes cash on 2026-09-01."* Read that back to the user — it is how they check you
got their card right, and Korean issuers vary a lot.

**Ask, don't guess.** The user's statement says 사용기간 and 결제일 on it.

## 할부

```bash
holiday installment add \
  --card "Liabilities:Card:Shinhan" \
  --expense "Expenses:Home:Appliance" \
  --total 1200000 --months 12 --date 2026-07-17 --label "냉장고"
```

This posts the **full** ₩1,200,000 as debt on the purchase date — you have the
fridge, you owe for the fridge — and builds a 12-row schedule for the cash.

**The balance goes in its own account** (`…:Installment`, created automatically).
Never record a 할부 against the ordinary card account: ordinary billing sums
postings inside a cycle, so the whole ₩1,200,000 would land on the first bill
instead of ₩100,000, overstating it twelvefold.

Rows sum to exactly the total. ₩1,000,000 over 3 months is 333,334 + 333,333 +
333,333, the odd won on the first row, as Korean issuers do it.

**Interest-bearing 할부 is refused, not estimated.** 할부수수료 depends on the
issuer's declining-balance formula and varies by issuer, promotion, and term. A
plausible wrong number would quietly poison the projection. If the user has one,
tell them it is not supported yet rather than approximating.

The card must have a billing cycle first — that is what dates the rows.

## 정기지출

```bash
# 통장 자동이체
holiday recurring add "월세" --expense "Expenses:Home:Rent" \
  --funding "Assets:Bank:KB:Checking" --amount 800000 --day 25

# 카드 결제
holiday recurring add "넷플릭스" --expense "Expenses:Subscription:Netflix" \
  --funding "Liabilities:Card:Shinhan" --amount 17000 --day 17

# 연 1회
holiday recurring add "도메인" --expense "Expenses:Software" \
  --funding "Liabilities:Card:Shinhan" --amount 22000 --day 3 --yearly 11
```

**`--funding` decides everything.** A bank account debits on the day. A **card**
does not: that day only creates debt, and the cash leaves later through the
card's cycle. Same cadence, same amount, six weeks apart. Get this wrong and the
projection is wrong.

`--day -1` is 말일. `--to <date>` ends it.

A 정기지출 is **not** an account and **not** a transaction. When it actually
charges, record it like any other purchase. This is only the forecast.

**Only occurrences strictly after today are projected.** Anything already charged
is a posting the projection already counts; projecting it again would bill it
twice. The cost: today's charge is missed if it has not been recorded yet.

## Checking your work

```bash
holiday card list
holiday installment list
holiday recurring list
holiday cashflow --until 2026-12-31
```

Every projected outflow in `cashflow` names its source and, for card-funded
recurring, the charge date — `넷플릭스 (2026-08-17 결제분)`. If the user asks
"why is this here", that string is the answer.
