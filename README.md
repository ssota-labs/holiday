# holiday

1인용 복식부기 원장. 가계부·부채·자산·현금흐름을 에이전트와 함께 관리한다.

캡쳐를 찍어두고 수기로 정리하면 장부가 실제로 맞는지 검증할 방법이 없다. `holiday`는
에이전트가 캡쳐를 읽고 CLI를 호출하면 CLI가 복식부기 불변식·통화·스케줄을 책임진다.

> **경고:** v0.1이다. 원장 포맷은 아직 약속이 아니다 — 마이그레이션은 append-only지만
> 스키마는 굳지 않았다. 자기 돈으로 쓰기 전에 [무엇이 없는지](#아직-없는-것)를 읽어라.

## 왜 하나 더 만드나

가계부 앱은 대부분 단식부기 + 카테고리에서 멈춘다. 그럼 두 가지를 못 한다.

**첫째, 신용카드.** 7/17에 긁은 커피는 현금이 안 나갔다. 8/14에 마감되고 9/1에 통장에서
빠진다. "잔액"은 이 간극을 모른다.

```
$ holiday cashflow --until 2026-10-31
cash on hand (2026-07-17):  3000000 KRW

2026-07-25   -      800000   →      2200000
             월세                            800000
2026-08-25   -     2267052   →      1000000
             월세                            800000
             KB 주담대 (1/360)              1467052
2026-10-01   -      117000   →       -17000   ⚠ SHORT
             냉장고 (2/12)                   100000
             넷플릭스 (2026-08-17 결제분)      17000

⚠ Short by 17000 KRW on 2026-10-01.
```

`⚠ SHORT`가 답이다. 잔액은 숫자 하나를 주지만 현금흐름은 **어느 날 터지는지**를 준다.

**둘째, 다통화.** ₩1,000,000을 보내 $750.00을 받으면 내재환율이 1333.3333…으로 안 끝난다.
환율을 저장해 되곱하면 ₩999,998이 나오고, 그럼 허용오차를 발명하게 된다. 그 허용오차가
정확히 잡고 싶은 크기(누락된 ₩50 수수료)를 가린다.

`holiday`는 전기마다 두 정수를 저장한다 — `units`(사실, 자기 통화)와 `weight`(측정, KRW).
불변식은 `SUM(weight) = 0`이고, **정확히** 0이다. 시스템 어디에도 허용오차 파라미터가 없다.

## 설치

**Claude Code**

```bash
/plugin marketplace add ssota-labs/holiday
/plugin install holiday@ssota-labs
```

**Codex**

```bash
codex plugin marketplace add ssota-labs/holiday
codex plugin install holiday
```

두 플러그인은 스킬만 담는다. CLI 자체는 npm에 있고, 첫 실행 때
`npx @holiday-cfo/cli@latest`로 받아진다.

Node 24+ 필요. `node:sqlite`가 builtin이라 네이티브 애드온도 설치 스텝도 없다.

## 시작

```bash
holiday init --currency KRW
holiday account add Assets:Bank:KB:Checking --commodity KRW --cash
holiday account add Liabilities:Card:Shinhan --commodity KRW
holiday card add Liabilities:Card:Shinhan --funding Assets:Bank:KB:Checking \
  --close-day 14 --payment-day 1 --label "신한"

holiday txn add --date 2026-07-17 --payee "이마트" \
  --leg "Expenses:Food:Groceries 42000 KRW" \
  --leg "Liabilities:Card:Shinhan -42000 KRW"

holiday cashflow
```

**디렉터리는 private 레포여야 한다.** `.holiday/ledger.db`가 당신 돈이고, 커밋하라고 만든
파일이다.

## 설계

정책이 곧 제품이다. 규칙 하나하나가 **그걸 강제하는 테스트에 링크**돼 있고, CI가 링크를
검사한다 — 링크가 해결되지 않는 정책 문서는 없는 것보다 나쁘다. 증거처럼 읽히니까.

- **[문서](https://github.com/ssota-labs/holiday/tree/main/apps/docs)** — 데이터 모델, 스케줄 네 개, CLI 스펙, 정책과 용어
- 모든 페이지에 `.md` 쌍둥이가 있다. 이 도구를 운전하는 게 에이전트라서.

몇 가지 결정:

| | |
|---|---|
| **환율이 아니라 상대금액으로 균형** | 환율은 표시용. 되곱하지 않으니 허용오차가 필요 없다 |
| **금액은 i64 minor unit** | `number`는 2^53까지만 정확하다 |
| **스케줄은 원장 밖** | 카드·할부·정기지출·대출은 예측이다. 전기하면 금리 변경이 과거를 오염시킨다 |
| **SQLite가 system of record** | 감사는 `audit_log` 해시 체인. `git log`가 아니라 |
| **Notion/Airtable은 원장이 될 수 없다** | 원자성도 유니크 제약도 없다. `init()`이 티어 계약 미충족 시 throw한다 |

## 구조

```
packages/core/          도메인 + 포트 + 유스케이스. 어댑터에서 아무것도 import하지 않는다
packages/store-sql/     LedgerStore 구현 — 딱 하나 (방언 독립)
packages/store-sqlite/  드라이버 + 스키마 + PRAGMA
packages/store-postgres/드라이버 + 스키마 + plpgsql
packages/store-testkit/ 적합성 스위트 — 포트의 실행 가능한 계약
packages/cli/           composition root + dash 템플릿 (npm 배포)
packages/ui/            shadcn primitive
packages/blocks/        대시보드 어휘 (도메인 블록 + json-render 카탈로그)
apps/docs/              Fumadocs
plugins/claude-code/    Claude Code 플러그인 (스킬만)
plugins/codex/          Codex 플러그인 (스킬만)
```

```bash
pnpm install && pnpm -r run build && pnpm -r run test
```

## 아직 없는 것

명시해두는 게 즉흥으로 메우는 것보다 낫다.

- **OCR이 없다.** 에이전트가 파서다. `ingest submit`은 에이전트가 읽은 것을 받고,
  이미지는 해시 말고는 보지 않는다. 제출은 **드래프트**로 들어가 사람이 `review accept`
  하기 전까지 잔액에서 제외된다.
- **자동 승인이 없다.** 모든 드래프트에 사람이 필요하다. 룰 엔진은 없다.
- **유이자 할부수수료를 계산하지 않는다.** 명세서에서 읽은 값은 받는다(`--fees`).
  카드사 공식은 제각각이라 그럴듯하게 틀린 숫자가 예측을 조용히 오염시킨다.
- **환율을 자동으로 가져오지 않는다.** `fx add`가 사용자가 준 값을 받는다. 없는 환율은
  추측하지 않고 throw한다.
- **대시보드는 스냅샷이지 라이브가 아니다.** `dash data`가 마지막으로 구운 것을 렌더한다.
  Codex Sites는 원격 정적 호스팅이라 `ledger.db`를 열 수 없다 — 라이브가 필요하면
  Supabase 어댑터에 물려야 한다.
- **18자리 ERC-20 토큰은 표현 불가.** i64라 ETH는 8자리로 절사한다. 개인 순자산엔
  충분하고 온체인 대사엔 틀리다.

## 라이선스

MIT
