# Transfers — moving money between the user's own accounts

A transfer is not income or expense. Money leaves one account the user owns and
lands in another they own; net worth does not change. In double entry it is one
event with two asset legs:

```bash
holiday txn add --date 2026-07-14 --narration "신한 → 카카오뱅크" \
  --leg "Assets:Bank:Kakao 1000000 KRW" \
  --leg "Assets:Bank:Shinhan -1000000 KRW"
```

This comes up in three situations, not just first-time setup: importing history,
adding a newly-found account later, and the everyday "I moved money today." The
matching problem below applies only to the import cases — a transfer the user tells
you about directly needs no matching, since they already know both sides.

## The everyday case is easy

When the user says "오늘 신한에서 카카오로 50만원 옮겼어", both ends are known. Post
the two asset legs and you are done. No detective work.

## The import case is where it gets hard — and why

When you reconstruct transfers from statements, ONE transfer appears TWICE: a
withdrawal in one account's file, a matching deposit in another's. You must merge
the two into a single entry, or the books break:

- **both sides as income/expense** → net worth swings by 2× the amount (an expense
  plus an income that never happened)
- **each side as its own transfer** → double-counted, the money moves twice

The merge is hard for a concrete reason worth knowing before you start: **bank
statement rows usually do not record the destination account.** The counterparty
field is just a name — and every account one person owns tends to carry that *same*
name (their own name, sometimes with a wallet/other-bank prefix, sometimes a typo).
So "sent to my other bank account" is often indistinguishable in-row from "sent to
my wallet / brokerage / cash." You infer the destination; the row rarely states it.

## Matching, in three tiers

Build one timeline across ALL the user's account files, then:

**1. Auto — high confidence.** A withdrawal of amount X on date D in one account
matched to a deposit of X on date D (±1 day) in another, **with the owner's own name
on both legs**. This tier is essentially unambiguous — post it as a transfer.

**2. Flag for the user.** Anything the auto tier can't be sure of:
- **Same amount, same day, more than once** — amount+date is NOT a unique key.
  Disambiguate with the running balance (which deposit makes the balance line up) or
  the time of day, and if still unclear, ask.
- **Wallet charge/refund round-trips** (e.g. a Toss 충전 ↔ 환급 pair) — they match on
  amount but the leg name isn't the owner's, so a name filter is double-edged: it
  removes coincidental collisions but also drops these real self-moves. Ask.
- **±1-day timing skew** and **coincidental equal amounts** (a card payment that
  happens to equal someone's deposit) live here too.

**3. Orphans — the biggest hole.** A self-named withdrawal with **no matching leg in
any file you have** went to an account outside the dataset (another bank, a wallet,
cash, a brokerage). **Do NOT confirm these as `Expenses`** — that silently corrupts
net worth. Park them and ask:

```bash
holiday account add "Assets:Bank:Unknown" --commodity KRW --placeholder
# once the user says where it went, post a correcting entry to the real account
```

## Data completeness decides everything

The single biggest lever on match rate is **how many of the user's accounts you
have.** Every account missing from the dataset turns its transfers into orphans —
its withdrawals have nowhere to match. Before importing, ask what accounts exist
(banks, wallets, brokerage) and gather statements for as many as possible, then
re-run matching: tier-3 orphans resolve as their other side appears.

Also: an account that closed mid-history can't match anything after it closed.
Transfers to it from that point are unmatchable by construction — treat as orphans,
not errors.

## What does NOT identify a transfer

Do not lean on the statement's category fields. In practice (Korean bank exports):
- the **구분** column is usually empty except for reversal markers (`취소`), which are
  themselves equal-amount in+out pairs that pollute the amount index — skip them.
- the **적요** column names the *rail* (체크카드, 전자금융, FBS출금, 스마트출금,
  ATM이체…), not whether it's a transfer. The same rail carries self-transfers, P2P
  sends, and merchant payments — `전자금융` to the owner's name is a transfer, to a
  friend is a P2P send, to a wallet brand is a top-up.

The reliable signal is the composite: **(a transfer rail) AND (the owner's own name
on the leg) AND (a matching opposite-sign leg of equal amount within ±1 day in
another account).** No single field is enough.

## The safety net: assert

However the matching goes, anchor each account to reality. Statements print a
running balance; assert each account at a known date:

```bash
holiday assert "Assets:Bank:Shinhan" 42001 --as-of 2026-07-14
```

If a transfer was missed or mis-matched, net worth is wrong and the asserted
balance won't reconcile — `holiday close` refuses. This is why importing directly is
safe: a matching mistake cannot hide, because the statement balance is ground truth
and the ledger must meet it exactly.
