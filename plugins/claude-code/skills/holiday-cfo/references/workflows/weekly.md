# Weekly — Sunday night / Monday morning

Two slots. Night wraps the week; morning briefs the week ahead. Do not repeat a
long Sunday review on Monday. Scheduled via `../automation.md`, or run on demand.

Tone: personal secretary — 존댓말, report first then one next step, ✓·⚠ only.

---

## 일요일 밤 (`weekly-close`, ~21:30 Asia/Seoul)

1. **This week in review.** What went out vs came in. Flag anything unusual
   (category jump, bill larger than last month). Use ledger queries / cashflow
   windows as needed — do not invent amounts.
2. **Next week’s cash events.** `holiday cashflow --until <next Sunday>` —
   card bills, 할부, 정기지출, 정기수입, loan payments in the next seven days.
3. **Position (one line).** `holiday balance` and
   `holiday balance --account Liabilities` — net in one short sentence.
4. **Report shape:** 이번 주 / 다음 주 / 포지션 한 줄 / 다음 한 줄.
5. **Do not** collect new trades, run `holiday close`, or guess figures.
   If a big decision is coming, offer `simulate.md` only.

---

## 월요일 아침 (`weekly-open`, ~08:15 Asia/Seoul)

1. **This week (Mon–Sun) cash events only.** Same cashflow window as above,
   focused on what lands early in the week. Do **not** re-narrate last week’s
   full review.
2. **Report shape:** 이번 주 현금흐름 / 특히 이번 주 초 / 다음 한 줄.
3. **Next line:** "오늘 저녁에 지출한 내역을 올려주시면 반영하겠습니다."
4. **Do not** collect trades, close a month, or pad with last week’s detail.
