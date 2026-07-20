# AGENTS.md

코딩 에이전트를 위한 저장소 지침이다. 사람용 온보딩은 [README.md](README.md),
원장 도메인·정책은 `apps/docs`를 본다.

> 이 파일은 **코드베이스를 고치는** 에이전트용이다. 채팅에서 원장을 운전하는
> 에이전트는 `plugins/claude-code/skills/holiday-cfo/` (또는 `plugins/codex/`)를 본다.

## 프로젝트

`holiday` — 1인용 복식부기 CLI. 에이전트가 CLI를 shell out하고, CLI가 불변식·통화·
스케줄을 책임진다.

- **Node >= 24** (`node:sqlite`, `--experimental-strip-types`)
- **pnpm 11.5.2** (`packageManager` 핀) + Turborepo
- 외부 서비스 불필요: SQLite는 builtin, Postgres 테스트는 in-process `pglite`

## 레이아웃

```
packages/core/           도메인 + 포트 + 유스케이스. 어댑터를 import하지 않는다
packages/store-sql/      LedgerStore 구현 — 딱 하나 (방언 독립)
packages/store-sqlite/   드라이버 + 스키마 + PRAGMA
packages/store-postgres/ 드라이버 + 스키마 + plpgsql
packages/store-testkit/  적합성 스위트 — 포트의 실행 가능한 계약
packages/cli/            composition root + dash 템플릿 (npm 배포, bin: holiday)
packages/ui/             shadcn primitive 60개 (npm 배포)
packages/blocks/         대시보드 어휘 — 도메인 블록 + MDX/대시보드 컴포넌트 (npm 배포)
apps/docs/               Fumadocs — 정책·ADR·CLI 스펙
plugins/claude-code/     Claude Code 플러그인 (스킬만; CLI는 npx)
plugins/codex/           Codex 플러그인 (스킬만; SKILL.md만 별도, references는 심링크)
```

## 개발 전 기획 게이트

`apps/docs`가 기획의 단일 진실이다. 구현 코드를 먼저 고치고 문서를 역기록하지 마라.
절차·**작성 기준(비개발자 독자)** 은 `apps/docs/content/docs/workflow/planning.mdx`,
기계 계약은 `apps/docs/content/docs/workflow/development.mdx`를 따른다.

1. 작업을 시작하면 기존 PRD·스펙·구현계획이 요청을 충분히 설명하는지 먼저 확인한다.
2. 새 기능·사용자 동작 변경(`product`)은 PRD + 스펙 + 구현계획이 필요하다.
3. 기존 계약에 맞추는 버그 수정(`bugfix`)은 기존 PRD·스펙 링크 + 구현계획이 필요하다.
4. 리팩터링·빌드·의존성(`maintenance`)은 구현계획이 필요하다. 관찰 가능한 계약도
   바뀌면 스펙을 추가한다.
5. 필요한 문서가 없으면 **구현 파일을 수정하지 않는다.** 기획 문서만 담은 PR을 먼저
   만들고 계획을 `stage: ready`로 둔다.
6. 기획 한글 본문(PRD·US·기능 수락 기준 등)을 쓰거나 고친 뒤에는 **항상**
   im-not-ai 스킬을 실행한다. `.agents/skills/humanize/SKILL.md`를 읽고 `/humanize`
   절차를 따른다(리뷰 직전은 `--strict` 권장). 윤문 결과를 반영한 뒤에야
   `ready`/`active`로 올리고 사람 리뷰를 요청한다. 의미·ID·코드·표 구조는 유지한다.
7. **기획 PR을 올린 뒤 구현으로 넘어가지 마라.** 사용자(또는 리뷰어)가 설계를
   승인하거나 기획이 기본 브랜치에 병합될 때까지 멈춘다. “완성하라”는 Cloud 지시만으로
   이 대기를 건너뛰지 않는다.
8. 구현 브랜치의 base에는 준비된 계획(`stage: ready|active`)이 이미 있어야 한다.
   같은 PR에 계획과 코드를 같이 넣지 마라. 구현 PR 본문에
   `Plan: apps/docs/content/docs/development/plans/plan-….mdx`를 적는다.
9. 구현 중 범위나 계약이 달라지면 기획 PR로 문서를 먼저 갱신한다. 같은 내용을 새 ID로
   복제하지 않는다. 한글 본문을 다시 고치면 6번(humanize)을 재실행한다.
10. 구현과 검증이 끝나면 계획을 `done`으로 갱신한다.

### 기획 문서 작성 (PRD / US / 기능 수락 기준)

- 의존 방향: **PRD → US → 스펙·설계 → 코드**. 기획 본문이 뒤 단계 용어
  (“개발 문서에서는 헤더라고…”)에 의존하지 않는다.
- **첫 독자는 기획자·비개발 팀원**이다. `append`·`header`·테이블명만으로 본문을 쓰지 마라.
- 무엇을 저장·조회하는지 **사람 이름 + 예시 값** 표로 푼다.
- 수락 기준·성공 지표는 목록만 쓴다. `기획/비개발자가 확인할…` 같은 메타 안내는
  본문에 넣지 않는다 (절차는 workflow·AGENTS에만).
- PRD/US 본문에 CLI 명령·계정 코드(`txn add`, `Expenses:Tax:*`)를 넣지 마라.
  기능·스펙에 두고 링크로만 연결한다.
- 제품명(`holiday`)을 문장 주어로 반복하지 마라. CLI·경로에만 쓴다.
- **필수:** im-not-ai (`humanize` / `humanize-korean`). 기획 한글 초안 → `/humanize` →
  반영 → 리뷰. 스킵 금지.
- 템플릿: `apps/docs/templates/`. 절차 전문: `apps/docs/content/docs/workflow/planning.mdx`.

docs-only 변경은 선행 계획이 없어도 된다. 그 밖의 일반 우회 표식은 없다.

로컬에서 `pnpm --filter @holiday-cfo/docs check:planning`과 `pnpm check:docs-first`로 검증한다.

## 명령

```bash
pnpm install
pnpm build          # turbo, ^build deps
pnpm test
pnpm typecheck
pnpm lint           # root eslint flat config only
```

패키지 단위:

```bash
pnpm --filter @holiday-cfo/core test
pnpm --filter @holiday-cfo/store-sqlite test
pnpm --filter holiday-plugin test             # 스킬이 주장하는 명령이 CLI에 있는지 (양 호스트)
```

문서 정책↔테스트 링크:

```bash
pnpm --filter docs run check:rules
```

CLI 실행 (빌드 후):

```bash
node packages/cli/dist/main.js <command>   # 배포되면 `npx @holiday-cfo/cli@latest <command>`
```

데모는 scratch 디렉터리에서. `holiday init`이 `.holiday/ledger.db`를 만든다.

## 아키텍처 — 깨면 안 되는 것

1. **의존 방향:** `core` → (아무것도 바깥에서 import 안 함). `cli`만 어댑터 factory를 안다.
2. **포트는 불균형을 표현할 수 없다.** `ValidatedTxn`은 `Txn.create()`로만. `insertPosting` 같은 API를 만들지 마라.
3. **허용오차는 없다.** `SUM(weight_minor) === 0`이 정확히 0. fuzz/epsilon 파라미터 추가 금지.
4. **금액은 i64 minor unit (`bigint`).** `number`로 왕복하지 마라. 적합성 스위트가 `2^53+1`을 못박는다.
5. **환율이 아니라 상대금액으로 균형.** `@@`는 총액(weight). `@`(단위당 환율)는 의도적으로 거부.
6. **스케줄은 원장 밖.** 카드·할부·정기지출·정기수입·대출은 예측이다. 전기하면 금리 변경이 과거를 오염시킨다.
7. **engine 티어는 참칭 불가.** `init()`이 `atomicMultiRowWrite`·`uniqueConstraints`·`readAfterWriteConsistency`를 요구한다. Notion/Airtable 어댑터를 engine으로 올리지 마라.
8. **적용된 마이그레이션은 수정 금지.** 새 마이그레이션을 append한다. sha256이 바뀌면 기존 원장이 안 열린다.
9. **`LedgerStore` 구현은 `store-sql`에 하나.** 엔진 패키지는 드라이버·스키마·마이그레이션만.

정책 카탈로그와 강제 테스트: `apps/docs/content/docs/domain/policy.mdx`.
결정은 `apps/docs/content/docs/development/adr/` — 거부한 대안이 본문이다.

## 코딩 규칙

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- ESM (`"type": "module"`, NodeNext).
- 도메인 규칙은 테스트에 링크한다. 정책 문서를 고치면 `check-rule-links`가 통과해야 한다.
- CLI 에러는 stderr에 JSON 봉투 하나: `{"error":{"code":"...","message":"..."}}`.
- 변경 명령은 exit code 계약(0/1/2)을 지킨다. 스펙: `apps/docs/content/docs/spec/cli/index.mdx`.
- 커밋 메시지: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`…). 본문은 한국어·영어 모두 가능하되 scope는 패키지명.

## 사용자 문구 — 말투와 용어

holiday가 사용자에게 하는 모든 말 — CLI의 `note()` 문구, dash 블록의 텍스트, 스킬이
이끄는 대화 — 은 **한 사람의 목소리**다: 유능하고 차분한 개인 비서. 자비스를
생각하되, 연극기는 뺀다.

- **보고 먼저, 다음 행동은 한 줄.** "확정했습니다 — 잔액에 바로 반영됩니다. 다음: …"
- **존댓말, 간결한 보고체.** 문장은 한국어. 명령어·플래그·계정코드는 코드체 영어 그대로.
- **기호는 ✓ 와 ⚠ 둘뿐.** 그 외 이모지·과장 금지.
- **나쁜 소식은 완곡어 없이**, 바로 할 수 있는 행동 하나를 붙여서.

용어집 — 코드 개념 ↔ 사용자 문구. 문구를 만지면 이 표부터 따른다:

| 코드 | 사용자 문구 |
|---|---|
| ledger | 장부 (개발 문서에서는 원장) |
| posted | 확정 |
| draft | 대기 — 미분류 건은 **분류 대기** |
| accept / reject | 승인 / 반려 |
| rule | 분류 규칙 |
| ingest | 수집 |
| assert | 잔액 대조 |
| correction | 정정 |
| close | 마감 |
| cashflow | 현금흐름 |
| snapshot | 스냅샷 |
| audit chain | 감사 체인 |
| SHORT | 부족 |

## 플러그인 / 배포

- **CLI는 npm 배포다. 커밋된 번들은 없다** (ADR-007). 두 플러그인 모두 스킬만 담고, 에이전트는 `npx @holiday-cfo/cli@latest`로 CLI를 얻는다.
- 네이티브 애드온(`better-sqlite3` 등) 금지 — `node:sqlite`만. 의존성 0이라 `npx` 첫 실행이 가볍다.
- `holiday-cfo` 스킬이 명령/플래그를 주장하면 CLI에 실재해야 한다. `check:skill`이 **양쪽 SKILL.md**(claude-code + codex)를 로컬 빌드(`packages/cli/dist/main.js`)에 대고 검증한다.
- 스킬은 두 호스트에 복제된다. `references/`는 codex→claude-code 심링크라 한 소스다. SKILL.md만 호스트별로 다르다 (CLI 획득 방식).
- 스킬은 progressive disclosure: `SKILL.md`에는 어기면 돌이킬 수 없는 것만. 나머지는 `references/`.
- **대시보드:** `holiday dash init`이 `packages/cli/templates/dash/`(fumadocs)를 복사하고 blocks·ui를 CLI 자기 버전으로 정확히 핀한다. 숫자는 `holiday dash data` / 로컬 API가 굽고, 메모는 MDX·숫자 조종석은 `/dashboard` — 카탈로그에 금액 prop이 없다.

### 기능 완료 = 태그 배포 (필수)

스킬 사용자가 쓰는 CLI는 `npx @holiday-cfo/cli@latest`다. **main에 머지만 하고 태그를
안 달면 `@latest`와 플러그인은 영원히 이전 버전이다.** 사용자-facing 기능
(CLI 명령·플래그·스킬 워크플로·스키마)을 넣으면 작업의 일부로 **반드시 릴리스**한다.

1. 모든 public `packages/*/package.json` + 양쪽 `plugins/*/.*-plugin/plugin.json`의
   `version`을 같은 값으로 올린다 (예: `0.2.3` → `0.2.4`).
2. `node scripts/check-release-version.mjs v0.2.4`가 통과하는지 확인한다.
3. `release: v0.2.4 — <한 줄 요약>` 커밋을 main에 넣는다 (PR 머지 포함).
4. `git tag v0.2.4 && git push origin v0.2.4` — `.github/workflows/release.yml`이
   npm publish를 돌린다. 태그가 트리거이자 버전이다.
5. 플러그인 매니페스트 버전을 안 올리면 `claude plugin update`가 새 스킬을
   무시한다 (v0.2.0에서 실제로 겪음). CLAUDE.md 플러그인 절과 같다.

내부 리팩터·문서만 고친 PR은 태그를 생략해도 된다. **스킬이 새 명령을 말하거나
원장 스키마가 바뀌면 태그 생략 금지.**

## 하지 말 것

- README의 "아직 없는 것"을 즉흥으로 메우지 마라. 없으면 없다고 말하거나 이슈/스펙으로 올려라.
- 할부수수료·카드사 공식을 "그럴듯하게" 계산하지 마라. 관측값만 (`--fees`).
- float으로 이율/금액을 다루지 마라 (ADR-003: scaled bigint).
- 생성된 파일 손편집 금지: `apps/docs/.source/**`, `**/migrations.generated.ts`.
- 사용자 원장(`.holiday/ledger.db`)을 테스트 fixture로 커밋하거나 덮어쓰지 마라 — 데모는 scratch dir.

## Cursor Cloud specific instructions

### Toolchain / gotchas
- The sandbox ships a Node 22 binary at `/exec-daemon/node` that appears early on
  `PATH` and would otherwise shadow nvm. Node 24 + pnpm 11.5.2 are symlinked into
  `/usr/local/cargo/bin` (the first `PATH` entry, ahead of `/exec-daemon`) so
  `node`/`pnpm` resolve to v24 in every shell. If `node --version` ever reports
  v22, re-point those symlinks at the nvm Node 24 `bin` dir.
- pnpm is provided via corepack (`pnpm@11.5.2`).

### Build / test / run
- Standard scripts above. ESLint 9 flat config in `eslint.config.js`.
- No Docker, DB server, env vars, or network access required for build/test/run.

### Running the CLI
- After `pnpm build`: `node packages/cli/dist/main.js <command>`.
- Core flow: `init` → `account add` → `card add` → `txn add` → `cashflow` → `verify`.
- `txn add` legs go through repeatable `--leg "ACCOUNT AMOUNT COMMODITY"`. Quote the
 whole leg so a negative amount (`-6500`) isn't parsed as a flag. Full spec:
 `apps/docs/content/docs/dev/cli.mdx`.

### Docs site (optional)
- `pnpm --filter docs dev` serves on port 3000.
- `fumadocs-mdx` postinstall runs during `pnpm install`.
