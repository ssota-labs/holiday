# CLAUDE.md

@AGENTS.md

## Claude Code

이 저장소는 두 개의 코딩 에이전트 플러그인(`plugins/claude-code/`, `plugins/codex/`)을
배포한다. 코딩 세션과 원장 운전 세션을 섞지 마라.

| 역할 | 읽는 것 |
|---|---|
| 이 레포의 코드를 고친다 | 이 파일 + `AGENTS.md` |
| 사용자의 원장을 채팅에서 운전한다 | `plugins/claude-code/skills/holiday-cfo/SKILL.md` (+ 필요 시 `references/`) |

`holiday-cfo`는 progressive disclosure다. 스킬이 트리거되면 `SKILL.md`만 항상 로드하고,
`references/`는 작업이 요구할 때만 읽는다.

## 플러그인 작업 시

1. CLI 명령/플래그를 추가·변경하면 **양쪽** 스킬(`plugins/claude-code/`, `plugins/codex/`)을
   같이 맞춘다. `references/`는 심링크라 한 번만 고치면 된다.
2. `pnpm --filter holiday-plugin test`로 스킬↔CLI 정합을 확인한다 (양쪽 SKILL.md를 검증한다).
3. **커밋된 번들은 없다.** CLI는 npm 배포이고 에이전트는 `npx @holiday-cfo/cli@latest`로 얻는다
   (ADR-007). CLI를 바꾸면 스펙 문서와 버전만 맞추면 된다.
4. `plugins/*/.*-plugin/plugin.json`의 version/description을 스펙 문서
   (`apps/docs`의 `<SpecVersion>`)와 어긋나지 않게 둔다.

마켓플레이스 메타: `.claude-plugin/marketplace.json` (`source: ./plugins/claude-code`).

## 문서

- 정책 규칙을 바꾸면 `apps/docs/content/docs/domain/policy.mdx`의 `<Rule test=…>` 링크가
  실제 테스트에 연결돼야 한다.
- ADR을 추가할 때 **거부한 대안**을 본문에 남겨라 — 코드를 읽어선 알 수 없는 부분이다.
