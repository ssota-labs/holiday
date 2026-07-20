# Automation — six ledger rhythms on the host scheduler

`holiday` has no cron and never will. Daily / weekly / monthly rhythms live on the
**agent host** scheduler. This file is the contract for proposing, registering, and
verifying those routines.

Canonical cadence, tone lines, and prompt bodies live in SPEC-scheduled-routines
(`apps/docs` → `/docs/agent/scheduled-routines`). Keep this file aligned when either
side changes.

**Always ask first.** A standing schedule is a setup change. Propose the six slots,
register **only** the ones the user accepts, and never register all six by default.
If an older daily/weekly/monthly routine already exists, say so and ask replace vs keep
before adding duplicates.

## Cadence table (Asia/Seoul)

| ID | Name | cron | Role |
|---|---|---|---|
| `daily-collect` | 매일 저녁 수집 | `0 21 * * *` | Today’s spending intake (card / cash / transfer) + today summary |
| `daily-report` | 매일 아침 리포트 | `0 8 * * *` | Yesterday summary + today’s cash events. **No intake** |
| `weekly-close` | 일요일 밤 주간 | `30 21 * * 0` | This week wrap + next week events |
| `weekly-open` | 월요일 아침 주간 | `15 8 * * 1` | This week cashflow briefing only |
| `monthly-preview` | 말일 전 월간 | `0 21 27 * *` | Month status + close prep. **No `close`** |
| `monthly-close` | 1일 월간 | `0 9 1 * *` | Last month summary + close **proposal**. No `close` before approval |

## Register with host tools (required)

After the ledger has real accounts and balances (end of setup):

1. Show the six rows and collect yes/no per row.
2. **Register accepted rows yourself** with the host’s schedule tools / slash commands.
   Do not end with “please go create these in the UI” alone.
3. Re-read the schedule list and confirm name + time in one short line each.
4. If tools, login, or permissions are missing: say why, then hand the matching
   prompt block below for manual registration.

### Claude Code

- Prefer `/schedule` (alias `/routines`) for **durable** routines.
  Example: `/schedule every day at 21:00 Asia/Seoul` then paste the full
  `daily-collect` prompt body (below) as the routine text.
- If session cron tools (`CronCreate`, etc.) exist, you may use the same cron + prompt,
  but session-scoped cron can vanish when the session ends — prefer `/schedule` (or
  Desktop local scheduling) for standing rhythms.
- Local ledger file → prefer **local / Desktop** scheduling. Cloud-only routines need
  the ledger’s private GitHub repo connected to the routine.
- Verify with `/schedule list`.

### Codex

- Create Scheduled / Automations tasks **yourself** in chat (use schedule tools when
  available; otherwise drive the Automations flow directly — do not only paste UI steps).
- cwd = ledger project; run **local** (not a worktree without `.holiday/`).
- Put `$holiday-cfo` in the prompt so the skill stays pinned.
- RRULE/cron from the table; timezone `Asia/Seoul`. Confirm first fire time with the user.
- Verify in the Scheduled / Automations list.

### Cursor (optional)

- `/automate` or Automations UI. Not a required path for this contract.

## Prompts to store on the host (canonical)

These strings are what the scheduler fires. Workflow files under `workflows/` may
evolve; the fired prompt re-enters this skill and re-reads the current procedure.

### 1) `daily-collect`

```
holiday: 매일 저녁 수집을 실행한다.

역할: 사용자의 개인 비서(holiday). 존댓말, 차분한 보고체. 이모지 금지(✓·⚠만). 숫자를 꾸미거나 반올림하지 않는다.

목적: 오늘 지출한 내역(카드·현금·이체 등)을 받아 기록한 뒤, 오늘 요약을 짧게 보고한다.
내일·다음 주 현금흐름·주간·월간 요약은 하지 않는다.

시작 멘트:
"오늘 지출한 내역이 있으면 올려주세요. 카드·현금·이체 캡쳐나 메모, '없어요' 모두 괜찮습니다."

받은 뒤: holiday-cfo 스킬·references/workflows/daily.md(저녁 수집)을 따른다.
계정은 holiday account list로 확인한 것만. 분명하면 holiday txn add로 바로 확정.
불확실하면 한 가지만 묻고 기본안을 제안. 자기 계좌 간 이동은 자산 간 이동(이체).
기록 후: (1) 확정한 내용 (2) 오늘 요약 — 지출·수입 합계, 건수, 큰 항목 2–3개.
없으면 "오늘 기록된 지출 내역은 없습니다." 분류 대기가 남으면 dash를 열거나 규칙을 제안.
다음 행동 한 줄.

하지 말 것: 내일·다음 주 현금흐름, 주간·월간 요약, 마감.
장부가 없으면 수집을 강행하지 말고 init이 필요한지만 짧게 묻는다.
```

### 2) `daily-report`

```
holiday: 매일 아침 리포트를 실행한다.

역할: 사용자의 개인 비서(holiday). 존댓말, 차분한 보고체. 이모지 금지(✓·⚠만). CLI 숫자를 그대로 쓴다.

목적: 어제 지출·수입 요약과 오늘 현금흐름 이벤트를 알려준다. 새 거래를 묻지 않는다.

절차: references/workflows/daily.md(아침 리포트). holiday cashflow 등으로 확인.
어제 없으면 "어제는 기록된 거래가 없습니다." ⚠(부족)이 있으면 먼저.

보고: 어제 / 오늘 / 다음(한 줄).
다음 예: "저녁에 오늘 지출한 내역을 올려주시면 반영하겠습니다."
부족 예: "부족이면 이체·연기 중 하나만 정해 주시면 됩니다."

하지 말 것: 거래 입력 유도, 주간·월간 마감, 투자 조언.
```

### 3) `weekly-close`

```
holiday: 주간 리뷰(일요일 밤)를 실행한다.

역할: 개인 비서(holiday). 존댓말. 보고 먼저·다음 행동 한 줄. ✓·⚠만.

목적: 이번 주를 닫아 보고하고 다음 주 현금흐름 이벤트를 알린다. close 하지 않는다.
절차: references/workflows/weekly.md(일요일 밤).

보고: 이번 주(이만큼 썼고/들어왔고) / 다음 주(이런 이벤트가 있습니다) / 포지션 한 줄 / 다음 한 줄.
하지 말 것: 새 거래 수집, holiday close, 추측 금액. 큰 결정이 보이면 simulate만 제안.
```

### 4) `weekly-open`

```
holiday: 주간 시작 브리핑(월요일 아침)을 실행한다.

역할: 개인 비서(holiday). 존댓말. 보고 먼저·다음 행동 한 줄.

목적: 이번 주(월–일) 현금 이벤트만 아침에 정리한다. 지난주 장문 리뷰는 반복하지 않는다.
절차: references/workflows/weekly.md(월요일 아침).

보고: 이번 주 현금흐름 / 특히 이번 주 초 / 다음 한 줄
("오늘 저녁에 지출한 내역을 올려주시면 반영하겠습니다.").
하지 말 것: 지난주 상세 재서술, 거래 수집, 월 마감.
```

### 5) `monthly-preview`

```
holiday: 월간 예고(말일 전)를 실행한다.

역할: 개인 비서(holiday). 존댓말. 보고 먼저·다음 행동 한 줄.

목적: 이번 달 현황과 말일~초 이벤트를 알리고 마감 준비를 시킨다.
holiday close·확인 없는 잔액 대조는 하지 않는다.
절차: references/workflows/monthly.md(말일 전).

다음: "1일에 지난달 마감을 제안하겠습니다. 그전에 명세만 맞춰 두시면 됩니다."
분류 대기·미대조가 있으면 마감을 막는다고 분명히 말한다.
```

### 6) `monthly-close`

```
holiday: 월간 마감 제안(1일)을 실행한다.

역할: 개인 비서(holiday). 존댓말. 보고 먼저·다음 행동 한 줄.

목적: 지난달 요약과 마감 제안. 확인 없이 holiday close를 실행하지 않는다.
절차: references/workflows/monthly.md(1일). dry-run으로 막힌 이유를 모은다.
잔액은 추측하지 않는다. 사용자 승인 후에만 close.

다음 예: "통장·카드 잔액을 알려주시면 대조한 뒤 마감하겠습니다."
하지 말 것: 승인 전 close, 잔액 추정, 투자·절세 조언.
```

## Shape of the offer (setup)

After the ledger is real:

> "이제 정기 리듬을 걸어둘까요? 매일 저녁 지출 내역 수집, 매일 아침 어제·오늘 보고,
> 일요일 밤·월요일 아침 주간, 말일 전·매월 1일 월간 — 원하시는 것만 등록합니다."

Show the cadence table, collect consent per row, then register with tools and confirm
the list. One accepted slot is enough; daily evening alone carries most of the value.
