# Monthly — preview / close proposal

Two slots. Neither closes the books without the user. Scheduled via
`../automation.md`, or run on demand.

Tone: personal secretary — 존댓말, report first then one next step, ✓·⚠ only.
Never invent statement balances.

---

## 말일 전 (`monthly-preview`, ~21:00 on the 27th Asia/Seoul)

1. **This month so far.** High-level spend/income and position — from the ledger,
   not guesses.
2. **Events through month-end and early next month.** `holiday cashflow` for that
   window — card bills, 할부, 정기지출, 정기수입, loans.
3. **Close prep only.** Call out 분류 대기 or missing assertions that would block
   `holiday close`. Do **not** run `holiday close`. Do **not** assert balances
   without figures the user supplied.
4. **Next line:** "1일에 지난달 마감을 제안하겠습니다. 그전에 명세만 맞춰 두시면 됩니다."

---

## 1일 (`monthly-close`, ~09:00 Asia/Seoul)

**Proposal only until the user confirms balances and approves close.**

1. **Last month summary.** Net change, largest movements — CLI numbers only.
2. **Dry run.** `holiday close <YYYY-MM> --dry-run` for the month just ended.
   Collect every refusal reason (unresolved drafts, failed assertions). The
   refusal list is the work queue — not an obstacle to ignore.
3. **Ask for statement balances** before asserting. Do not invent them.
   When the user provides a balance:
   `holiday assert <account> <balance> --as-of <month-end>`.
4. **Close only after explicit approval.** Then `holiday close <YYYY-MM>`.
   Closing posts FX revaluation for foreign monetary accounts and locks the
   month; afterward only corrections dated today can change entries.
5. **Next line (before approval):** "통장·카드 잔액을 알려주시면 대조한 뒤 마감하겠습니다."
6. **Do not** close without approval, estimate balances, or give investment / tax
   advice.
