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
packages/blocks/         대시보드 어휘 — 도메인 블록 + json-render 카탈로그 (npm 배포)
apps/docs/               Fumadocs — 정책·ADR·CLI 스펙
plugins/claude-code/     Claude Code 플러그인 (스킬만; CLI는 npx)
plugins/codex/           Codex 플러그인 (스킬만; SKILL.md만 별도, references는 심링크)
```

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
6. **스케줄은 원장 밖.** 카드·할부·정기지출·대출은 예측이다. 전기하면 금리 변경이 과거를 오염시킨다.
7. **engine 티어는 참칭 불가.** `init()`이 `atomicMultiRowWrite`·`uniqueConstraints`·`readAfterWriteConsistency`를 요구한다. Notion/Airtable 어댑터를 engine으로 올리지 마라.
8. **적용된 마이그레이션은 수정 금지.** 새 마이그레이션을 append한다. sha256이 바뀌면 기존 원장이 안 열린다.
9. **`LedgerStore` 구현은 `store-sql`에 하나.** 엔진 패키지는 드라이버·스키마·마이그레이션만.

정책 카탈로그와 강제 테스트: `apps/docs/content/docs/domain/policy.mdx`.
결정은 `apps/docs/content/docs/dev/adr.mdx` — 거부한 대안이 본문이다.

## 코딩 규칙

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- ESM (`"type": "module"`, NodeNext).
- 도메인 규칙은 테스트에 링크한다. 정책 문서를 고치면 `check-rule-links`가 통과해야 한다.
- CLI 에러는 stderr에 JSON 봉투 하나: `{"error":{"code":"...","message":"..."}}`.
- 변경 명령은 exit code 계약(0/1/2)을 지킨다. 스펙: `apps/docs/content/docs/dev/cli.mdx`.
- 커밋 메시지: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`…). 본문은 한국어·영어 모두 가능하되 scope는 패키지명.

## 플러그인 / 배포

- **CLI는 npm 배포다. 커밋된 번들은 없다** (ADR-007). 두 플러그인 모두 스킬만 담고, 에이전트는 `npx @holiday-cfo/cli@latest`로 CLI를 얻는다.
- 네이티브 애드온(`better-sqlite3` 등) 금지 — `node:sqlite`만. 의존성 0이라 `npx` 첫 실행이 가볍다.
- `holiday-cfo` 스킬이 명령/플래그를 주장하면 CLI에 실재해야 한다. `check:skill`이 **양쪽 SKILL.md**(claude-code + codex)를 로컬 빌드(`packages/cli/dist/main.js`)에 대고 검증한다.
- 스킬은 두 호스트에 복제된다. `references/`는 codex→claude-code 심링크라 한 소스다. SKILL.md만 호스트별로 다르다 (CLI 획득 방식).
- 스킬은 progressive disclosure: `SKILL.md`에는 어기면 돌이킬 수 없는 것만. 나머지는 `references/`.
- **대시보드:** `holiday dash init`이 `packages/cli/templates/dash/`(vinext)를 복사하고 blocks를 CLI 자기 버전으로 정확히 핀한다. 숫자는 `holiday dash data`가 굽고, 레이아웃(`spec.json`)만 에이전트가 쓴다 — 카탈로그에 금액 prop이 없다.

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

### Docs site (optional)
- `pnpm --filter docs dev` serves on port 3000.
- `fumadocs-mdx` postinstall runs during `pnpm install`.
