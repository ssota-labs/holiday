# 합성 에이전트 플러그인 설계 초안

> 상태: 아이디어 검증용 초안
> 작성일: 2026-07-22
> 임시 명칭: Composite Plugin Bundle
> 대상: 스킬, 에이전트, 훅을 여러 원본에서 골라 하나의 네이티브 플러그인처럼 설치하려는 도구

## 1. 문서 목적

한 프로젝트에 필요한 에이전트 기능이 모두 한 저장소에 모여 있지는 않다. 어떤 스킬은
전문 스킬 저장소에 있으며 에이전트 정의와 훅은 별도 플러그인에 들어 있기도 하다.
지금도 이 파일들을 한 플러그인 폴더에 복사하면 한 번에 배포할 수 있다. 다만 복사한
순간부터 원본 저장소, 버전, 변경 이력을 따로 관리해야 한다.

이 문서는 서로 다른 원본 플러그인과 스킬 저장소에서 필요한 구성요소만 골라
네이티브 플러그인 하나로 설치하되, 각 구성요소의 출처와 버전을 계속 추적할 수 있는
방식을 설계한다.

## 2. 문제 정의

네이티브 플러그인은 대체로 manifest와 파일 묶음으로 구성된다. 호스트는 이를 로컬
캐시에 내려받아 활성화한 뒤, 플러그인의 버전이나 원격 변경 여부를 확인해 갱신한다.
한 제작자가 함께 관리하는 스킬, 에이전트, 훅을 배포하기에는 이 방식으로 충분하다.

하지만 여러 원본에서 일부만 골라 새 플러그인을 만들면 다음 정보가 사라진다.

- 각 스킬과 에이전트, 훅의 원본 저장소
- 원본에서 선택한 경로
- 설치 당시의 정확한 commit
- 원본이 바뀌었는지 판단할 기준
- 어느 구성요소만 선택해서 갱신할지에 대한 정보
- 원본 라이선스와 고지 파일

파일을 심링크로 연결해도 문제가 완전히 해결되지는 않는다. 호스트가 설치 과정에서
심링크를 실제 파일로 바꾸거나, 플러그인 바깥을 가리키는 링크를 보안상 거부할 수
있다. Windows나 원격 실행 환경처럼 심링크를 안정적으로 쓸 수 없는 환경도
고려해야 한다.

이 문제를 해결하려면 심링크가 아니라 **원본 identity와 해석 결과를 기록하는 의존성 모델**이
필요하다.

## 3. 목표

1. 여러 Git 저장소에서 스킬, 에이전트, 훅을 골라 한 번에 설치한다.
2. 설치 결과는 각 호스트가 이해하는 네이티브 플러그인 형태로 제공한다.
3. 모든 구성요소는 원본 저장소와 commit까지 추적한다.
4. 같은 lock 파일로 같은 설치 결과를 재현한다.
5. 전체 또는 특정 구성요소만 선택해서 갱신한다.
6. 원본 파일을 직접 수정하지 않고 필요한 변환은 별도 기록으로 남긴다.
7. 이름 충돌, 훅 실행 권한, 외부 스크립트 같은 위험을 설치 전에 드러낸다.
8. 갱신이 실패해도 현재 동작 중인 플러그인은 그대로 유지한다.

## 4. 목표가 아닌 것

- 모든 호스트의 훅 이벤트와 에이전트 형식을 하나의 표준으로 통일하지 않는다.
- 호스트의 활성 플러그인 캐시를 실행 중에 직접 수정하지 않는다.
- 검토 없이 upstream 최신 버전을 자동 적용하지 않는다.
- 원본 저장소에 변경 내용을 역으로 반영하거나 fork를 자동 관리하지 않는다.
- npm을 필수 레지스트리로 삼지 않는다.

## 5. 용어

| 용어 | 뜻 |
|---|---|
| bundle | 여러 원본의 구성요소를 조합하는 배포 단위 |
| component | skill, agent, hook처럼 bundle에 포함할 수 있는 단위 |
| origin | component를 관리하는 원본 저장소 |
| requested ref | manifest에 적은 branch, tag, version range 또는 commit |
| resolved commit | 설치 시점에 requested ref가 가리킨 정확한 Git commit SHA |
| component closure | component 본문과 실행에 필요한 scripts, references, assets 전체 |
| materialization | lock을 바탕으로 호스트용 네이티브 플러그인을 생성하는 과정 |
| provenance | 설치된 component가 어느 원본과 commit에서 왔는지 보여 주는 정보 |
| receipt | 특정 머신과 호스트에 실제로 무엇을 설치했는지 기록한 로컬 상태 |

## 6. 핵심 원칙

### 6.1 생성된 플러그인은 정본이 아니다

생성된 플러그인 폴더는 빌드 결과물이다. 사람이 관리하는 정본은 bundle manifest이고
정확한 해석 결과는 lock 파일에 담긴다. 생성 폴더를 직접 수정한 내용은 다음
materialization에서 덮어쓴다.

### 6.2 스킬 이름은 전역 identity가 아니다

`pdf`나 `deploy`처럼 표시되는 이름은 서로 다른 저장소에서 겹칠 수 있다. component의
실제 identity는 다음 튜플로 정한다.

`source type + canonical source URL + resolved commit + plugin root + component type + component path`

로컬 이름과 alias는 identity에 포함하지 않는다.

### 6.3 원본 추적과 파일 복사는 모순되지 않는다

호스트가 실행할 수 있도록 파일을 캐시와 생성 플러그인에 복제해도 된다. 다만 복제본을
정본으로 취급하지 않는다. 원본 URL, commit, 경로, content hash를 보존하면 복제한
파일도 원본과 대조하고 갱신할 수 있다.

### 6.4 lock은 현재 상태가 아니라 해석 결과다

content hash만 기록하면 변경 여부는 알 수 있지만 원격 저장소에서 과거 파일을 다시
가져올 수 있다는 보장은 없다. lock에는 반드시 resolved commit을 기록한다. 장기 복원이
필요하다면 해당 commit의 component closure도 content-addressed cache나 artifact
registry에 보관한다.

### 6.5 실행 권한이 늘어나는 변경은 별도로 확인한다

문서만 바뀐 스킬 업데이트와 새 shell hook을 추가하는 업데이트는 위험도가 다르다.
새 hook, executable script, MCP server, network permission이 생기면 일반 content
update와 구분해 승인을 받는다.

## 7. 전체 구조

```text
bundle repository
├── plugin-bundle.json
└── plugin-bundle.lock.json
          │
          ▼
      dependency resolver
          │
          ├── origin fetcher
          ├── component analyzer
          ├── policy / trust checker
          └── content-addressed cache
          │
          ▼
      host materializer
          ├── Cursor plugin
          ├── Claude Code plugin
          └── Codex plugin
          │
          ▼
      native host installer
```

### 7.1 Bundle manifest

사람이 작성한다. 원하는 구성을 선언하되 실제 commit이나 파일 hash는 넣지 않는다.
파일명은 임시로 `plugin-bundle.json`을 사용한다.

### 7.2 Resolver

각 원본을 가져와 requested ref를 commit으로 해석한다. 선택한 component와 그 closure를
찾고 hash, 라이선스, 실행 권한을 계산한 뒤 lock에 기록한다.

### 7.3 Content-addressed cache

원본 snapshot과 component closure를 hash별로 저장한다. 같은 원본과 commit을 여러
bundle이 사용하더라도 한 번만 보관한다. 심링크, hardlink, reflink는 저장 공간을 줄이는
최적화일 뿐 계약에는 포함하지 않는다. 지원되지 않는 환경에서는 일반 복사를 쓴다.

### 7.4 Materializer

lock과 cache만 읽어 호스트별 플러그인 폴더를 생성한다. 각 호스트의 manifest와 경로
규칙은 adapter가 맡는다.

### 7.5 Native installer

생성한 결과를 Cursor, Claude Code, Codex의 기존 설치 경로로 넘긴다. 가능하면 호스트
공식 설치 명령을 사용한다. 호스트 캐시를 직접 수정하지 않는다.

## 8. Manifest 제안

```json
{
  "schemaVersion": 1,
  "name": "my-project-agent-stack",
  "version": "0.1.0",
  "description": "이 프로젝트에서 함께 사용할 에이전트 기능",
  "targets": ["cursor", "claude-code", "codex"],
  "updatePolicy": {
    "check": "manual",
    "apply": "manual"
  },
  "dependencies": [
    {
      "id": "anthropic-docs",
      "source": {
        "type": "github",
        "url": "https://github.com/anthropics/skills",
        "ref": "main"
      },
      "include": {
        "skills": ["skills/pdf", "skills/xlsx"]
      }
    },
    {
      "id": "team-workflows",
      "source": {
        "type": "github",
        "url": "https://github.com/example/team-plugin",
        "ref": "^2.1.0"
      },
      "pluginRoot": "plugins/workflows",
      "include": {
        "agents": ["agents/reviewer.md"],
        "hooks": ["hooks/hooks.json"]
      }
    }
  ]
}
```

### 8.1 필수 필드

| 필드 | 설명 |
|---|---|
| `schemaVersion` | manifest schema 버전 |
| `name` | bundle 이름 |
| `targets` | 생성할 호스트 목록 |
| `dependencies[].id` | bundle 안에서 쓰는 안정적인 dependency 식별자 |
| `source.type` | `github`, `git`, `local`, `registry` 등 |
| `source.url` | canonical origin |
| `source.ref` | branch, tag, version range 또는 commit |
| `include` | 원본에서 선택할 component |

### 8.2 선택 필드

- `pluginRoot`: 한 저장소에 여러 플러그인이 있을 때 기준 경로
- `aliases`: 이름 충돌을 해결할 명시적 별칭
- `profiles`: `frontend`, `finance`, `deploy`처럼 선택 설치할 component 그룹
- `targets`: dependency별 호스트 제한
- `permissions`: 허용한 hook, command, network 범위
- `overlays`: 원본을 바꾸지 않고 적용할 별도 patch
- `hookOrder`: 여러 hook의 실행 순서와 `before`/`after` 관계

## 9. Lock 제안

lock은 도구가 생성하며 사람이 직접 편집하지 않는다. 키 순서와 직렬화 형식을 고정해
불필요한 diff를 줄인다.

```json
{
  "schemaVersion": 1,
  "bundle": {
    "name": "my-project-agent-stack",
    "manifestHash": "sha256:..."
  },
  "dependencies": {
    "anthropic-docs": {
      "source": {
        "type": "github",
        "url": "https://github.com/anthropics/skills",
        "requestedRef": "main",
        "resolvedCommit": "0123456789abcdef..."
      },
      "components": [
        {
          "type": "skill",
          "sourcePath": "skills/pdf",
          "originalName": "pdf",
          "localName": "pdf",
          "closureHash": "sha256:...",
          "materializedHash": "sha256:...",
          "license": {
            "spdx": "Apache-2.0",
            "fileHash": "sha256:..."
          }
        }
      ]
    }
  }
}
```

### 9.1 두 종류의 hash

- `closureHash`: 원본에서 가져온 component closure의 hash
- `materializedHash`: 호스트용 경로 배치나 wrapper 생성까지 끝난 설치본의 hash

두 값을 나누면 원본 파일은 그대로인데 adapter 출력만 바뀐 경우도 구분할 수 있다.

### 9.2 원본을 오래 보존해야 할 때

Git commit SHA가 있어도 원본 저장소가 삭제되거나 history가 강제로 바뀌면 다시 가져오지
못할 수 있다. 재현성을 장기간 보장하려면 lock에 artifact digest를 추가하고 해당
snapshot을 content-addressed storage에 보관한다.

## 10. Provenance

생성된 플러그인 안에 `.bundle/provenance.json`을 넣는다. 호스트가 bundle 도구 없이
플러그인 폴더만 보더라도 각 component의 출처를 확인할 수 있어야 한다.

provenance에는 다음 정보가 들어간다.

- bundle 이름과 버전
- materialization 도구 버전
- 생성 시각
- dependency ID
- component type과 로컬 이름
- 원본 URL
- requested ref와 resolved commit
- 원본 경로
- closure hash와 materialized hash
- 라이선스
- 적용한 overlay

`bundle provenance <component>` 명령은 이 파일을 사람이 읽기 쉬운 형태로 출력한다.

## 11. Component closure

스킬은 `SKILL.md` 한 파일로 끝나지 않을 수 있다. 같은 폴더의 `references/`, `scripts/`,
templates, 이미지뿐 아니라 플러그인 공용 디렉터리를 참조하기도 한다. 에이전트와 훅도
실행 스크립트나 설정 파일이 함께 필요할 수 있다.

closure는 다음 순서로 정한다.

1. component manifest에 명시된 파일
2. component 디렉터리 아래의 모든 파일
3. 정적으로 확인할 수 있는 상대경로 참조
4. dependency가 명시한 추가 include 패턴

정적 분석만으로 외부 참조를 확정할 수 없으면 설치를 중단하고 추가 include를 요구한다.
편의를 위해 플러그인 전체를 묵시적으로 가져오지는 않는다.

closure 밖의 파일을 실행 중에 참조하면 `doctor`가 오류로 보고해야 한다.

## 12. Materialization

### 12.1 공통 규칙

- 원본 component 본문은 가능한 한 바꾸지 않는다.
- 모든 파일은 생성 플러그인 루트 안에 둔다.
- 상위 디렉터리로 나가는 `..` 경로와 외부 absolute path를 거부한다.
- 외부를 가리키는 심링크는 따라가지 않는다.
- 이름 충돌은 자동으로 덮어쓰지 않는다.
- 변환이 필요하면 원본 hash와 변환 결과 hash를 모두 남긴다.

### 12.2 호스트 adapter

| 호스트 | 생성 결과 |
|---|---|
| Cursor | `.cursor-plugin/plugin.json`과 skills, agents, hooks 경로 |
| Claude Code | `.claude-plugin/plugin.json`과 호스트 규칙에 맞춘 skills, agents, hooks |
| Codex | `.codex-plugin/plugin.json`과 skills, hooks, MCP 설정 |

호스트마다 지원하는 component와 hook 이벤트가 다르다. 지원하지 않는 component를
조용히 버리지 않고 검증 결과를 `unsupported`, `requires-mapping`, `supported` 중
하나로 표시한다.

### 12.3 호스트별 산출물

한 폴더를 모든 호스트에 억지로 맞추지 않는다. 같은 lock에서 다음과 같이 산출물을
따로 만든다.

```text
dist/
├── cursor/
├── claude-code/
└── codex/
```

세 산출물은 배치 형식만 다르고 같은 origin과 component lock을 공유한다.

## 13. 설치 흐름

1. bundle 저장소 또는 manifest를 가져온다.
2. manifest schema와 source URL을 검증한다.
3. lock이 있으면 manifest hash가 일치하는지 확인한다.
4. `--frozen-lockfile`이면 lock의 commit과 artifact만 사용한다.
5. cache에 없는 origin snapshot을 내려받는다.
6. component closure와 hash를 검증한다.
7. hook, script, MCP 등 실행 권한을 요약해 보여 준다.
8. 임시 디렉터리에 호스트별 플러그인을 생성한다.
9. adapter 검증과 `doctor`를 실행한다.
10. 검증이 끝나면 기존 설치본과 원자적으로 교체한다.
11. 로컬 receipt를 기록한다.

## 14. 업데이트 흐름

`update`는 lock을 무시한 채 최신 파일을 복사하는 명령이 아니다.

1. manifest의 requested ref를 원본에서 다시 해석한다.
2. 현재 resolved commit과 새 commit을 비교한다.
3. 선택한 component와 closure의 변경만 계산한다.
4. 삭제, 이동, 이름 변경, 새 실행 권한을 따로 표시한다.
5. 사용자가 승인하면 새 lock 후보를 만든다.
6. 새 산출물을 임시 디렉터리에 생성하고 검증한다.
7. 검증이 통과하면 lock과 설치본을 함께 교체한다.
8. 실패하면 기존 lock과 설치본을 유지한다.

지원할 갱신 단위:

- bundle 전체
- dependency 하나
- component 하나
- security update만

기본 정책에서는 `check`와 `apply`를 모두 수동으로 실행한다. 자동화가 필요하다면 변경
확인만 자동으로 실행하고 적용은 승인 뒤에 한다.

## 15. 충돌 처리

### 15.1 이름 충돌

같은 타입에서 로컬 이름이 겹치면 설치를 중단한다. manifest에 alias를 명시한 경우만
허용한다. 원본 파일의 이름을 직접 바꿔야 하는 host라면 생성 wrapper나 adapter
metadata로 처리하고 변환 내역을 provenance에 남긴다.

### 15.2 Hook 순서

같은 이벤트에 여러 hook이 붙으면 원본 배열 순서를 우연히 따르지 않는다. manifest에
`before`, `after`, `priority` 중 한 방식으로 순서를 선언한다. 순환 관계가 생기면
설치를 거부한다.

### 15.3 같은 원본의 다른 버전

두 dependency가 같은 origin의 서로 다른 commit을 요구할 수 있다. component가 완전히
분리돼 있으면 둘 다 namespace에 둘 수 있다. 같은 hook이나 MCP 이름처럼 전역 효과가
겹치면 한 버전으로 정리하도록 오류를 낸다.

### 15.4 파일 경로 충돌

생성 단계에서 동일한 출력 경로에 서로 다른 hash가 배치되면 실패한다. 내용이 완전히
같더라도 provenance가 다르면 자동 병합하지 않고 dedupe 후보로만 보고한다.

## 16. 보안과 신뢰

스킬은 지침이지만 shell 명령이나 외부 도구 실행을 유도할 수 있다. 훅은 세션 시작이나
도구 실행 전후에 자동으로 동작하므로 더 엄격하게 다룬다.

설치 전에 다음 내용을 표시한다.

- 새로 추가되는 executable
- 자동 실행되는 hook과 이벤트
- 실행 명령과 working directory
- MCP server와 network endpoint
- 요구하는 환경변수와 secret 이름
- 저장소 밖 파일 접근
- 원본 또는 라이선스 변경

필수 방어:

- archive path traversal 차단
- 외부 absolute path와 외부 symlink 차단
- lock hash 불일치 시 실행 금지
- hook 실행 전 사용자 또는 조직 정책 확인
- secret 값은 manifest와 lock에 저장하지 않음
- 서명 검증은 선택 기능으로 시작하되 artifact digest는 필수

## 17. Cache와 로컬 상태

권장 배치는 개념적으로 다음과 같다.

```text
~/.cache/<tool>/
├── origins/<source-hash>/<commit>/
├── components/<closure-hash>/
└── artifacts/<materialized-hash>/

~/.local/state/<tool>/
└── receipts/<bundle>/<host>.json
```

lock은 프로젝트와 함께 공유하는 해석 결과다. receipt는 특정 머신에 설치된 경로,
호스트 버전, 활성 상태를 기록하므로 저장소에 commit하지 않는다.

cache 정리는 어떤 receipt와 lock에서도 참조하지 않는 artifact만 대상으로 한다.
실행 중인 세션이 이전 artifact를 사용할 수 있으므로 유예 기간을 둔다.

## 18. 명령 인터페이스

도구 이름은 정하지 않았다. 아래에서는 설명을 위해 `bundle`을 쓴다.

| 명령 | 동작 |
|---|---|
| `bundle init` | 빈 manifest 생성 |
| `bundle add <source>` | 원본에서 component를 찾아 manifest에 추가 |
| `bundle resolve` | manifest를 해석해 lock 생성 |
| `bundle install <bundle-source>` | bundle을 받아 해석, 생성, 설치 |
| `bundle install --frozen-lockfile` | lock과 cache/artifact만으로 정확히 복원 |
| `bundle check` | upstream 변경과 권한 변화를 확인 |
| `bundle update [dependency|component]` | 선택한 항목을 갱신하고 lock 재작성 |
| `bundle diff` | 현재 lock과 업데이트 후보 비교 |
| `bundle doctor` | 누락 파일, 충돌, host 호환성 검사 |
| `bundle provenance [component]` | 원본과 commit 출력 |
| `bundle uninstall` | 설치본과 receipt 제거 |
| `bundle cache gc` | 참조되지 않는 cache 정리 |

## 19. 배포 모델

### 19.1 Bundle 저장소

가장 단순한 배포 단위는 Git 저장소다. 저장소에는 manifest와 lock, README만 두고
upstream component 본문은 commit하지 않는다.

사용자는 bundle 저장소 URL 하나로 설치한다.

```text
bundle install https://github.com/example/my-project-agent-stack
```

초기 버전에는 중앙 registry가 필요하지 않다. 검색과 평점, 검증 서명이 필요해지면
manifest URL을 색인하는 형태로 추가할 수 있다.

### 19.2 Curated bundle

제작자가 dependency를 검토하고 lock을 갱신해 새 bundle 버전을 배포한다. 사용자는
published lock을 그대로 설치한다. 재현하기 쉽고 검토하기도 좋다.

### 19.3 Locally updated bundle

사용자가 `bundle update`로 upstream을 직접 따라간다. 원본 identity는 유지되지만
설치 결과는 published lock과 달라진다. 이 경우 receipt와 lock diff에 local update
사실을 표시한다.

기본은 curated bundle로 두고 직접 갱신은 명시적으로 선택한다.

## 20. 오류 처리

| 상황 | 동작 |
|---|---|
| 원본 저장소 접근 실패 | cache가 있으면 frozen 설치, 없으면 중단 |
| requested ref가 없음 | dependency와 ref를 표시하고 중단 |
| resolved commit을 가져올 수 없음 | artifact cache를 확인한 뒤 중단 |
| component 경로 이동 또는 삭제 | 자동 추측하지 않고 update diff에 표시 |
| closure hash 불일치 | 설치와 실행 중단 |
| host가 component를 지원하지 않음 | 명시적 mapping이 없으면 해당 host 생성 실패 |
| hook 권한 증가 | 재승인 전까지 update 보류 |
| 생성 중 실패 | 임시 디렉터리 삭제, 기존 설치 유지 |
| 설치 교체 중 실패 | 이전 receipt와 artifact로 rollback |

## 21. MVP

첫 구현의 범위는 다음과 같이 제한한다.

- 첫 호스트 하나만 지원한다. 후보는 Cursor다.
- GitHub 공개 저장소만 origin으로 지원한다.
- component type은 skill, agent, hook 세 가지다.
- exact commit과 branch/tag 해석을 지원한다.
- manifest, lock, provenance를 구현한다.
- content-addressed local cache를 사용한다.
- 명시적인 install, check, update만 제공한다.
- 이름 충돌은 alias 자동 생성 없이 실패한다.
- transitive bundle dependency는 지원하지 않는다.
- hook permission diff와 원자적 rollback을 필수로 둔다.

그다음 Claude Code와 Codex adapter, 비공개 저장소, registry, 서명, version range,
transitive dependency를 순서대로 추가한다.

## 22. 수락 기준

1. 빈 머신에서 bundle URL 하나로 선택된 스킬, 에이전트, 훅을 설치할 수 있다.
2. 같은 manifest와 lock은 같은 materialized hash를 만든다.
3. 설치된 모든 component에서 원본 URL, commit, 경로를 조회할 수 있다.
4. 생성 플러그인을 삭제해도 lock과 cache로 같은 결과를 복원할 수 있다.
5. 특정 스킬 하나만 갱신해도 다른 dependency의 resolved commit은 바뀌지 않는다.
6. upstream 변경으로 hook이나 executable이 추가되면 적용 전에 경고하고 승인을 받는다.
7. 이름이나 출력 경로가 충돌하면 자동 덮어쓰기 없이 실패한다.
8. update 또는 install 실패 뒤에도 기존 플러그인이 계속 동작한다.
9. 원본 파일을 변환했다면 upstream hash와 materialized hash를 모두 확인할 수 있다.
10. 호스트가 지원하지 않는 component를 조용히 누락하지 않는다.

## 23. 남은 결정

구현 전에 다음 사항을 정해야 한다.

1. 첫 지원 호스트를 Cursor로 할지 Claude Code로 할지
2. manifest 파일명을 `plugin-bundle.json`으로 확정할지
3. published lock을 기본으로 강제할지, 첫 설치 때 항상 다시 resolve할지
4. component closure의 추가 파일을 glob으로 선언할지 별도 component manifest로 둘지
5. hook 순서를 하나의 공통 모델로 표현할지 host별 설정으로 둘지
6. alias를 wrapper로 만들지 호스트 namespace에만 맡길지
7. 원본 snapshot을 로컬 cache에만 둘지 원격 artifact registry에도 보관할지
8. skills.sh lock과 호환할지 별도 schema를 유지할지

## 24. 권장 초기 결정

- manifest와 lock은 전용 파일로 둔다. `package.json`은 사용하지 않는다.
- bundle 저장소는 manifest와 lock만 배포한다.
- published lock을 기본 설치 기준으로 삼는다.
- 사용자가 요청할 때만 upstream을 갱신한다.
- component identity는 이름이 아니라 origin, commit, type, path의 조합으로 정한다.
- 생성 결과는 네이티브 플러그인으로 제공한다.
- cache의 심링크 사용 여부는 구현 최적화로 남긴다.
- 첫 버전부터 provenance와 hook 권한 diff를 포함한다.
