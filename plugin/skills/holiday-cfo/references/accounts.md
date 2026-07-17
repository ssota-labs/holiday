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

`holiday cashflow` treats `Assets:Bank:*` and `Assets:Cash:*` as spendable cash.
An account holding cash under some other prefix will be **silently left out of
the projection**. If the user keeps money somewhere else, say so rather than
letting the number be quietly wrong.

## Renaming and closing

Postings reference an account by id, not code, so renaming is a metadata edit and
does not rewrite history. Accounts are closed, never deleted — their postings are
facts.
