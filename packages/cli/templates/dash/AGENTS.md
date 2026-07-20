# holiday dash

fumadocs 앱입니다. 메모는 MDX, 숫자는 API·bake 스냅샷입니다.

| 무엇이 | 어디 | 누가 씀 |
|---|---|---|
| 숫자 스냅샷 | `data/ledger.json` | `holiday dash data` — **손으로 고치지 말 것** |
| 메모·기록 | `content/docs/**/*.mdx` | 당신 |
| 숫자 조종석 | `app/dashboard/page.tsx` | 당신 (블록 배치) |
| MDX 어휘 | `components/mdx.tsx` | 템플릿 (화이트리스트) |

## 규칙

**금액을 페이지나 props에 넣지 마세요.** 가계부 블록·UI 칸에 금액 필드가
없습니다. 본문에 쓴 `₩…`은 메모일 뿐 스냅샷과 동기화되지 않습니다. 틀린 숫자가
잘 만든 카드에 들어가면 권위 있어 보입니다 — 그게 이 설계가 막는 사고입니다.

구 `spec.json` / json-render 경로는 없습니다. vinext 템플릿이라면 이 폴더를
백업한 뒤 `holiday dash init`으로 새로 깔고 MDX·대시보드 페이지를 옮기세요.

## MDX에 쓸 수 있는 태그

목록 밖 타입은 빌드/렌더에서 실패합니다 (빈 카드 금지).

**fumadocs:** `Card`, `Cards`, `Callout`, `Files`, `Folder`, `File`

**UI 셸:** `Badge`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

**가계부 블록** (`@holiday-cfo/blocks` — 필터 prop만, 금액 없음):

- `Dashboard` — 프레임
- `Row` — 1–3열
- `CashRunway` — 현금이 약정 지출을 버티는지
- `BalanceTable` — `account` 접두로 잔액
- `LedgerHealth` — 장부 신뢰 여부
- `CategorizeQueue` — 분류 대기 (로컬만 클릭 처리; 배포본은 안내)
- `Note` — 문장 메모 (숫자 재기재 금지)

문서 사이트 전용 칸(`Rule`, `SchemaTable`, `CommandSpec` 등)은 여기 없습니다.

## 새로고침

```sh
holiday dash data     # data/ledger.json만 다시 굽기 (MDX·대시보드 소스는 안 덮음)
cd dash && pnpm install && pnpm dev   # http://localhost:3000
```

- 로컬: `/api/holiday/snapshot` · `pending` · `categorize` → CLI
- 배포(정적 export 등): 쓰기 API 없음. bake JSON만 읽기

스냅샷은 그 시점의 사진입니다. `txn add` · 수집 · `close` 뒤에는 다시 굽세요.
