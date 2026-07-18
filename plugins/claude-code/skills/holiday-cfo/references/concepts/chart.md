# Chart of accounts — the standard starting set

A ledger with no starting chart gets a different taxonomy every session, and a
taxonomy that shifts makes every trend meaningless. Offer this chart during setup
("이 표준 차트로 시작할까요? 쓰시면서 계정은 언제든 추가/이름변경 가능해요") and
create what the user accepts. It is a starting point, not a straitjacket — accounts
are rows in the ledger DB, renameable (a metadata edit; history is untouched) and
extendable at any time.

Names are proper double-entry accounts, grouped the way 가계부 apps categorise —
so the ledger can produce a real 재무상태표/손익계산서 AND still feel like a
household budget.

## Assets — 돈이 있는 곳

```
Assets:Bank:<은행>:<상품>     # 통장마다 하나. 쓸 수 있는 돈이면 --cash
Assets:Cash                   # 지갑 현금 (--cash)
Assets:Wallet:<서비스>        # Toss, 카카오페이 머니 등 선불 지갑 (--cash)
Assets:Deposit:<종류>         # 전세보증금, 청약, 예·적금 (만기 전) — --cash 아님
Assets:Broker:<증권사>        # 증권 계좌 (multi-commodity: --commodity 생략)
Assets:Property:<이름>        # 부동산 등 — --non-monetary
Assets:Receivable:<대상>      # 빌려준 돈, 정산 받을 돈
```

## Liabilities — 갚을 돈

```
Liabilities:Card:<카드사>:<카드>       # 카드마다 하나 + holiday card add 로 청구주기
Liabilities:Card:<카드사>:<카드>:Installment   # 할부 잔액 (installment add 가 만듦)
Liabilities:Loans:<기관>:<상품>        # 대출 + holiday loan add 로 상환 스케줄
Liabilities:Payable:<대상>             # 갚을 정산, 빌린 돈
```

## Income — 돈이 들어온 이유

```
Income:Salary                 # 급여
Income:Bonus                  # 상여
Income:Business               # 사업/프리랜스 수입
Income:Interest               # 이자 (결산이자 포함)
Income:Dividend               # 배당
Income:Refund                 # 환급 (세금 환급, 페이백)
Income:Allowance              # 용돈/지원받은 돈
Income:Uncategorized          # 분류 전 보관 — 규칙이 자랄수록 비워진다
Income:FX:Unrealized          # 마감 FX 재평가가 요구 (close 전 필수)
```

## Expenses — 돈이 나간 이유 (2~3단계까지만)

```
Expenses:Food:Groceries       # 장보기
Expenses:Food:Dining          # 외식
Expenses:Food:Cafe            # 카페/디저트
Expenses:Food:Delivery        # 배달
Expenses:Housing:Rent         # 월세/관리비
Expenses:Housing:Utilities    # 전기·가스·수도
Expenses:Telecom              # 통신비
Expenses:Subscription         # 구독 (넷플릭스, 유튜브, iCloud…)
Expenses:Transport:Public     # 대중교통
Expenses:Transport:Taxi
Expenses:Transport:Car        # 주유·주차·정비
Expenses:Health:Medical       # 병원·약국
Expenses:Health:Fitness       # 운동
Expenses:Insurance            # 보험료
Expenses:Education            # 교육·책·강의
Expenses:Leisure              # 여가·취미·여행
Expenses:Shopping:Clothing
Expenses:Shopping:Electronics
Expenses:Shopping:Household   # 생활용품
Expenses:Gift                 # 경조사·선물
Expenses:Fees                 # 수수료 (이체·환전·연회비)
Expenses:Interest             # 대출·할부 이자 (loan pay 가 사용)
Expenses:Tax                  # 세금
Expenses:Uncategorized        # 분류 전 보관 — 여기 쌓이면 규칙을 추가할 때
```

## Equity

```
Equity:Opening                # 개시잔액의 상대 계정 — setup 이 사용
```

## The two Uncategorized accounts are load-bearing

They are where an import parks what no rule matched, as DRAFTS. They are not a
category; they are a queue. A healthy ledger drains them — either a rule gets
added (`holiday rule add "스타벅스" Expenses:Food:Cafe` →
`holiday review apply-rules --accept`) or the user picks by hand. Do not leave money in them and
call the books done: a report where 30% of spending is "Uncategorized" answers
nothing.

## Guidance

- **Depth 2–3, no deeper.** `Expenses:Food:Dining:Lunch:Weekday` makes every
  report unreadable. The payee field holds the merchant; the account holds the
  kind.
- **No account per merchant.** 스타벅스 is a payee, `Expenses:Food:Cafe` is the
  account.
- Follow what exists before inventing: `holiday account list` first. Consistency
  beats elegance.
- Cards, loans, 할부, 정기지출 need their schedules too — `../concepts/schedules.md`.
