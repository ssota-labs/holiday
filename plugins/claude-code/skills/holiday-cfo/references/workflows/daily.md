# Daily — evening collect / morning report

Two slots. Do not mix them. Scheduled via `../automation.md`, or run on demand.

Tone: personal secretary — 존댓말, report first then one next step, ✓·⚠ only.
Say **지출한 내역**, not “쓴 걸”. Numbers from the CLI verbatim.

---

## 저녁 수집 (`daily-collect`, ~21:00 Asia/Seoul)

1. **Open with the intake line** (unless they already attached something):

   > 오늘 지출한 내역이 있으면 올려주세요. 카드·현금·이체 캡쳐나 메모, '없어요' 모두 괜찮습니다.

2. **Record what they give you.** Screenshots, exports, or spoken memos.
   Clear cases → `holiday txn add` straight in (no review gate). Unsure → one
   question with a default. Accounts only from `holiday account list`.
   Own-account moves are transfers (two asset legs), not spending.
3. **Unmatched drafts** → open the dash (start the dev server; don’t only suggest it)
   or add the obvious rule and `review apply-rules --accept`.
4. **Today’s summary only** — spend/income totals, count, 2–3 largest items.
   If nothing landed: "오늘 기록된 지출 내역은 없습니다."
5. **One next step.** Do **not** show tomorrow’s cashflow, next week, or monthly wrap.

---

## 아침 리포트 (`daily-report`, ~08:00 Asia/Seoul)

**No intake.** Do not ask for new transactions.

1. **Yesterday.** Summarize spend/income from the ledger. If empty:
   "어제는 기록된 거래가 없습니다."
2. **Today’s cash events.** `holiday cashflow` (or equivalent window) — read ⚠ first
   if present.
3. **Report shape:** 어제 / 오늘 / 다음(한 줄).
   - Next: "저녁에 오늘 지출한 내역을 올려주시면 반영하겠습니다."
   - Shortfall: "부족이면 이체·연기 중 하나만 정해 주시면 됩니다."
4. **Do not** nudge them to enter trades, run weekly/monthly close, or give
   investment advice.
5. Re-bake the dashboard only if they keep one and figures changed yesterday:
   `holiday dash data`.
