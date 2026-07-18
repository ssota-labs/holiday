# Accounts

Read this when creating an account or unsure how to name one.

## Shape

Colon-delimited, rooted at one of five types. Each segment starts uppercase.

```
Assets:Bank:KB:Checking
Assets:Bank:Wise:USD
Liabilities:Card:Shinhan
Liabilities:Card:Shinhan:Installment
Liabilities:Loans:KB:Mortgage
Equity:Opening
Income:Salary
Expenses:Food:Dining
Expenses:FX:Conversion
```

The five roots are fixed: `Assets`, `Liabilities`, `Equity`, `Income`,
`Expenses`. The code is a path, so `--account Liabilities` matches the whole
subtree.

## Several cards, one issuer

The account code is a path, not a card. When one issuer has more than one card,
add a level — do not flatten them into `Liabilities:Card:현대`:

```
Liabilities:Card:현대:Signature
Liabilities:Card:현대:TheRed
Liabilities:Card:신한:DeepDream
```

`holiday balance --account Liabilities:Card:현대` then sums both 현대 cards for
free, because the subtree query is just the path prefix. Each card still gets its
own billing cycle (`holiday card add` per code), since close and payment days
differ per card.

**The card number and expiry do not belong in the code.** Two reasons, and both
matter. `ledger.db` is committed, so a number in the code lands in git history
permanently — and the code is a label shown in every balance table. And identity
here is the debt, not the plastic: a reissued card keeps the same number-less
account, so its history stays intact. What the ledger actually needs about a card
— which account funds it, when it bills — lives on the `card` record, set by
`holiday card add`, not in the name.

## Creating one

```bash
holiday account add "Assets:Bank:KB:Checking" --commodity KRW
holiday account add "Assets:Broker:IBKR"                    # multi-commodity
holiday account add "Assets:Property:Apartment" --commodity KRW --non-monetary
```

**Always pass `--commodity` unless the account genuinely holds several.** It is
enforced on every posting, and it is the ring that catches the most likely real
error in this system: posting USD into a KRW account because a `$` was misread as
`₩`. Omitting it turns that check off.

`--non-monetary` excludes an account from future FX revaluation. Cash,
receivables, and debt are monetary; property and equipment are not. It cannot be
inferred from the type, so it has to be said.

`--placeholder` makes a grouping node that cannot be posted to.

## Naming

Follow what already exists — run `holiday account list` first. Consistency beats
elegance; a taxonomy that shifts halfway through a year makes every trend
meaningless.

Rough guide:

- **Assets** — where money sits. `Assets:Bank:<bank>:<product>`, `Assets:Cash`.
- **Liabilities** — what you owe. `Liabilities:Card:<issuer>`,
  `Liabilities:Loans:<lender>:<product>`.
- **Income** — where money came from. `Income:Salary`, `Income:Interest`.
- **Expenses** — what it went to. Two or three levels: `Expenses:Food:Dining`,
  not `Expenses:Food:Dining:Lunch:Weekday`.

Do not create an account per merchant. The payee field exists for that:
`--payee "이마트"`.

## Cash accounts are special

`holiday cashflow` walks forward from accounts marked `--cash`, nothing else. Pass
it when the account holds spendable cash:

```bash
holiday account add "Assets:Bank:KB:Checking" --commodity KRW --cash
```

It is a flag, not a prefix rule: an earlier version treated `Assets:Bank:*` as
cash by name, which silently dropped any cash kept under another prefix from the
projection — and a projection that quietly omits an account still prints a
confident number. An asset you leave un-`--cash` is simply not counted as cash on
hand, and `holiday cashflow` prints a ⚠ line naming it so the omission is visible
rather than silent.

## Renaming and closing

Postings reference an account by id, not code, so renaming is a metadata edit and
does not rewrite history. Accounts are closed, never deleted — their postings are
facts.
