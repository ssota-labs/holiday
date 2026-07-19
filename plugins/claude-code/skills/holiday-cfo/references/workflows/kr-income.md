# 대한민국 수입 정산 (법정 공제)

수입·세금·4대보험을 다룰 때 읽는다. **요율은 추측하지 않는다.** CLI
(`packages/core`의 `KR_STATUTE`)가 강제하고, 이 파일이 언제 어떤 regime을
쓰는지 정한다. 법이 바뀌면 **CLI 상수와 이 문서를 같은 PR에서** 올린다.

## 언제

- 사용자가 업체별 수입(외주·급여·수당·세금계산서)을 정리할 때
- “이번에 원천징수·건보가 얼마나 빠졌나”를 물을 때
- 급여명세서·정산서를 보고 기표할 때

## 하지 말 것

- 3.3%·10%·4대보험 요율을 머리로 계산해 `txn add` leg에 넣지 않는다.
- 갑근세(간이세액)를 추정하지 않는다 — 명세서 숫자 또는 공식 간이세액표만.
- 할부수수료처럼 “관측만”이라고 도망가지 않는다. 여기 숫자는 **법령**이다.

## Regime 선택

| 상황 | `--regime` |
|---|---|
| 프리랜서·사업소득, 원천징수 3.3% | `business_withholding` |
| 일반과세자 세금계산서 (공급가+부가세) | `business_vat` |
| 직장 급여 (4대보험+갑근세) | `salary` |
| 예비군 훈련비 등 공제 없는 수당 | `allowance` |

같은 `Income:Business`에 업체가 여럿이면 source를 업체마다 만든다.

## 명령

```bash
holiday income source add "노벨라" \
  --income Income:Business --deposit Assets:Bank:KB:Checking \
  --regime business_withholding

holiday income settle "노벨라" --gross 13692720 --date 2026-07-15 --post

# 급여 — 갑근세는 명세서
holiday income source add "버디파이" \
  --income Income:Salary --deposit Assets:Bank:KB:Checking \
  --regime salary
holiday income settle "버디파이" --gross 4000000 --earned-tax 400000 \
  --date 2026-07-25 --post

holiday income check
holiday income settlements
```

`--post` 전 표준 차트에 `Assets:Receivable:Tax`, `Expenses:Tax:Withholding`,
`Expenses:Insurance`, `Liabilities:Payable:Tax`가 있어야 한다.

## 2026 요율 (CLI와 동기)

기준일 `2026-01-01` (`KR_STATUTE_AS_OF`).

| 항목 | 근로자/납부자 | 비고 |
|---|---|---|
| 사업소득 원천 소득세 | 3% | 원 미만 절사 |
| 지방소득세 | 소득세액의 10% | ≈ 0.3%p |
| 부가가치세 | 공급가액의 10% | |
| 국민연금 | 4.75% | 기준소득월액·상하한 (7월 조정) |
| 건강보험 | 3.595% | |
| 장기요양 | 건보료의 13.14% | |
| 고용보험(실업) | 0.9% | |
| 갑근세 | CLI 미내장 | `--earned-tax` |

국민연금 기준소득월액: 2026-06까지 상한 637만, 2026-07부터 659만 (천 원 미만 절사).

## 법이 바뀌면

1. `packages/core/src/domain/kr-income.ts`의 `KR_STATUTE_*` 갱신 + 테스트
2. 이 파일의 표 갱신
3. `holiday income check`가 과거 정산을 깨지 않는지 — 정산 행의 `statute_as_of`로 당시 요율을 쓴다
