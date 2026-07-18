# Simulate — what if

For "이 대출 받으면?", "집 사면?", "이 카드 다음 달에 다 갚으면?" — anything that is
not in the ledger yet.

Do NOT write speculative transactions and delete them. `holiday cashflow` takes the
hypotheticals directly and folds them into the runway, touching nothing:

```bash
holiday cashflow --until 2027-06-30 \
  --spend "2026-09-01 5000000 새 노트북" \
  --receive "2026-12-25 3000000 보너스" \
  --spend "2027-03-01 30000000 전세보증금"
```

`--spend` is money leaving, `--receive` is money arriving — no sign to guess. Both
repeat, so stack several and watch them interact. Each shows up as `가정: <label>`,
and the base ledger is untouched: re-run plain `holiday cashflow` to confirm.

For a recurring commitment (a new loan, a new 정기지출), model the first few months
with several `--spend` lines rather than one, so the user sees the monthly bite.
