# holiday dash

This dashboard renders two files. Nothing else.

| File | Holds | Written by |
|---|---|---|
| `src/data/ledger.json` | the figures | `holiday dash data` — **never by hand** |
| `src/data/spec.json` | the layout | you |

## The rule

**Do not type a number into `spec.json`.** You cannot, in fact — no prop in the
catalog accepts an amount. Choose blocks and filters; the figures come from the
snapshot. If a number you want is not on screen, the answer is a block or a filter,
never a literal.

This is not a style guide. A wrong figure inside a well-made card reads as
authoritative, and this is someone's money.

## Blocks

The complete vocabulary. There is nothing else — `@holiday-cfo/blocks` will not
render a type that is not on this list, and a `spec.json` naming one fails loudly
rather than showing a blank card.

- `Dashboard` — the frame. Exactly one, at the root.
- `Row` — 1–3 blocks side by side.
- `CashRunway` — will the cash survive what is already committed. The most useful block.
- `BalanceTable` — balances, filtered by an `account` prefix.
- `LedgerHealth` — is the ledger trustworthy right now. Show it before anything else on the page is believed.
- `Note` — a sentence of context. No figures in it: a retyped number will not update when the ledger does, and a stale number beside a live one is how a dashboard starts lying.

## The shape of spec.json

It is **flat**, not nested. `root` names an element by key; `children` are keys,
not inline objects. Nesting the objects directly renders nothing.

```json
{
  "root": "dashboard",
  "elements": {
    "dashboard": { "type": "Dashboard", "props": { "title": "가계부" }, "children": ["health", "runway"] },
    "health": { "type": "LedgerHealth", "props": {} },
    "runway": { "type": "CashRunway", "props": {} }
  }
}
```

## Refresh

```sh
holiday dash data     # re-bake src/data/ledger.json from .holiday/ledger.db
pnpm dev              # http://localhost:5173
```

The snapshot is a point in time. It does not follow the ledger — re-bake after
every `holiday txn add`, `ingest`, or `close`.
